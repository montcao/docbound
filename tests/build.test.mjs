// The build is a pure function of `skill/docbound/`, and the freshness check
// notices when the committed output stops matching it.
//
// Both properties exist to make one thing safe: committing `dist/` (ADR 0004).
// If the build were not deterministic, the committed tree would churn; if the
// freshness check did not fail, the committed tree would quietly rot.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { REPO_ROOT, removeTree, tempDir } from "./harness.mjs";
import { build, buildPlugin, collectPayload, hashFiles } from "../scripts/build.mjs";
import { checkDistFresh, compareTrees, listTree } from "../scripts/check-dist-fresh.mjs";

const made = [];
after(() => {
  for (const dir of made) removeTree(dir);
});

function buildInto() {
  const dir = tempDir("build");
  made.push(dir);
  build({
    out: path.join(dir, "dist"),
    pluginOut: path.join(dir, "plugin"),
    quiet: true,
  });
  return dir;
}

describe("build", () => {
  test("two builds of the same input are byte identical", () => {
    const first = listTree(path.join(buildInto(), "dist"));
    const second = listTree(path.join(buildInto(), "dist"));
    assert.deepEqual(compareTrees(first, second), []);
  });

  test("the distribution contains one path-neutral payload", () => {
    const dir = buildInto();
    const payload = listTree(path.join(dir, "dist", "payload"));
    assert.ok(payload.has("SKILL.md"));
    assert.equal(hashFiles(payload), hashFiles(collectPayload()));
    assert.deepEqual(fs.readdirSync(path.join(dir, "dist")), ["payload"]);

    const lock = build({
      out: path.join(dir, "lock-dist"),
      pluginOut: path.join(dir, "lock-plugin"),
      quiet: true,
    });
    assert.equal(lock.payload.hash, hashFiles(payload));
    assert.ok(!("providers" in lock), "provider placement is not build output");
  });

  test("the Python reference is not shipped", () => {
    const dir = buildInto();
    const files = [...listTree(path.join(dir, "dist")).keys()];
    assert.equal(
      files.filter((f) => f.endsWith(".py")).length,
      0,
      "the specification stays in the repository and out of the distribution",
    );
  });

  test("the plugin carries the skill, the agent, and the hooks", () => {
    const files = buildPlugin(collectPayload());
    assert.ok(files.has("skills/docbound/SKILL.md"));
    assert.ok(files.has("agents/docbound-documenter.md"));
    assert.ok(files.has("hooks/hooks.json"));
    // The skill directory is also complete on its own, for the tools that copy
    // exactly that directory and nothing around it
    // (`docs/decisions/0044-the-skill-directory-is-self-contained.md`).
    assert.ok(files.has("skills/docbound/agents/docbound-documenter.md"));
    assert.ok(
      ![...files.keys()].some((f) => f.startsWith("cli/") || f.startsWith("tests/")),
      "the plugin stays slim",
    );
  });

  test("nothing emitted contains an absolute path from this machine", () => {
    const dir = buildInto();
    for (const [rel, contents] of listTree(path.join(dir, "dist"))) {
      if (!/\.(json|md|mjs)$/.test(rel)) continue;
      assert.ok(
        !contents.toString("utf8").includes(REPO_ROOT),
        `${rel} embeds the build machine's path`,
      );
    }
  });
});

describe("check-dist-fresh", () => {
  test("the committed dist is current", () => {
    assert.deepEqual(checkDistFresh(), []);
  });

  test("a changed skill with an unchanged dist is a difference", () => {
    const rebuilt = listTree(path.join(buildInto(), "dist"));
    const stale = new Map(rebuilt);
    const skillFile = "payload/SKILL.md";
    stale.set(skillFile, Buffer.from("a line the build did not produce\n"));

    const problems = compareTrees(stale, rebuilt);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^stale: /);
  });

  test("a file the build no longer produces is a difference", () => {
    const rebuilt = listTree(path.join(buildInto(), "dist"));
    const withExtra = new Map(rebuilt);
    withExtra.set("payload/LEFTOVER.md", Buffer.from("x"));

    const problems = compareTrees(withExtra, rebuilt);
    assert.deepEqual(problems, [
      "not produced by the build: payload/LEFTOVER.md",
    ]);
  });

  test("a missing file is a difference", () => {
    const rebuilt = listTree(path.join(buildInto(), "dist"));
    const missing = new Map(rebuilt);
    const dropped = "payload/SKILL.md";
    missing.delete(dropped);

    const problems = compareTrees(missing, rebuilt);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^missing from the commit: /);
  });
});

