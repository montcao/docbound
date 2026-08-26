// Filesystem side of the CLI: copying a distribution into a project, linking
// one from a checkout, and merging a hook manifest into whatever config the
// project already has.
//
// The rule that shapes all of it: docbound owns its own files and nothing else.
// A hook manifest is merged key by key so an unrelated hook survives, and
// `.docbound/config.json` is written once and never overwritten, because the
// second write would discard the policy the team chose.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { PROVIDERS } from "../scripts/providers.mjs";
import { DEFAULT_CONFIG } from "../skill/docbound/scripts/lib/config.mjs";

export function readLock(packageRoot) {
  const file = path.join(packageRoot, "skills-lock.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * Providers whose harness directory is present, in the project or in the user's
 * home directory.
 *
 * Home counts because a harness only writes its project directory once you give
 * it something to keep there. Someone working in Cursor on a repository with no
 * `.cursor/` is still working in Cursor, and detecting nothing would install the
 * generic layout their harness does not read.
 */
export function detectProviders(root, home = os.homedir()) {
  const found = [];
  for (const provider of PROVIDERS) {
    if (!provider.detect) continue;
    const roots = home && home !== root ? [root, home] : [root];
    const present = provider.detect.some((dir) =>
      roots.some((base) => fs.existsSync(path.join(base, dir))),
    );
    if (present) found.push(provider);
  }
  // `.agents` alone means universal; with a named harness beside it the named
  // one is the better answer and universal is redundant.
  const named = found.filter((p) => p.name !== "universal");
  return named.length > 0 ? named : found;
}

/** Providers with a skill payload already on disk, and its content hash. */
export function installedProviders(root) {
  const out = [];
  for (const provider of PROVIDERS) {
    const payload = path.join(root, provider.payload);
    if (!fs.existsSync(path.join(payload, "SKILL.md"))) continue;
    out.push({ provider, current: hashTree(root, provider) });
  }
  return out;
}

/**
 * Installed payloads, grouped by where they sit. Several providers read the
 * same path — `.agents/skills/docbound` serves universal, Codex, and Cursor —
 * so reporting per provider would claim three installs where there is one
 * directory. What distinguishes them on disk is the hook manifest, so that is
 * reported per provider.
 */
export function installedPayloads(root) {
  const byPayload = new Map();
  for (const { provider, current } of installedProviders(root)) {
    if (!byPayload.has(provider.payload)) {
      byPayload.set(provider.payload, { payload: provider.payload, current, providers: [] });
    }
    byPayload.get(provider.payload).providers.push({
      name: provider.name,
      hookFile: provider.hookFile ?? null,
      hooked: Boolean(provider.hookFile) && fs.existsSync(path.join(root, provider.hookFile)),
    });
  }
  return [...byPayload.values()];
}

/**
 * Hash of an installed skill payload, keyed by path within the payload so it is
 * comparable across providers and against `payloadHash` in the lock. The hook
 * manifest is deliberately not part of it: a merged manifest carries the
 * project's other hooks, and those have nothing to do with whether the skill is
 * current.
 */
function hashTree(root, provider) {
  const files = new Map();
  collect(path.join(root, provider.payload), "");

  const hash = crypto.createHash("sha256");
  for (const key of [...files.keys()].sort()) {
    hash.update(key);
    hash.update("\0");
    hash.update(files.get(key));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;

  function collect(dir, prefix) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) collect(full, rel);
      else files.set(rel, fs.readFileSync(full));
    }
  }
}

/**
 * Copy one provider's distribution into `root`. Returns the number of files
 * written. The hook manifest and the tracked config are never copied: each has
 * a function that merges into whatever the project already has.
 */
export function copyDist(distRoot, root, provider) {
  const source = path.join(distRoot, provider.name);
  if (!fs.existsSync(source)) {
    throw new Error(`no distribution for ${provider.name}; run the build`);
  }
  // A stale payload file is a file the build no longer produces; replacing the
  // directory wholesale is what keeps an update from leaving one behind.
  fs.rmSync(path.join(root, provider.payload), { recursive: true, force: true });

  let written = 0;
  for (const rel of listFiles(source)) {
    // The manifest is merged by `mergeHookManifest` and the config by
    // `ensureConfig`; copying either would discard what the project already has.
    if (provider.hookFile && rel === provider.hookFile) continue;
    if (rel === ".docbound/config.json") continue;
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(source, rel), target);
    written += 1;
  }
  return written;
}

