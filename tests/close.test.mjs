// Closing a tracked item by slug.
//
// The command exists so a mistyped slug is an error rather than a second item
// that looks like the first, so most of what matters here is what it refuses.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, describe, test } from "node:test";

import { SKILL_DIR, buildFixture, removeTree, runNode } from "./harness.mjs";
import { appendToStillOpen } from "../skill/docbound/scripts/close.mjs";
import { openItems, worklogEntries } from "../skill/docbound/scripts/lib/digest.mjs";
import { editDistance } from "../skill/docbound/scripts/lib/checks/open-item-typo.mjs";

const CLOSE = path.join(SKILL_DIR, "scripts", "close.mjs");
const START = path.join(SKILL_DIR, "scripts", "start.mjs");
const built = [];
after(() => {
  for (const work of built) removeTree(work);
});

/** A repository with one tracked item open, ready to be closed. */
function withOpenItem() {
  const fixture = buildFixture("filled-baseline");
  built.push(fixture.work);
  const repo = fixture.repo;

  runNode(START, ["Note the retry backoff", "--root", repo]);
  const file = path.join(repo, "docs", "WORKLOG.md");
  const text = fs.readFileSync(file, "utf8");
  fs.writeFileSync(
    file,
    text.replace(
      "### Outcome\n",
      "### Outcome\n\nWrote the note.\n",
    ).replace(
      "### Still open\n",
      "### Still open\n\n- [retry-jitter] the backoff has no jitter\n",
    ),
  );
  return repo;
}

function worklog(repo) {
  return fs.readFileSync(path.join(repo, "docs", "WORKLOG.md"), "utf8");
}

describe("close", () => {
  test("appends a closing line for a slug that is open", () => {
    const repo = withOpenItem();
    const result = runNode(CLOSE, ["retry-jitter", "added jitter", "--root", repo]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(worklog(repo), /- \[retry-jitter\] closed: added jitter/);
  });

  test("the item leaves the open list once closed", () => {
    const repo = withOpenItem();
    runNode(CLOSE, ["retry-jitter", "added jitter", "--root", repo]);

    const { open, closed } = openItems(worklogEntries(repo));
    assert.ok(!open.some((i) => i.slug === "retry-jitter"), "no longer open");
    assert.equal(closed.find((i) => i.slug === "retry-jitter").closed.note, "added jitter");
  });

  test("a slug that is not open is refused, and the real ones are printed", () => {
    const repo = withOpenItem();
    const result = runNode(CLOSE, ["retry-jiter", "typo", "--root", repo]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /no open item is tagged \[retry-jiter\]/);
    assert.match(result.stderr, /retry-jitter/, "the real slug is offered");
    assert.ok(!worklog(repo).includes("retry-jiter"), "nothing was written");
  });

  test("closing something twice says when it was closed", () => {
    const repo = withOpenItem();
    runNode(CLOSE, ["retry-jitter", "added jitter", "--root", repo]);

    const second = runNode(CLOSE, ["retry-jitter", "again", "--root", repo]);
    assert.equal(second.status, 1);
    assert.match(second.stderr, /was already closed/);
  });

  test("a note is required, because a closing with no reason records nothing", () => {
    const repo = withOpenItem();
    const result = runNode(CLOSE, ["retry-jitter", "--root", repo]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /say what happened/);
  });

  test("the closed entry still passes the audit", () => {
    const repo = withOpenItem();
    runNode(CLOSE, ["retry-jitter", "added jitter", "--root", repo]);

    const audit = runNode(path.join(SKILL_DIR, "scripts", "audit.mjs"), [
      "--root",
      repo,
      "--json",
    ]);
    assert.deepEqual(JSON.parse(audit.stdout).errors, []);
  });
});

describe("appendToStillOpen", () => {
  test("writes at the end of the section, not the start", () => {
    const text = [
      "# Worklog",
      "",
      "## 2026-01-01 - A task",
      "",
      "### Still open",
      "",
      "- [one] first",
      "",
      "## 2026-12-31 - An older task",
      "",
    ].join("\n");

    const out = appendToStillOpen(text, "- [two] second");
    const lines = out.split("\n");
    assert.ok(lines.indexOf("- [one] first") < lines.indexOf("- [two] second"));
    // The next entry is untouched.
    assert.ok(out.includes("## 2026-12-31 - An older task"));
  });

  test("returns null when the newest entry has no such section", () => {
    const text = "# Worklog\n\n## 2026-01-01 - A task\n\n### Outcome\n\nDone.\n";
    assert.equal(appendToStillOpen(text, "- [x] y"), null);
  });
});

describe("editDistance", () => {
  test("counts single edits", () => {
    assert.equal(editDistance("retry-jitter", "retry-jiter"), 1);
    assert.equal(editDistance("retry-jitter", "retry-jitter"), 0);
    assert.equal(editDistance("abc", "abd"), 1);
  });

  test("gives up past the limit rather than finishing the matrix", () => {
    assert.ok(editDistance("provider-coverage", "prose-style-check", 2) > 2);
  });
});
