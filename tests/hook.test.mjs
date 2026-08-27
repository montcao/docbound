// The hook, which is the part of docbound that can stop a session.
//
// It had no test of its own: the audit was covered by fixtures and the CLI by
// temporary projects, while the script that runs after every edit and exits 2
// on stop was exercised only incidentally by `tests/package.test.mjs`. What is
// pinned here is the behaviour a session depends on — that the edit hook never
// blocks, that the stop hook does, and that neither repeats itself.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, describe, test } from "node:test";

import { SKILL_DIR, buildFixture, removeTree, runNode } from "./harness.mjs";

const HOOK = path.join(SKILL_DIR, "scripts", "hook.mjs");
const built = [];
after(() => {
  for (const work of built) removeTree(work);
});

/** A repository whose audit fails: source changed with no doc covering it. */
function failing() {
  const fixture = buildFixture("undocumented-change");
  built.push(fixture.work);
  return fixture.repo;
}

// The edit hook runs the fast subset, so a test about it has to use a check
// that is in that subset. `doc-coverage` is not; `template-residue` is.
function plantPlaceholder(repo) {
  const doc = path.join(repo, "src", "README.md");
  fs.appendFileSync(doc, "\nOwner: <who owns this>\n");
  return doc;
}

function hook(repo, event) {
  return runNode(HOOK, ["--event", event, "--root", repo, "--provider", "test"]);
}

describe("the edit hook", () => {
  test("reports what is open and does not block", () => {
    const repo = failing();
    plantPlaceholder(repo);
    const first = hook(repo, "after-edit");
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /documentation finding/);
    assert.match(first.stdout, /\[template-residue\]/);
  });

  test("says each finding once, however many edits follow", () => {
    const repo = failing();
    plantPlaceholder(repo);
    assert.match(hook(repo, "after-edit").stdout, /template-residue/);

    const second = hook(repo, "after-edit");
    assert.equal(second.status, 0, second.stderr);
    assert.equal(second.stdout, "");
  });

  test("a finding that goes away and comes back is reported again", () => {
    const repo = failing();
    const doc = plantPlaceholder(repo);
    const withPlaceholder = fs.readFileSync(doc, "utf8");
    assert.match(hook(repo, "after-edit").stdout, /template-residue/);

    fs.writeFileSync(doc, withPlaceholder.replace("Owner: <who owns this>", "Owner: the team"));
    assert.equal(hook(repo, "after-edit").stdout, "");

    fs.writeFileSync(doc, withPlaceholder);
    assert.match(hook(repo, "after-edit").stdout, /template-residue/);
  });
});

describe("the stop hook", () => {
  test("exits 2 with the findings on stderr", () => {
    const repo = failing();
    const result = hook(repo, "stop");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /the task is not done/);
    assert.match(result.stderr, /\[doc-coverage\]/);
  });

  test("restates everything, whatever the edit hook already said", () => {
    const repo = failing();
    plantPlaceholder(repo);
    assert.match(hook(repo, "after-edit").stdout, /template-residue/);

    const result = hook(repo, "stop");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /\[template-residue\]/);
  });

  test("a repository turning the hook off is left alone", () => {
    const repo = failing();
    const config = path.join(repo, ".docbound", "config.json");
    fs.mkdirSync(path.dirname(config), { recursive: true });
    fs.writeFileSync(config, JSON.stringify({ hook: { enabled: false } }));

    const result = hook(repo, "stop");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  });
});