/**
 * Write `.docbound/config.json`, preserving every key the project already set
 * and adding the paths docbound itself owns to `audit.exclude`.
 *
 * Excluding them is the same judgement the audit already makes about `.claude`
 * and `.agents`: a skill payload and a hook manifest are tooling configuration,
 * not this repository's code or documentation, and a repository should not have
 * to write a worklog entry to install a tool.
 */
export function ensureConfig(root, providers) {
  const file = path.join(root, ".docbound", "config.json");
  const existing = readExistingJson(file, ".docbound/config.json");
  const config = Object.keys(existing).length > 0
    ? existing
    : structuredClone(DEFAULT_CONFIG);
  config.audit = config.audit ?? {};
  const exclude = new Set(config.audit.exclude ?? []);
  exclude.add(".docbound/**");
  for (const provider of providers) {
    exclude.add(`${provider.payload}/**`);
    if (provider.hookFile) exclude.add(provider.hookFile);
  }
  config.audit.exclude = [...exclude].sort();

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
  return file;
}

/** Point the provider's payload path at a checkout instead of copying it. */
export function linkDist(source, root, provider) {
  const skill = path.join(source, "skill", "docbound");
  const from = fs.existsSync(skill) ? skill : source;
  const target = path.join(root, provider.payload);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.symlinkSync(path.relative(path.dirname(target), from), target, "dir");
  return provider.payload;
}

/**
 * Merge the provider's hook entries into its manifest, keeping what is there.
 *
 * Throws rather than writing when an existing manifest will not parse. That
 * file is the developer's harness configuration, and treating an unreadable one
 * as absent would replace all of it with docbound's two hooks.
 */
export function mergeHookManifest(root, provider) {
  if (!provider.hookFile) return null;
  const target = path.join(root, provider.hookFile);
  const existing = readExistingJson(target, provider.hookFile);
  const incoming = provider.hookManifest(provider.payload);
  const merged = mergeHooks(existing, incoming);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(merged, null, 2)}\n`);
  return provider.hookFile;
}

/** `{}` when the file is absent; a thrown error when it exists and is broken. */
function readExistingJson(file, label) {
  if (!fs.existsSync(file)) return {};
  const parsed = readJson(file);
  if (parsed === null) {
    throw new Error(
      `${label} exists but is not valid JSON. Refusing to overwrite it — ` +
        "fix or move it, then run install again.",
    );
  }
  return parsed;
}

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function mergeHooks(existing, incoming) {
  // Incoming keys first so a manifest format that requires one — Cursor's
  // `version` — survives; the project's own keys win over ours where both set
  // the same one; hooks are merged event by event below.
  const merged = {
    ...incoming,
    ...existing,
    hooks: { ...(existing.hooks ?? {}) },
  };
  for (const [event, entries] of Object.entries(incoming.hooks ?? {})) {
    if (UNSAFE_KEYS.has(event)) continue;
    const current = Array.isArray(merged.hooks[event]) ? merged.hooks[event] : [];
    const kept = current.filter((entry) => !isDocbound(entry));
    merged.hooks[event] = [...kept, ...entries];
  }
  return merged;
}

function isDocbound(entry) {
  return JSON.stringify(entry ?? "").includes("docbound");
}

/** Record whether this developer wanted the gate, in the gitignored override. */
export function recordHookChoice(root, hooks) {
  const dir = path.join(root, ".docbound");
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, "config.local.json");
  const existing = readJson(target) ?? {};
  const next = {
    ...existing,
    hook: { ...(existing.hook ?? {}), enabled: hooks },
  };
  fs.writeFileSync(target, `${JSON.stringify(next, null, 2)}\n`);
  return target;
}

export function listFiles(root, prefix = "") {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(root, rel));
    else out.push(rel);
  }
  return out.sort();
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
