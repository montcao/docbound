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

import { REPO_ROOT, SKILL_DIR, buildFixture, removeTree, runNode, tempDir } from "./harness.mjs";
import {
  bullets,
  leadParagraph,
  openItems,
  parseOpenItem,
  worklogEntries,
} from "../skill/docbound/scripts/lib/digest.mjs";

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

  test("reports what it read", () => {
    const out = summarize(baseline());
    assert.match(out, /Assembled from \d+ document\(s\), no source read/);
  });

  test("draws the comparison only where it is one", () => {
    // A repository small enough that reading the source is cheaper would get a
    // saving that is a loss, which invites distrust of the figure where it is
    // real. The fixture is small; this repository is not.
    const small = summarize(baseline());
    assert.ok(
      !small.includes("an answer from the code would have cost"),
      "no comparison on a repository smaller than its own summary",
    );

    const self = summarize(REPO_ROOT);
    assert.match(self, /an answer from the code would have cost/);
    assert.match(self, /Both figures are estimates/);
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

describe("tracked open items", () => {
  // Newest first, as worklogEntries returns them.
  const history = [
    {
      title: "third task",
      date: "2026-03-03",
      stillOpen: ["[jitter] closed: added jitter and a fixture", "an untagged note"],
    },
    {
      title: "second task",
      date: "2026-02-02",
      stillOpen: ["[jitter] the backoff still has no jitter", "[docs] rewrite the guide"],
    },
    {
      title: "first task",
      date: "2026-01-01",
      stillOpen: ["[jitter] the backoff has no jitter"],
    },
  ];

  test("a slug is parsed off the front of a bullet", () => {
    assert.deepEqual(parseOpenItem("[check-set] wrapped comments read as fragments"), {
      slug: "check-set",
      text: "wrapped comments read as fragments",
      closing: false,
      note: "wrapped comments read as fragments",
    });
  });

  test("closed, done, and resolved all close an item", () => {
    for (const word of ["closed", "done", "resolved"]) {
      const item = parseOpenItem(`[jitter] ${word}: shipped`);
      assert.equal(item.closing, true, word);
      assert.equal(item.note, "shipped");
    }
  });

  test("one item mentioned three times is one open item", () => {
    const { open } = openItems(history.slice(1));
    const jitter = open.filter((i) => i.slug === "jitter");
    assert.equal(jitter.length, 1, "not one row per mention");
    assert.equal(jitter[0].mentions, 2);
  });

  test("it is opened by its first appearance in time, not its latest", () => {
    const { open } = openItems(history.slice(1));
    const jitter = open.find((i) => i.slug === "jitter");
    assert.equal(jitter.date, "2026-01-01");
    assert.equal(jitter.entry, "first task");
  });

  test("a later entry closes it, and it leaves the open list", () => {
    const { open, closed } = openItems(history);
    assert.ok(!open.some((i) => i.slug === "jitter"), "closed item is not open");
    const done = closed.find((i) => i.slug === "jitter");
    assert.equal(done.closed.note, "added jitter and a fixture");
    assert.equal(done.closed.date, "2026-03-03");
  });

  test("an untagged bullet still counts, attributed to its entry", () => {
    const { open } = openItems(history);
    const note = open.find((i) => i.slug === null);
    assert.equal(note.text, "an untagged note");
    assert.equal(note.entry, "third task");
  });

  test("identical untagged bullets collapse, since nothing can tell them apart", () => {
    const repeated = [
      { title: "b", date: "2026-02-02", stillOpen: ["the same note"] },
      { title: "a", date: "2026-01-01", stillOpen: ["the same note"] },
    ];
    assert.equal(openItems(repeated).open.length, 1);
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
