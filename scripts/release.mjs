#!/usr/bin/env node
// Cut a release: set the version everywhere it appears, rebuild, verify, move
// the changelog's Unreleased section under the new number, commit, and tag.
//
// It also answers a smaller question the publish workflow needs: given the
// commits on main since the latest release tag, what semantic version comes
// next. `fix:` is a patch, `feat:` is a minor, and a Conventional Commit
// breaking change marker (`!` or `BREAKING CHANGE:`) is a major.
//
// It refuses to start on a dirty tree and refuses to finish on a red one. The
// version appears in four files and `skills-lock.json` records it too, so
// setting it by hand is four chances to leave one behind.
//
// Usage:
//   node scripts/release.mjs --version X.Y.Z [--dry-run]
//   node scripts/release.mjs --next [--json]

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
const RELEASE_TAG = /^v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/;
const CONVENTIONAL = /^([a-z]+)(\([^)\r\n]+\))?(!)?:\s+/;
const BREAKING = /(^|\n)BREAKING[ -]CHANGE:\s+/m;
const BUMP_WEIGHT = { patch: 1, minor: 2, major: 3 };

function git(args, cwd = REPO_ROOT) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

function readPackageVersion(root = REPO_ROOT) {
  const file = path.join(root, "package.json");
  return JSON.parse(fs.readFileSync(file, "utf8")).version;
}

function versionFromTag(tag) {
  return RELEASE_TAG.exec(tag)?.[1] ?? null;
}

export function classifyCommit({ subject, body = "" }) {
  const line = subject.trim();
  const match = CONVENTIONAL.exec(line);
  const breaking = (match && match[3] === "!") || BREAKING.test(body);
  if (breaking) return "major";
  if (!match) return null;
  if (match[1] === "feat") return "minor";
  if (match[1] === "fix") return "patch";
  return null;
}

export function bumpVersion(version, level) {
  if (!SEMVER.test(version)) {
    throw new Error(`invalid semver: ${version}`);
  }
  if (!BUMP_WEIGHT[level]) {
    throw new Error(`unknown bump level: ${level}`);
  }
  const [core] = version.split("-");
  const [major, minor, patch] = core.split(".").map(Number);
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function latestReleaseTag(root = REPO_ROOT) {
  const result = git(
    ["tag", "--merged", "HEAD", "--list", "v*", "--sort=-version:refname"],
    root,
  );
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "failed to list release tags");
  }
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .find((line) => versionFromTag(line)) ?? null;
}

export function commitsSince(tag = null, root = REPO_ROOT) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const result = git(["log", "--format=%H%x1f%s%x1f%b%x1e", range], root);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `failed to read commits in ${range}`);
  }
  return result.stdout
    .split("\x1e")
    .filter(Boolean)
    .map((record) => {
      const [sha = "", subject = "", body = ""] = record.split("\x1f");
      return {
        sha: sha.trim(),
        subject: subject.trim(),
        body: body.trim(),
      };
    });
}

export function highestBump(commits) {
  let best = null;
  for (const commit of commits) {
    const level = classifyCommit(commit);
    if (!level) continue;
    if (!best || BUMP_WEIGHT[level] > BUMP_WEIGHT[best]) best = level;
  }
  return best;
}

export function nextRelease(root = REPO_ROOT) {
  const currentVersion = readPackageVersion(root);
  const tag = latestReleaseTag(root);
  const taggedVersion = tag ? versionFromTag(tag) : null;
  if (taggedVersion !== null && taggedVersion !== currentVersion) {
    throw new Error(
      `package.json says ${currentVersion} but latest release tag is ${tag}; ` +
        "release history must be reconciled before cutting the next version",
    );
  }
  const releasable = commitsSince(tag, root)
    .map((commit) => ({ ...commit, level: classifyCommit(commit) }))
    .filter((commit) => commit.level !== null);
  const level = highestBump(releasable);
  return {
    currentVersion,
    latestTag: tag,
    level,
    nextVersion: level ? bumpVersion(currentVersion, level) : null,
    releasable: releasable.map(({ sha, subject, level: commitLevel }) => ({
      sha,
      subject,
      level: commitLevel,
    })),
  };
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

export function cutRelease(version, { dryRun = false } = {}) {
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

function main(argv) {
  let version = null;
  let dryRun = false;
  let next = false;
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--version") version = argv[++i];
    else if (argv[i].startsWith("--version=")) version = argv[i].slice(10);
    else if (argv[i] === "--dry-run") dryRun = true;
    else if (argv[i] === "--next") next = true;
    else if (argv[i] === "--json") json = true;
    else {
      process.stderr.write(
        "usage: release.mjs --version X.Y.Z [--dry-run]\n" +
          "       release.mjs --next [--json]\n",
      );
      return 2;
    }
  }

  if (next) {
    if (version || dryRun) {
      process.stderr.write("release.mjs: --next does not take --version or --dry-run\n");
      return 2;
    }
    try {
      const plan = nextRelease();
      if (json) {
        process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
      } else if (plan.nextVersion) {
        process.stdout.write(`${plan.nextVersion}\n`);
      }
      return 0;
    } catch (error) {
      process.stderr.write(`release.mjs: ${error.message}\n`);
      return 1;
    }
  }

  if (!version || !SEMVER.test(version)) {
    process.stderr.write("release.mjs: --version must be a semver string\n");
    return 2;
  }
  return cutRelease(version, { dryRun });
}

if (isEntryPoint(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
