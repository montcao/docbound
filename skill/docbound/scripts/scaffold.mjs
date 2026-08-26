#!/usr/bin/env node
// Bootstrap the docbound structure in a repository.
//
// Creates, from templates, whatever is missing:
//
//   README.md
//   docs/ARCHITECTURE.md
//   docs/WORKLOG.md          (with one open entry for the adoption task)
//   docs/decisions/0001-adopt-docbound.md
//   <top-level source dir>/README.md   for each top-level directory with source
//
// Never overwrites. Run from the repository root, or pass --root.
//
// Templates contain placeholders. The audit fails on unfilled placeholders on
// purpose: a scaffolded doc is not a doc until it says something true.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { SOURCE_EXT, suffixOf } from "./lib/paths.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SKILL_ROOT = path.dirname(HERE);
export const TEMPLATES = path.join(SKILL_ROOT, "templates");

// Wider than the audit's exclusion list: a directory of docs or CI config is
// not a module, so it gets no module README even though the audit reads it.
const EXCLUDE_DIRS = new Set([
  ".git", "node_modules", "vendor", "dist", "build", "target", ".venv", "venv",
  "__pycache__", ".agents", ".claude", ".github", ".idea", ".vscode", "docs",
  "coverage", ".next", ".cache", "out",
]);

const USAGE = "usage: scaffold.mjs [--root DIR] [--dry-run]";

export function readTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES, name), "utf8");
}

export function hasSource(dir) {
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (SOURCE_EXT.has(suffixOf(entry.name))) return true;
    }
  }
  return false;
}

/**
 * How to refer to the skill and its audit from inside the target repository.
 * Backticked paths are checked by `dead-ref`, so only a path that exists in the
 * repository is written in backticks.
 */
export function skillRefs(root) {
  const relative = path.relative(root, SKILL_ROOT);
  const inside = relative && !relative.startsWith("..") && !path.isAbsolute(relative);
  if (!inside) {
    return {
      skill: `${SKILL_ROOT} (outside the repository)`,
      audit: "the skill's scripts/audit.mjs",
    };
  }
  const posix = relative.split(path.sep).join("/");
  return { skill: `\`${posix}/\``, audit: `\`${posix}/scripts/audit.mjs\`` };
}

export function adoptionAdr(today, root) {
  const { skill, audit } = skillRefs(root);
  return `# 0001. Adopt docbound as the documentation discipline

- Date: ${today}
- Status: accepted
- Supersedes: none

## Context

Code in this repository is written and modified by AI agents across sessions that
do not share memory. The discipline follows established industry and academic
documentation practice (minimum viable docs, update docs with code, delete dead
docs, good over perfect, docs as the story of the code, no duplication). Without a discipline that captures reasoning at the moment
it happens, the *why* behind the code is lost between sessions and re-derived,
often incorrectly, by the next one.

## Options

### Document at the end of each task

Cheapest per task. Produces summaries of diffs rather than descriptions of the
system, and decisions are reconstructed after the fact rather than recorded when
the alternatives were still in view.

### Continuous documentation with a blocking audit (docbound)

Docs move in the same step as the code; decisions are recorded when made; a
deterministic audit (${audit}) defines "done." Costs a few minutes per
task. Produces docs that describe the current system and a decision trail that
can be revisited.

## Decision

Adopt docbound. The skill lives at ${skill}. Every task
opens a worklog entry before the first edit and cannot close until the audit
exits 0.

## Consequences

Tasks take slightly longer. \`docs/WORKLOG.md\` grows and needs periodic pruning
of entries older than a quarter. Stale documentation encountered during any task
becomes that task's responsibility to fix.

## What would reverse this

If the audit's false-positive rate makes waivers routine (more than one in five
entries carries a waiver), the checks need retuning or the discipline is not
fitting this repository and should be replaced.
`;
}

export function worklogInitial(today) {
  const entry = readTemplate("WORKLOG-entry.md")
    .replace("<YYYY-MM-DD>", today)
    .replace(
      "<task title, as a verb phrase>",
      "Adopt docbound and write initial documentation",
    );
  return (
    "# Worklog\n\n" +
    "Newest entry first. One entry per task. Intent is written before the first\n" +
    "edit; Outcome and Still open are written after the audit passes.\n" +
    "Entries older than a quarter can be pruned once their content is reflected\n" +
    "in ARCHITECTURE, module READMEs, or Architecture Decision Records (ADRs).\n\n" +
    entry
  );
}

export function plan(root, today) {
  const items = [
    ["README.md", readTemplate("README.md")],
    [path.join("docs", "ARCHITECTURE.md"), readTemplate("ARCHITECTURE.md")],
    [path.join("docs", "WORKLOG.md"), worklogInitial(today)],
    [
      path.join("docs", "decisions", "0001-adopt-docbound.md"),
      adoptionAdr(today, root),
    ],
  ];

  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  for (const name of dirs) {
    if (EXCLUDE_DIRS.has(name) || name.startsWith(".")) continue;
    if (hasSource(path.join(root, name))) {
      items.push([path.join(name, "README.md"), readTemplate("MODULE.md")]);
    }
  }
  return items;
}

export function main(argv) {
  let root = ".";
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--root") root = argv[++i] ?? ".";
    else if (arg.startsWith("--root=")) root = arg.slice("--root=".length);
    else if (arg === "-h" || arg === "--help") {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    } else {
      process.stderr.write(`${USAGE}\nscaffold.mjs: error: unrecognized argument: ${arg}\n`);
      return 2;
    }
  }

  const resolved = path.resolve(root);
  if (!isDirectory(resolved)) {
    process.stderr.write(`not a directory: ${resolved}\n`);
    return 2;
  }

  const today = new Date().toISOString().slice(0, 10);
  const created = [];
  for (const [relative, content] of plan(resolved, today)) {
    const target = path.join(resolved, relative);
    if (fs.existsSync(target)) continue;
    if (dryRun) {
      process.stdout.write(`would create ${relative}\n`);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
    created.push(relative);
  }

  if (dryRun) return 0;
  if (created.length === 0) {
    process.stdout.write("nothing to create; structure already present\n");
    return 0;
  }
  process.stdout.write("created:\n");
  for (const relative of created) process.stdout.write(`  ${relative}\n`);
  process.stdout.write(
    "\nNext: read the code, replace every placeholder with a true statement,\n" +
      "delete sections that do not apply, then run scripts/audit.mjs.\n",
  );
  return 0;
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main(process.argv.slice(2));
}
