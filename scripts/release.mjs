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

/**
 * Prepend a worklog entry for the release.
 *
 * A release changes a manifest, a changelog, and a lock file, and the audit asks
 * every change what task it belongs to. Cutting a release is a task; it just
 * happens to be a mechanical one. Without this, the release commit is the one
 * commit on main that cannot pass the repository's own audit.
 */
export function rollWorklog(version, today) {
  const file = path.join(REPO_ROOT, "docs", "WORKLOG.md");
  const text = fs.readFileSync(file, "utf8");
  const firstEntry = text.indexOf("\n## ");
  if (firstEntry === -1) throw new Error("docs/WORKLOG.md has no entries");

  const entry = [
    `## ${today} — Release ${version}`,
    "",
    "Agent: release script · Branch: main",
    "",
    "### Intent",
    "",
    `Cut ${version}. Written by \`scripts/release.mjs\`, which refuses to run`,
    "unless the tests, the audit, and the freshness check pass against a clean",
    "tree first.",
    "",
    "### Outcome",
    "",
    `Set the version in \`package.json\`, \`.claude-plugin/plugin.json\`, and`,
    "`.claude-plugin/marketplace.json`; rolled `CHANGELOG.md`; rebuilt `dist/`,",
    "`plugin/`, and `skills-lock.json`; tagged.",
    "",
    "### Still open",
    "",
    "- Nothing from the release itself. Open work is in the entries below.",
    "",
  ].join("\n");

  fs.writeFileSync(file, `${text.slice(0, firstEntry + 1)}${entry}${text.slice(firstEntry + 1)}`);
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

  // Verify before touching anything. A dry run has to leave the tree exactly as
  // it found it, and a failed release should not need cleaning up after.
  //
  // The audit runs here, against the content being released, rather than after
  // the version bump: the release commit itself changes a manifest, a changelog,
  // and a lock file with no worklog entry behind it, which the audit would be
  // right to reject and which is not what it is being asked about.
  // `npm test` rather than a list of files: package.json owns which tests exist,
  // and a second copy of that list here went stale the first time one was added.
  const tests = spawnSync("npm", ["test", "--silent"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (tests.status !== 0) {
    process.stderr.write("release.mjs: tests failed; nothing written\n");
    return 1;
  }

  const audit = spawnSync(process.execPath, ["cli/index.mjs", "audit"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (audit.status !== 0) {
    process.stderr.write("release.mjs: the audit failed; nothing written\n");
    return 1;
  }

  const stale = checkDistFresh();
  if (stale.length > 0) {
    process.stderr.write(`release.mjs: dist is stale: ${stale[0]}\n`);
    return 1;
  }

  if (dryRun) {
    process.stdout.write(
      `dry run: ${version} is ready. Would set the version in ` +
        `${VERSIONED_FILES.join(", ")}, roll the changelog and the worklog, ` +
        `rebuild, commit, and tag v${version}. Nothing written.\n`,
    );
    return 0;
  }

  for (const file of VERSIONED_FILES) {
    const changed = setVersion(file, version);
    process.stdout.write(`  ${file}: ${changed ? version : "already " + version}\n`);
  }
  const today = new Date().toISOString().slice(0, 10);
  rollChangelog(version, today);
  rollWorklog(version, today);
  writeLock(build({ quiet: true }));

  const drifted = checkDistFresh();
  if (drifted.length > 0) {
    process.stderr.write(`release.mjs: dist is stale after rebuild: ${drifted[0]}\n`);
    return 1;
  }

  // Only what this script writes. `git add -A` would sweep in whatever else
  // happened to be in the tree, and a release commit should be legible.
  //
  // Each step is checked. An unchecked commit that fails — an unset identity, a
  // signing key that is not there, a rejecting pre-commit hook — leaves the tag
  // on the previous commit while the script prints success, and the push then
  // carries a tag pointing at a tree without the version bump in it.
  const steps = [
    ["add", ...VERSIONED_FILES, "CHANGELOG.md", "docs/WORKLOG.md",
      "skills-lock.json", "dist", "plugin"],
    ["commit", "-m", `release: ${version}`],
    ["tag", "-a", `v${version}`, "-m", `docbound ${version}`],
  ];
  for (const step of steps) {
    const result = git(step);
    if (result.status !== 0) {
      process.stderr.write(
        `release.mjs: git ${step[0]} failed; the version files are written and ` +
          `not committed:\n${result.stderr ?? ""}`,
      );
      return 1;
    }
  }
  process.stdout.write(
    `tagged v${version}. Push with: git push --follow-tags\n` +
      "The push to main is what publishes; the tag is a marker.\n",
  );
  return 0;
}

if (isEntryPoint(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