describe("the README's counts are true", () => {
  // Both numbers drifted within five days, in the section headed "Evidence,
  // rather than claims", in a project whose thesis is that documentation drifts
  // unless something checks it. Nothing counted them
  // (`docs/decisions/0037-the-readme-counts-itself.md`).
  const readme = fs.readFileSync(path.join(REPO_ROOT, "README.md"), "utf8");

  /** Every check ID, taken from the module names, which are the IDs. */
  const checkIds = () =>
    fs
      .readdirSync(path.join(REPO_ROOT, "skill/docbound/scripts/lib/checks"))
      .filter((n) => n.endsWith(".mjs"))
      .map((n) => n.replace(/\.mjs$/, ""));

  test("every check has a fixture that produces it", () => {
    // The README claimed a test count, which needed the suite to run itself to
    // verify and recursed. What it should have claimed is this, which is the
    // property the count was standing in for.
    const ids = checkIds();
    const expectations = fs
      .readdirSync(path.join(REPO_ROOT, "tests", "fixtures"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(REPO_ROOT, "tests", "fixtures", e.name, "expected.json"))
      .filter((f) => fs.existsSync(f))
      .map((f) => fs.readFileSync(f, "utf8"))
      .join("");
    const uncovered = ids.filter((id) => !expectations.includes(`"${id}"`));
    assert.deepEqual(uncovered, [], `no fixture produces: ${uncovered.join(", ")}`);
  });

  test("the check reference counts the checks", () => {
    // This one was written as a word and went unasserted while its neighbours
    // were counted, so it was the number that drifted: the file opened on
    // "Twenty-four checks" with twenty-five modules on disk
    // (`docs/decisions/0037-the-readme-counts-itself.md`).
    const TENS = { twenty: 20, thirty: 30, forty: 40 };
    const UNITS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    const fromWords = (word) => {
      const [tens, unit] = word.toLowerCase().split("-");
      if (!(tens in TENS)) return null;
      return TENS[tens] + (unit ? UNITS.indexOf(unit) : 0);
    };

    const reference = fs.readFileSync(path.join(REPO_ROOT, "docs/checks.md"), "utf8");
    const claimed = /^([A-Za-z]+-?[a-z]*) checks\./m.exec(reference)?.[1];
    assert.ok(claimed, "docs/checks.md opens by counting the checks");
    assert.equal(fromWords(claimed), checkIds().length, `docs/checks.md says ${claimed}`);
  });

  test("the decision index lists every record, and only real ones", () => {
    // The index is prose about forty-five archives, which is exactly the shape
    // that goes stale silently
    // (`docs/decisions/0045-a-record-says-what-to-do-about-it.md`).
    const dir = path.join(REPO_ROOT, "docs", "decisions");
    const records = fs
      .readdirSync(dir)
      .filter((n) => /^\d{4}-.*\.md$/.test(n))
      .sort();
    const index = fs.readFileSync(path.join(dir, "README.md"), "utf8");

    const missing = records.filter((n) => !index.includes(`(${n})`));
    assert.deepEqual(missing, [], `not in the index: ${missing.join(", ")}`);

    const linked = [...index.matchAll(/\((\d{4}-[a-z0-9-]+\.md)\)/g)].map((m) => m[1]);
    const dangling = linked.filter((n) => !records.includes(n));
    assert.deepEqual(dangling, [], `indexed but absent: ${dangling.join(", ")}`);
  });

  test("the decision record count matches the directory", () => {
    const claimed = Number(/- (\d+) decision records/.exec(readme)?.[1]);
    const actual = fs
      .readdirSync(path.join(REPO_ROOT, "docs", "decisions"))
      .filter((n) => /^\d{4}-.*\.md$/.test(n)).length;
    assert.equal(claimed, actual, `README says ${claimed} records, there are ${actual}`);
  });

  test("every check is in the table its readers use", async () => {
    // Three tables, three readers. The README carries the checks a repository
    // meets by default; the subagent ones are named there as a count and
    // documented in full elsewhere, because the front door is for somebody
    // deciding whether to adopt this (`docs/decisions/0011-two-registers.md`).
    const audit = await import(
      pathToFileURL(path.join(REPO_ROOT, "skill/docbound/scripts/audit.mjs")).href
    );
    const authorIds = audit.AUTHOR_CHECKS.map((c) => c.id);
    const allIds = [...authorIds, ...audit.SUBAGENT_CHECKS.map((c) => c.id)];

    const named = (text, ids) => ids.filter((id) => !text.includes(`\`${id}\``));
    const skill = fs.readFileSync(path.join(REPO_ROOT, "skill/docbound/SKILL.md"), "utf8");
    const reference = fs.readFileSync(path.join(REPO_ROOT, "docs/checks.md"), "utf8");

    assert.deepEqual(named(readme, authorIds), [], "missing from the README table");
    assert.deepEqual(named(skill, allIds), [], "missing from the SKILL.md table");
    assert.deepEqual(named(reference, allIds), [], "missing from docs/checks.md");
  });

  test("every check module is registered with the audit", async () => {
    // A module in the directory that no list imports is a check that never
    // runs, and the fixture assertion above would not notice.
    const audit = await import(
      pathToFileURL(path.join(REPO_ROOT, "skill/docbound/scripts/audit.mjs")).href
    );
    const registered = [...audit.AUTHOR_CHECKS, ...audit.SUBAGENT_CHECKS].map((c) => c.id);
    const unregistered = checkIds().filter((id) => !registered.includes(id));
    assert.deepEqual(unregistered, [], `never run: ${unregistered.join(", ")}`);
  });
});
