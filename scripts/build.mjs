#!/usr/bin/env node
// Build the canonical distribution and the plugin payload from the one skill
// under `skill/docbound/`.
//
// The build is a pure function of its input: same tree in, byte-identical tree
// out, no timestamps and no absolute paths in anything it writes. That property
// is what lets `dist/` be committed and `check-dist-fresh.mjs` be a real test
// rather than a formality (ADR 0004).
//
// Usage: node scripts/build.mjs [--out DIR] [--quiet]

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { PROVIDERS } from "../cli/providers.mjs";
import { isEntryPoint } from "../skill/docbound/scripts/lib/entry.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.dirname(HERE);
export const SKILL_SOURCE = path.join(REPO_ROOT, "skill", "docbound");

// The skill payload is what every provider gets, byte for byte. The Python
// reference is the audit's specification for one release and is not shipped.
const PAYLOAD_EXCLUDE = new Set(["scripts/reference"]);

export function collectPayload(source = SKILL_SOURCE) {
  const files = new Map();
  walk(source, "");
  return new Map([...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1)));

  function walk(dir, prefix) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort(byName)) {
      if (entry.name.startsWith(".")) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (PAYLOAD_EXCLUDE.has(rel)) continue;
        walk(path.join(dir, entry.name), rel);
      } else {
        files.set(rel, fs.readFileSync(path.join(dir, entry.name)));
      }
    }
  }
}

function byName(a, b) {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

export function hashFiles(files) {
  const hash = crypto.createHash("sha256");
  for (const key of [...files.keys()].sort()) {
    hash.update(key);
    hash.update("\0");
    hash.update(files.get(key));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function writeTree(root, files) {
  fs.rmSync(root, { recursive: true, force: true });
  for (const [rel, contents] of files) {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
}

/** The Claude Code plugin bundle: skill, agents, hooks, and nothing else. */
export function buildPlugin(payload) {
  const files = new Map();
  // The whole payload, agent definitions included. A skill directory that is
  // complete on its own is what a tool copying `skills/docbound/` gets, and
  // `npx skills add` is one of those: it takes the shallowest `skills/<name>/`
  // it finds and copies the directory
  // (`docs/decisions/0044-the-skill-directory-is-self-contained.md`).
  for (const [rel, contents] of payload) {
    files.set(`skills/docbound/${rel}`, contents);
  }
  // And again at the plugin root, because that is where Claude Code looks for
  // them: `.claude-plugin/plugin.json` points `agents` at `./plugin/agents`.
  for (const [rel, contents] of payload) {
    if (rel.startsWith("agents/")) files.set(rel, contents);
  }
  const manifest = PROVIDERS.find((p) => p.name === "claude-code").hookManifest(
    "${CLAUDE_PLUGIN_ROOT}/skills/docbound",
  );
  files.set("hooks/hooks.json", Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
  // The directory is removed and rewritten on every build, so its own README
  // has to be an output of the build rather than a file sitting in it.
  files.set("README.md", fs.readFileSync(path.join(HERE, "plugin-README.md")));
  return files;
}

export function build({
  out = path.join(REPO_ROOT, "dist"),
  pluginOut = path.join(REPO_ROOT, "plugin"),
  quiet = false,
} = {}) {
  // Remove the whole tree first so files dropped from the skill do not keep
  // shipping in an old distribution.
  fs.rmSync(out, { recursive: true, force: true });

  const payload = collectPayload();
  const payloadHash = hashFiles(payload);
  const lock = { version: readVersion() };

  // The CLI supplies each provider's destination and hook manifest at install
  // time. Keeping only this path-neutral tree prevents the npm package from
  // carrying a byte-for-byte copy for every provider.
  writeTree(path.join(out, "payload"), payload);
  lock.payload = { files: payload.size, hash: payloadHash };
  if (!quiet) process.stdout.write(`  payload: ${payload.size} file(s)\n`);

  const pluginFiles = buildPlugin(payload);
  writeTree(pluginOut, pluginFiles);
  lock.plugin = { files: pluginFiles.size, hash: hashFiles(pluginFiles) };
  if (!quiet) process.stdout.write(`  plugin: ${pluginFiles.size} file(s)\n`);

  return lock;
}

export function readVersion() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
  );
  return pkg.version;
}

export function writeLock(lock) {
  fs.writeFileSync(
    path.join(REPO_ROOT, "skills-lock.json"),
    `${JSON.stringify(lock, null, 2)}\n`,
  );
}

function main(argv) {
  let out = path.join(REPO_ROOT, "dist");
  let pluginOut = path.join(REPO_ROOT, "plugin");
  let quiet = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--out") out = path.resolve(argv[++i]);
    else if (argv[i].startsWith("--out=")) out = path.resolve(argv[i].slice(6));
    else if (argv[i] === "--plugin-out") pluginOut = path.resolve(argv[++i]);
    else if (argv[i] === "--quiet") quiet = true;
    else {
      process.stderr.write("usage: build.mjs [--out DIR] [--plugin-out DIR] [--quiet]\n");
      return 2;
    }
  }
  if (!quiet) process.stdout.write("docbound build\n");
  const lock = build({ out, pluginOut, quiet });
  writeLock(lock);
  if (!quiet) process.stdout.write("wrote dist/, plugin/, skills-lock.json\n");
  return 0;
}

if (isEntryPoint(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
