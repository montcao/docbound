#!/usr/bin/env node
// Fail when the committed distributions do not match what the build produces.
//
// `dist/` and `plugin/` are committed so that the submodule, copy, and plugin
// installs need no toolchain (ADR 0004). The cost of that is drift, and this is
// what makes drift a red build rather than a silent one: it rebuilds into a
// temporary directory and compares every file byte for byte.
//
// Usage: node scripts/check-dist-fresh.mjs

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { REPO_ROOT, build, readVersion } from "./build.mjs";
import { isEntryPoint } from "../skill/docbound/scripts/lib/entry.mjs";

export function listTree(root) {
  const files = new Map();
  if (!fs.existsSync(root)) return files;
  walk(root, "");
  return files;

  function walk(dir, prefix) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
      else files.set(rel, fs.readFileSync(path.join(dir, entry.name)));
    }
  }
}

export function compareTrees(committed, rebuilt) {
  const problems = [];
  for (const [rel, contents] of rebuilt) {
    if (!committed.has(rel)) problems.push(`missing from the commit: ${rel}`);
    else if (!committed.get(rel).equals(contents)) problems.push(`stale: ${rel}`);
  }
  for (const rel of committed.keys()) {
    if (!rebuilt.has(rel)) problems.push(`not produced by the build: ${rel}`);
  }
  return problems.sort();
}

export function checkDistFresh() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "docbound-dist-"));
  try {
    const lock = build({
      out: path.join(work, "dist"),
      pluginOut: path.join(work, "plugin"),
      quiet: true,
    });

    const problems = [
      ...compareTrees(listTree(path.join(REPO_ROOT, "dist")), listTree(path.join(work, "dist"))),
      ...compareTrees(
        listTree(path.join(REPO_ROOT, "plugin")),
        listTree(path.join(work, "plugin")),
      ),
    ];

    const lockFile = path.join(REPO_ROOT, "skills-lock.json");
    if (!fs.existsSync(lockFile)) {
      problems.push("skills-lock.json is missing");
    } else {
      const committed = JSON.parse(fs.readFileSync(lockFile, "utf8"));
      if (JSON.stringify(committed) !== JSON.stringify(lock)) {
        problems.push("skills-lock.json does not match the rebuilt payload hashes");
      }
      if (committed.version !== readVersion()) {
        problems.push("skills-lock.json records a different version than package.json");
      }
    }
    return problems;
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

function main() {
  const problems = checkDistFresh();
  if (problems.length === 0) {
    process.stdout.write("dist/, plugin/, and skills-lock.json are current.\n");
    return 0;
  }
  process.stderr.write(`dist is stale — ${problems.length} difference(s):\n`);
  for (const problem of problems.slice(0, 40)) {
    process.stderr.write(`  ${problem}\n`);
  }
  if (problems.length > 40) {
    process.stderr.write(`  ... and ${problems.length - 40} more\n`);
  }
  process.stderr.write("Run `node scripts/build.mjs` and commit the result.\n");
  return 1;
}

if (isEntryPoint(import.meta.url)) {
  process.exitCode = main();
}
