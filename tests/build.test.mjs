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

import { REPO_ROOT, removeTree, tempDir } from "./harness.mjs";
import { build, buildPlugin, collectPayload, hashFiles } from "../scripts/build.mjs";
import { checkDistFresh, compareTrees, listTree } from "../scripts/check-dist-fresh.mjs";
import { PROVIDERS } from "../cli/providers.mjs";

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

  test("the payload is identical for every provider", () => {
    const dir = buildInto();
    const payloads = PROVIDERS.map((provider) =>
      hashFiles(listTree(path.join(dir, "dist", provider.name, provider.payload))),
    );
    assert.equal(new Set(payloads).size, 1, "one payload, seven placements");
  });

  test("each provider gets its own hook manifest and nothing else differs", () => {
    const dir = buildInto();
    for (const provider of PROVIDERS) {
      const root = path.join(dir, "dist", provider.name);
      assert.ok(fs.existsSync(path.join(root, provider.payload, "SKILL.md")));
      if (provider.hookFile) {
        const manifest = JSON.parse(
          fs.readFileSync(path.join(root, provider.hookFile), "utf8"),
        );
        const commands = JSON.stringify(manifest);
        assert.ok(commands.includes(`${provider.payload}/scripts/hook.mjs`));
        assert.ok(commands.includes("--event stop"));
      }
    }
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
    const skillFile = [...stale.keys()].find((f) => f.endsWith("/SKILL.md"));
    stale.set(skillFile, Buffer.from("a line the build did not produce\n"));

    const problems = compareTrees(stale, rebuilt);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^stale: /);
  });

  test("a file the build no longer produces is a difference", () => {
    const rebuilt = listTree(path.join(buildInto(), "dist"));
    const withExtra = new Map(rebuilt);
    withExtra.set("universal/.agents/skills/docbound/LEFTOVER.md", Buffer.from("x"));

    const problems = compareTrees(withExtra, rebuilt);
    assert.deepEqual(problems, [
      "not produced by the build: universal/.agents/skills/docbound/LEFTOVER.md",
    ]);
  });

  test("a missing file is a difference", () => {
    const rebuilt = listTree(path.join(buildInto(), "dist"));
    const missing = new Map(rebuilt);
    const dropped = [...missing.keys()].find((f) => f.endsWith("/SKILL.md"));
    missing.delete(dropped);

    const problems = compareTrees(missing, rebuilt);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^missing from the commit: /);
  });
});
