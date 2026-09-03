// Archiving old worklog entries.
//
// The property that matters is what stays: the newest entries, and any entry
// still holding an open item, because the ledger checks and `summary --open`
// read the live file (`docs/decisions/0039-the-ledger-needs-pressure.md`).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, describe, test } from "node:test";

import { SKILL_DIR, removeTree, runNode, tempDir } from "./harness.mjs";
import { partition, quarterOf } from "../skill/docbound/scripts/prune.mjs";

const PRUNE = path.join(SKILL_DIR, "scripts", "prune.mjs");
const made = [];
after(() => {
  for (const dir of made) removeTree(dir);
});

function entry(date, title, stillOpen) {
  return [
    `## ${date} - ${title}`,
    "",
    "Agent: claude · Branch: main · t=1788190671",
    "",
    "### Intent",
    "",
    `What ${title} was for.`,
    "",
    "### Outcome",
    "",
    `What ${title} changed.`,
    "",
    "### Still open",
    "",
    stillOpen,
    "",
  ].join("\n");
}

/**
 * A worklog with twelve entries, newest first, one old entry holding an item
 * that is still open and one older quarter to archive separately.
 */
function project() {
  const dir = tempDir("prune");
  made.push(dir);
  fs.mkdirSync(path.join(dir, "docs"), { recursive: true });

  const entries = [];
  for (let i = 0; i < 10; i += 1) {
    entries.push(entry(`2026-08-${String(20 + i).padStart(2, "0")}`, `Task ${i}`, "- Nothing."));
  }
  entries.reverse();
  entries.push(entry("2026-07-04", "Note the backoff", "- [retry-jitter] the backoff has no jitter"));
  entries.push(entry("2026-05-02", "An older quarter", "- Nothing."));

  fs.writeFileSync(
    path.join(dir, "docs", "WORKLOG.md"),
    `# Worklog\n\nNewest entry first.\n\n${entries.join("\n")}`,
  );
  return dir;
}

const worklog = (dir) => fs.readFileSync(path.join(dir, "docs", "WORKLOG.md"), "utf8");

describe("prune", () => {
  test("a quarter is the archive's name", () => {
    assert.equal(quarterOf("2026-01-31"), "2026-Q1");
    assert.equal(quarterOf("2026-08-31"), "2026-Q3");
    assert.equal(quarterOf("2025-12-01"), "2025-Q4");
  });

  test("an entry holding an open item stays whatever its age", () => {
    const entries = [
      { title: "newest", stillOpen: ["- Nothing."] },
      { title: "old and open", stillOpen: ["- [retry-jitter] no jitter"] },
      { title: "old and closed", stillOpen: ["- Nothing."] },
    ];
    const { stay, move } = partition(entries, 1, new Set(["retry-jitter"]));
    assert.deepEqual(stay.map((e) => e.title), ["newest", "old and open"]);
    assert.deepEqual(move.map((e) => e.title), ["old and closed"]);
  });

  test("--dry-run says what would move and writes nothing", () => {
    const dir = project();
    const before = worklog(dir);
    const result = runNode(PRUNE, ["--root", dir, "--keep", "5", "--dry-run"]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /would move \d+ entries to docs\/worklog\/2026-Q3\.md/);
    assert.equal(worklog(dir), before);
    assert.equal(fs.existsSync(path.join(dir, "docs", "worklog")), false);
  });

  test("old entries move to their quarter and the worklog links them", () => {
    const dir = project();
    const result = runNode(PRUNE, ["--root", dir, "--keep", "5"]);
    assert.equal(result.status, 0, result.stderr);

    const live = worklog(dir);
    const q3 = fs.readFileSync(path.join(dir, "docs", "worklog", "2026-Q3.md"), "utf8");
    const q2 = fs.readFileSync(path.join(dir, "docs", "worklog", "2026-Q2.md"), "utf8");

    assert.match(live, /- `docs\/worklog\/2026-Q3\.md`/);
    assert.match(live, /## 2026-08-29 - Task 9/, "the newest entries stay");
    assert.match(live, /## 2026-07-04 - Note the backoff/, "an open item pins its entry");
    assert.doesNotMatch(live, /## 2026-08-20 - Task 0/);
    assert.match(q3, /## 2026-08-20 - Task 0/);
    assert.match(q2, /## 2026-05-02 - An older quarter/);
  });

  test("a second run has nothing to move", () => {
    const dir = project();
    runNode(PRUNE, ["--root", dir, "--keep", "5"]);
    const second = runNode(PRUNE, ["--root", dir, "--keep", "5"]);

    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /^nothing to prune: /);
  });

  test("a bad --keep is a usage error", () => {
    const dir = project();
    const result = runNode(PRUNE, ["--root", dir, "--keep", "none"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /--keep must be a positive whole number/);
  });
});
