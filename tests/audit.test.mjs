// Every fixture, through the audit, compared by exact check-ID counts.
//
// The comparison is deepStrictEqual on the whole count object rather than a
// subset check: a check that fires where the scenario does not call for it is a
// failure, which is what keeps the check set from drifting wider over time.

import assert from "node:assert/strict";
import { after, describe, test } from "node:test";

import {
  AUDIT,
  buildFixture,
  countByCheck,
  expectedFor,
  fixtureNames,
  removeTree,
  runAudit,
  runNode,
} from "./harness.mjs";

const built = [];
after(() => {
  for (const work of built) removeTree(work);
});

function build(name) {
  const fixture = buildFixture(name);
  built.push(fixture.work);
  return fixture;
}

describe("audit fixtures", () => {
  for (const name of fixtureNames()) {
    test(name, () => {
      const expected = expectedFor(name);
      const { repo, args } = build(name);
      const { json, status } = runAudit(repo, args);

      assert.deepStrictEqual(countByCheck(json.errors), expected.errors, "errors");
      assert.deepStrictEqual(countByCheck(json.warnings), expected.warnings, "warnings");
      assert.deepStrictEqual(countByCheck(json.waived), expected.waived, "waived");
      assert.equal(json.git, expected.git, "git detection");
      assert.equal(status, expected.exit, "exit code");
    });
  }
});

describe("audit surface", () => {
  test("no-git output says coverage was not evaluated", () => {
    const { repo } = build("no-git");
    const result = runNode(AUDIT, ["--root", repo]);
    assert.match(result.stdout, /doc-coverage not evaluated/);
    assert.equal(result.status, 0);
  });

  test("an unknown flag is a usage error", () => {
    const result = runNode(AUDIT, ["--nonsense"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unrecognized argument/);
  });

  test("an invalid mode is a usage error", () => {
    const result = runNode(AUDIT, ["--mode", "reviewer"]);
    assert.equal(result.status, 2);
  });

  test("--next-adr prints the next four digit number", () => {
    const { repo } = build("filled-baseline");
    const result = runNode(AUDIT, ["--root", repo, "--next-adr"]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), "0002");
  });

  test("waivers name the finding they dismiss", () => {
    const { repo, args } = build("waiver");
    const { json } = runAudit(repo, args);
    const byCheck = Object.fromEntries(json.waived.map((f) => [f.check, f]));

    assert.equal(json.waived.length, 2);
    assert.equal(byCheck["doc-coverage"].path, "src/app.py");
    assert.equal(byCheck["doc-coverage"].level, "waived");

    // The target the grammar used to truncate at its first hyphen. Every
    // decision record filename carries one, so this waiver had never worked.
    assert.equal(
      byCheck["adr-immutable"].path,
      "docs/decisions/0001-adopt-docbound.md",
    );
    assert.equal(byCheck["adr-immutable"].level, "waived");
  });

  test("--fast runs only the cheap checks", () => {
    const { repo, args } = build("undocumented-change");
    const full = runAudit(repo, args);
    const fast = runAudit(repo, [...args, "--fast"]);
    const fullChecks = new Set(full.json.errors.map((f) => f.check));
    const fastChecks = new Set(fast.json.errors.map((f) => f.check));

    assert.ok(fullChecks.has("doc-coverage"), "the full run finds doc-coverage");
    assert.ok(!fastChecks.has("doc-coverage"), "the fast run skips doc-coverage");
    assert.ok(fastChecks.has("worklog-entry"), "the fast run keeps worklog-entry");
  });
});
