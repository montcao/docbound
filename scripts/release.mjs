#!/usr/bin/env node
// Cut a release: set the version everywhere it appears, rebuild, verify, move
// the changelog's Unreleased section under the new number, commit, and tag.
//
// It refuses to start on a dirty tree and refuses to finish on a red one. The
// version appears in four files and `skills-lock.json` records it too, so
// setting it by hand is four chances to leave one behind.
//
// Usage: node scripts/release.mjs --version X.Y.Z [--dry-run]

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import { REPO_ROOT, build, writeLock } from "./build.mjs";
import { checkDistFresh } from "./check-dist-fresh.mjs";
import { isEntryPoint } from "../skill/docbound/scripts/lib/entry.mjs";

const VERSIONED_FILES = [
  "package.json",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
];
const TEST_FILES = [
  "tests/audit.test.mjs",
  "tests/build.test.mjs",
  "tests/cli.test.mjs",
  "tests/scaffold.test.mjs",
];
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

function git(args) {
  return spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
}

export function setVersion(relative, version) {
  const file = path.join(REPO_ROOT, relative);
  const text = fs.readFileSync(file, "utf8");
  // Only the `version` fields, and only at the value position: a version string
  // inside a description or a URL is not this script's business.
  const next = text.replace(/("version":\s*")[^"]+(")/g, `$1${version}$2`);
  fs.writeFileSync(file, next);
  return next !== text;
}

export function rollChangelog(version, today) {
  const file = path.join(REPO_ROOT, "CHANGELOG.md");
  const text = fs.readFileSync(file, "utf8");
  const marker = "## Unreleased";
  if (!text.includes(marker)) {
    throw new Error("CHANGELOG.md has no Unreleased section to release");
  }
  const next = text.replace(
    marker,
    `${marker}\n\n## ${version} — ${today}`,
  );
  fs.writeFileSync(file, next);
  return next;
}

function main(argv) {
  let version = null;
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--version") version = argv[++i];
    else if (argv[i].startsWith("--version=")) version = argv[i].slice(10);
    else if (argv[i] === "--dry-run") dryRun = true;
    else {
      process.stderr.write("usage: release.mjs --version X.Y.Z [--dry-run]\n");
      return 2;
    }
  }
  if (!version || !SEMVER.test(version)) {
    process.stderr.write("release.mjs: --version must be a semver string\n");
    return 2;
  }

  const status = git(["status", "--porcelain"]);
  if (status.status !== 0) {
    process.stderr.write("release.mjs: not a git repository\n");
    return 2;
  }
  if (status.stdout.trim()) {
    process.stderr.write("release.mjs: the working tree is dirty; commit first\n");
    return 1;
  }

  for (const file of VERSIONED_FILES) {
    const changed = setVersion(file, version);
    process.stdout.write(`  ${file}: ${changed ? version : "already " + version}\n`);
  }
  rollChangelog(version, new Date().toISOString().slice(0, 10));

  writeLock(build({ quiet: true }));
  const problems = checkDistFresh();
  if (problems.length > 0) {
    process.stderr.write(`release.mjs: dist is stale after rebuild: ${problems[0]}\n`);
    return 1;
  }

  const tests = spawnSync(process.execPath, ["--test", ...TEST_FILES], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (tests.status !== 0) {
    process.stderr.write("release.mjs: tests failed; nothing committed\n");
    return 1;
  }

  const audit = spawnSync(process.execPath, ["cli/index.mjs", "audit"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (audit.status !== 0) {
    process.stderr.write("release.mjs: the audit failed; nothing committed\n");
    return 1;
  }

  if (dryRun) {
    process.stdout.write(`dry run: ${version} is ready; nothing committed\n`);
    return 0;
  }

  git(["add", "-A"]);
  git(["commit", "-m", `release: ${version}`]);
  git(["tag", "-a", `v${version}`, "-m", `docbound ${version}`]);
  process.stdout.write(`tagged v${version}. Push with: git push --follow-tags\n`);
  return 0;
}

if (isEntryPoint(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
