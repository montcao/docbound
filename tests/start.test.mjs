// Opening a worklog entry.
//
// The command exists because the shape of an entry is structure rather than
// judgement, so the assertions are about shape: the sections come from the
// template, the guidance text does not come with them, and a task nobody closed
// is not something to quietly stack on top of.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, describe, test } from "node:test";

import { SKILL_DIR, buildFixture, removeTree, runNode, tempDir } from "./harness.mjs";
import { renderEntry, templateSections } from "../skill/docbound/scripts/start.mjs";

const START = path.join(SKILL_DIR, "scripts", "start.mjs");
const AUDIT = path.join(SKILL_DIR, "scripts", "audit.mjs");
const made = [];
after(() => {
  for (const dir of made) removeTree(dir);
});

function baseline() {
  const fixture = buildFixture("filled-baseline");
  made.push(fixture.work);
  return fixture.repo;
}

function worklog(repo) {
  return fs.readFileSync(path.join(repo, "docs", "WORKLOG.md"), "utf8");
}

describe("start", () => {
  test("prepends a dated entry above the previous one", () => {
    const repo = baseline();
    const before = worklog(repo);

    const result = runNode(START, ["Add rate limiting", "--root", repo]);
    assert.equal(result.status, 0, result.stderr);

    const after = worklog(repo);
    const headings = after.match(/^## .+$/gm);
    assert.match(headings[0], /Add rate limiting$/, "newest entry is first");
    assert.equal(headings.length, before.match(/^## .+$/gm).length + 1);
    assert.ok(after.startsWith("# Worklog"), "the file header survives");
  });

  test("the opening sections are there and the closing ones are empty", () => {
    const repo = baseline();
    runNode(START, ["Add rate limiting", "--root", repo]);
    const entry = worklog(repo).split(/^## /m)[1];

    assert.ok(entry.includes("### Intent"), "Intent is opened");
    assert.ok(entry.includes("### Outcome"), "Outcome exists to be filled later");
    assert.ok(entry.includes("### Still open"));

    // Three sections and nothing else. `Expected to touch` and `Unknowns going
    // in` were plans, and a diff carries a plan better than a prediction of one
    // (`docs/decisions/0032-worklog-entries-are-short.md`).
    assert.equal((entry.match(/^### /gm) ?? []).length, 3);
  });

  test("brings no guidance text with it", () => {
    const repo = baseline();
    runNode(START, ["Add rate limiting", "--root", repo]);
    const entry = worklog(repo).split(/^## /m)[1];

    // A section holding its own instructions is what template-residue catches.
    // Creating the finding here only to make the agent clear it is busywork.
    assert.ok(!/<[a-z]/.test(entry), `placeholder text came along:\n${entry}`);
  });

  test("a freshly opened entry fails the audit as unclosed, and only that", () => {
    const repo = baseline();
    runNode(START, ["Add rate limiting", "--root", repo]);

    const result = runNode(AUDIT, ["--root", repo, "--json"]);
    const checks = JSON.parse(result.stdout).errors.map((f) => f.check);
    assert.deepEqual([...new Set(checks)], ["worklog-closed"]);
  });

  test("refuses to stack on an entry nobody closed", () => {
    const repo = baseline();
    runNode(START, ["First task", "--root", repo]);

    const second = runNode(START, ["Second task", "--root", repo]);
    assert.equal(second.status, 1);
    assert.match(second.stderr, /no Outcome yet/);
    assert.equal(worklog(repo).match(/Second task/), null, "nothing was written");
  });

  test("--force says you meant it", () => {
    const repo = baseline();
    runNode(START, ["First task", "--root", repo]);

    const second = runNode(START, ["Second task", "--root", repo, "--force"]);
    assert.equal(second.status, 0, second.stderr);
    assert.match(worklog(repo), /Second task/);
  });

  test("a missing worklog points at scaffold rather than creating one", () => {
    const bare = tempDir("start-bare");
    made.push(bare);
    const result = runNode(START, ["A task", "--root", bare]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /scaffold/);
  });

  test("a title is required", () => {
    const result = runNode(START, ["--root", "."]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /title is required/);
  });

  test("an unquoted multi-word title is refused rather than truncated", () => {
    const repo = baseline();
    const result = runNode(START, ["Add", "rate", "limiting", "--root", repo]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /quote the whole thing/);
  });
});

describe("start internals", () => {
  test("the template decides which sections exist", () => {
    const sections = templateSections();
    assert.ok(sections.includes("Intent"));
    assert.ok(sections.includes("Still open"));
  });

  test("the heading uses a hyphen, the same as every other entry", () => {
    const entry = renderEntry({
      title: "Add rate limiting",
      date: "2026-08-26",
      agent: "claude",
      branch: "main",
    });
    assert.match(entry, /^## 2026-08-26 - Add rate limiting$/m);
    assert.ok(!entry.includes("—"), "an em dash here is what the parser had to tolerate");
  });
});
