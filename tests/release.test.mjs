import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { after, describe, test } from "node:test";

import { removeTree, tempDir } from "./harness.mjs";
import { bumpVersion, classifyCommit, nextRelease } from "../scripts/release.mjs";

const made = [];
after(() => {
  for (const dir of made) removeTree(dir);
});

function git(repo, args) {
  const result = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function write(repo, rel, text) {
  const file = path.join(repo, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function releaseRepo(version = "0.2.1") {
  const repo = tempDir("release");
  made.push(repo);

  git(repo, ["init", "-b", "main"]);
  git(repo, ["config", "user.name", "Test User"]);
  git(repo, ["config", "user.email", "test@example.com"]);
  git(repo, ["config", "commit.gpgsign", "false"]);
  git(repo, ["config", "tag.gpgSign", "false"]);

  write(repo, "package.json", `${JSON.stringify({ name: "fixture", version }, null, 2)}\n`);
  write(repo, "notes.txt", "0\n");
  git(repo, ["add", "package.json", "notes.txt"]);
  git(repo, ["commit", "-m", "chore: init"]);
  git(repo, ["tag", "-a", `v${version}`, "-m", `fixture ${version}`]);
  return repo;
}

function commit(repo, subject, body = "") {
  const file = path.join(repo, "notes.txt");
  const next = Number(fs.readFileSync(file, "utf8")) + 1;
  fs.writeFileSync(file, `${next}\n`);
  git(repo, ["add", "notes.txt"]);
  const args = ["commit", "-m", subject];
  if (body) args.push("-m", body);
  git(repo, args);
}

describe("release planning", () => {
  test("fix commits are patch releases", () => {
    const repo = releaseRepo();
    commit(repo, "fix: tighten the publish guard");

    const plan = nextRelease(repo);
    assert.equal(plan.level, "patch");
    assert.equal(plan.nextVersion, "0.2.2");
    assert.equal(plan.releasable.length, 1);
  });

  test("feat outranks fix when both are present", () => {
    const repo = releaseRepo();
    commit(repo, "fix: keep the stop hook idempotent");
    commit(repo, "feat: publish from mainline commit prefixes");

    const plan = nextRelease(repo);
    assert.equal(plan.level, "minor");
    assert.equal(plan.nextVersion, "0.3.0");
  });

  test("breaking changes are major releases", () => {
    assert.equal(classifyCommit({ subject: "feat!: replace the release contract" }), "major");
    assert.equal(
      classifyCommit({
        subject: "docs: describe the new contract",
        body: "BREAKING CHANGE: the old release flow is removed",
      }),
      "major",
    );
  });

  test("non-releasable commits produce no next version", () => {
    const repo = releaseRepo();
    commit(repo, "docs: rewrite the release notes");
    commit(repo, "chore: tidy the fixture");

    const plan = nextRelease(repo);
    assert.equal(plan.level, null);
    assert.equal(plan.nextVersion, null);
    assert.deepEqual(plan.releasable, []);
  });

  test("package and tag versions must agree before the next release", () => {
    const repo = releaseRepo();
    write(repo, "package.json", `${JSON.stringify({ name: "fixture", version: "0.2.2" }, null, 2)}\n`);
    git(repo, ["add", "package.json"]);
    git(repo, ["commit", "-m", "chore: bump without a release tag"]);

    assert.throws(
      () => nextRelease(repo),
      /package\.json says 0\.2\.2 but latest release tag is v0\.2\.1/,
    );
  });

  test("version bumps follow semver positions", () => {
    assert.equal(bumpVersion("1.2.3", "patch"), "1.2.4");
    assert.equal(bumpVersion("1.2.3", "minor"), "1.3.0");
    assert.equal(bumpVersion("1.2.3", "major"), "2.0.0");
  });
});
