// The artifact users actually get.
//
// Every other test runs against the git checkout, where every file is present.
// What npm publishes is the `files` whitelist in `package.json`, and the first
// version of that whitelist omitted the provider table both CLI entry points
// import — so the published package would have failed to resolve a module on
// its first command, and nothing here would have noticed.
//
// This packs the real tarball, unpacks it somewhere with no checkout in sight,
// and installs from it. It is slower than the rest of the suite and it is the
// only test that can fail for a packaging reason.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { after, describe, test } from "node:test";

import { REPO_ROOT, buildFixture, removeTree, runNode, tempDir } from "./harness.mjs";

const made = [];
let packageRoot = null;

/**
 * Pack and unpack once, on first use.
 *
 * Lazily rather than in a `before` hook: a hook that fails reports as a null
 * path in every test that follows it, which says nothing about what went wrong.
 * Here the failure is an assertion with npm's own stderr attached.
 */
function ensurePackage() {
  if (packageRoot !== null) return packageRoot;

  const staging = tempDir("pack");
  made.push(staging);

  const packed = spawnSync(
    "npm",
    ["pack", "--pack-destination", staging, "--loglevel", "error"],
    // A nested npm inherits the outer run's configuration through the
    // environment, so the lifecycle variables are cleared before shelling out.
    { cwd: REPO_ROOT, encoding: "utf8", env: withoutNpmEnv(process.env) },
  );
  assert.equal(packed.status, 0, `npm pack failed:\n${packed.stderr}`);

  const tarball = fs.readdirSync(staging).find((f) => f.endsWith(".tgz"));
  assert.ok(tarball, `npm pack wrote no tarball into ${staging}`);

  const extracted = spawnSync("tar", ["-xzf", path.join(staging, tarball)], {
    cwd: staging,
    encoding: "utf8",
  });
  assert.equal(extracted.status, 0, `tar failed:\n${extracted.stderr}`);

  // npm packs everything under a top-level `package/` directory.
  packageRoot = path.join(staging, "package");
  return packageRoot;
}

function withoutNpmEnv(env) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => !key.startsWith("npm_")),
  );
}

after(() => {
  for (const dir of made) removeTree(dir);
});

function project() {
  const fixture = buildFixture("filled-baseline");
  made.push(fixture.work);
  return fixture.repo;
}

function packagedCli(cwd, args) {
  return runNode(path.join(ensurePackage(), "cli", "index.mjs"), args, { cwd });
}

describe("the published package", () => {
  test("carries everything its entry points import", () => {
    // Resolution happens at import time, so loading the CLI at all is the
    // assertion: a file missing from the whitelist fails here.
    const result = packagedCli(REPO_ROOT, ["--help"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /docbound/);
  });

  test("installs into a clean project", () => {
    const repo = project();
    const result = packagedCli(repo, [
      "install",
      "--providers=claude-code,cursor",
      "--yes",
    ]);
    assert.equal(result.status, 0, result.stderr);

    for (const rel of [
      ".claude/skills/docbound/SKILL.md",
      ".claude/skills/docbound/scripts/audit.mjs",
      ".claude/settings.json",
      ".cursor/skills/docbound/SKILL.md",
      ".cursor/hooks.json",
      ".docbound/config.json",
    ]) {
      assert.ok(fs.existsSync(path.join(repo, rel)), `${rel} was installed`);
    }
  });

  test("the installed skill runs its own audit", () => {
    const repo = project();
    packagedCli(repo, ["install", "--providers=claude-code", "--yes"]);

    // Not the packaged CLI: the copy that landed in the user's project, which
    // is what the hook and the agent invoke.
    const installed = path.join(repo, ".claude/skills/docbound/scripts/audit.mjs");
    const result = runNode(installed, ["--root", repo]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /PASS/);
  });

  test("the installed hook blocks a stop when the audit fails", () => {
    const fixture = buildFixture("undocumented-change");
    made.push(fixture.work);
    packagedCli(fixture.repo, ["install", "--providers=claude-code", "--yes"]);

    const hook = path.join(fixture.repo, ".claude/skills/docbound/scripts/hook.mjs");
    const result = runNode(hook, ["--event", "stop", "--root", fixture.repo]);
    assert.equal(result.status, 2, "exit 2 is what a harness reads as 'do not stop'");
    assert.match(result.stderr, /the task is not done/);
  });

  test("scaffold resolves its templates from the package", () => {
    const bare = tempDir("packaged-scaffold");
    made.push(bare);
    fs.mkdirSync(path.join(bare, "src"));
    fs.writeFileSync(path.join(bare, "src", "app.py"), "def main():\n    return 0\n");

    const result = packagedCli(bare, ["scaffold", "--root", bare]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(bare, "docs", "WORKLOG.md")));
    assert.ok(fs.existsSync(path.join(bare, "docs", "decisions", "0001-adopt-docbound.md")));
  });

  test("ships no test suite, no build scripts, and no frozen reference", () => {
    const root = ensurePackage();
    const shipped = [];
    walk(root, "");
    function walk(dir, prefix) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
        else shipped.push(rel);
      }
    }

    const unwanted = shipped.filter(
      (f) =>
        f.startsWith("tests/") ||
        f.startsWith("scripts/") ||
        f.includes("/reference/") ||
        f.endsWith(".py"),
    );
    assert.deepEqual(unwanted, [], "the package carries only what it runs");
    assert.ok(shipped.includes("dist/payload/SKILL.md"), "the hand-vendor payload ships");
  });

  test("the licence and its notice ship", () => {
    // npm adds LICENSE and README on its own and adds nothing else, so an
    // Apache-2.0 package whose NOTICE is outside the whitelist distributes the
    // licence without the attribution the licence asks to be carried with it.
    const root = ensurePackage();
    for (const file of ["LICENSE", "NOTICE.md", "README.md"]) {
      assert.ok(fs.existsSync(path.join(root, file)), `${file} is in the tarball`);
    }
  });
});
