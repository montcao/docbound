// The summary reads documentation and nothing else.
//
// That claim is the whole feature, so it is the thing most worth asserting:
// planting a distinctive string in a source file and requiring that it never
// appears in the output is a cheap check that survives every future change to
// the renderer.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, describe, test } from "node:test";

import { SKILL_DIR, buildFixture, removeTree, runNode, tempDir } from "./harness.mjs";
import { bullets, leadParagraph, worklogEntries } from "../skill/docbound/scripts/lib/digest.mjs";

const SUMMARY = path.join(SKILL_DIR, "scripts", "summary.mjs");
const made = [];
after(() => {
  for (const dir of made) removeTree(dir);
});

function baseline() {
  const fixture = buildFixture("filled-baseline");
  made.push(fixture.work);
  return fixture.repo;
}

function summarize(repo, args = []) {
  const result = runNode(SUMMARY, ["--root", repo, ...args]);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

describe("summary", () => {
  test("reports what the project is, from its docs", () => {
    const out = summarize(baseline());
    assert.match(out, /# fixture-service/);
    assert.match(out, /Accepts HTTP request bodies/);
    assert.match(out, /## Shape/);
    assert.match(out, /## Modules/);
    assert.match(out, /## Decisions/);
    assert.match(out, /## Recent work/);
  });

  test("carries each module's must-not list", () => {
    const out = summarize(baseline());
    // The part of a contract the source cannot show, because it describes what
    // is absent.
    assert.match(out, /Must not construct a job id/);
    assert.match(out, /Must not validate request bodies/);
  });

  test("rejoins a bullet that wrapped across lines", () => {
    const out = summarize(baseline());
    // Reading only the line with the marker would cut this mid-sentence.
    assert.match(out, /unique within a run and not across runs/);
  });

  test("reads no source file", () => {
    const repo = baseline();
    const marker = "ZZQQ_MARKER_ONLY_IN_SOURCE";
    fs.writeFileSync(
      path.join(repo, "src", "secret.py"),
      `# ${marker}\ndef leak():\n    return "${marker}"\n`,
    );

    const out = summarize(repo);
    assert.ok(!out.includes(marker), "source content reached the summary");
  });

  test("reports its own cost against the source it did not read", () => {
    const out = summarize(baseline());
    assert.match(out, /Assembled from \d+ document\(s\), no source read/);
    assert.match(out, /Both figures are estimates/);
  });

  test("--open lists unfinished work and nothing else", () => {
    const out = summarize(baseline(), ["--open"]);
    assert.match(out, /# Open work/);
    assert.match(out, /Queue durability is unaddressed/);
    assert.ok(!out.includes("## Modules"), "--open is only the open items");
  });

  test("--json is the same content as data", () => {
    const digest = JSON.parse(summarize(baseline(), ["--json"]));
    assert.equal(digest.project.name, "fixture-service");
    assert.ok(digest.modules.length >= 2);
    assert.ok(digest.decisions.length >= 1);
    assert.equal(digest.decisions[0].status, "accepted");
  });

  test("says so when a repository has nothing to summarise", () => {
    const bare = tempDir("summary-bare");
    made.push(bare);
    fs.writeFileSync(path.join(bare, "a.py"), "def a():\n    return 1\n");

    const out = summarize(bare);
    assert.match(out, /little documentation for this to read/);
  });

  test("an unknown flag is a usage error", () => {
    const result = runNode(SUMMARY, ["--nonsense"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unrecognized argument/);
  });
});

describe("digest parsing", () => {
  test("leadParagraph skips the heading and stops at the blank line", () => {
    const text = "# Title\n\nFirst line\nsecond line\n\nA later paragraph.\n";
    assert.equal(leadParagraph(text), "First line second line");
  });

  test("bullets rejoin continuation lines and drop stray prose", () => {
    const body = "intro prose\n\n- one that\n  wraps over two lines\n- two\n";
    assert.deepEqual(bullets(body), ["one that wraps over two lines", "two"]);
  });

  test("worklogEntries reads newest first with its open items", () => {
    const repo = baseline();
    const entries = worklogEntries(repo);
    assert.ok(entries.length >= 1);
    assert.match(entries[0].title, /baseline documentation/);
    assert.ok(entries[0].stillOpen.length >= 1);
  });
});
