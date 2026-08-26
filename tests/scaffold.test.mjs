// Scaffold creates what is missing and nothing else.
//
// The property that matters most here is that it never overwrites: scaffold is
// run on repositories that already have some documentation, and a bootstrap
// step that destroys a hand-written README is one nobody runs twice.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, describe, test } from "node:test";

import {
  SCAFFOLD,
  SKILL_DIR,
  removeTree,
  runAudit,
  runNode,
  tempDir,
} from "./harness.mjs";

const made = [];
after(() => {
  for (const dir of made) removeTree(dir);
});

function bareProject() {
  const dir = tempDir("scaffold");
  made.push(dir);
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(path.join(dir, "src", "app.py"), "def main():\n    return 0\n");
  fs.mkdirSync(path.join(dir, "docs-site"));
  fs.writeFileSync(path.join(dir, "docs-site", "index.html"), "<p>not source</p>\n");
  return dir;
}

describe("scaffold", () => {
  test("creates the structure from templates", () => {
    const dir = bareProject();
    const result = runNode(SCAFFOLD, ["--root", dir]);
    assert.equal(result.status, 0, result.stderr);

    for (const rel of [
      "README.md",
      "docs/ARCHITECTURE.md",
      "docs/WORKLOG.md",
      "docs/decisions/0001-adopt-docbound.md",
      "src/README.md",
    ]) {
      assert.ok(fs.existsSync(path.join(dir, rel)), `${rel} was created`);
    }
  });

  test("skips a directory with no source in it", () => {
    const dir = bareProject();
    runNode(SCAFFOLD, ["--root", dir]);
    assert.ok(!fs.existsSync(path.join(dir, "docs-site", "README.md")));
  });

  test("never overwrites", () => {
    const dir = bareProject();
    fs.writeFileSync(path.join(dir, "README.md"), "# mine\n");
    const result = runNode(SCAFFOLD, ["--root", dir]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(dir, "README.md"), "utf8"), "# mine\n");
  });

  test("a second run creates nothing", () => {
    const dir = bareProject();
    runNode(SCAFFOLD, ["--root", dir]);
    const second = runNode(SCAFFOLD, ["--root", dir]);
    assert.match(second.stdout, /nothing to create/);
  });

  test("--dry-run writes no files", () => {
    const dir = bareProject();
    const result = runNode(SCAFFOLD, ["--root", dir, "--dry-run"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /would create README\.md/);
    assert.ok(!fs.existsSync(path.join(dir, "README.md")));
  });

  test("a missing root is a usage error", () => {
    const result = runNode(SCAFFOLD, ["--root", path.join(tempDir("gone"), "nope")]);
    assert.equal(result.status, 2);
  });

  test("the adoption record backticks the audit only when it is inside the repo", () => {
    const outside = bareProject();
    runNode(SCAFFOLD, ["--root", outside]);
    const adr = fs.readFileSync(
      path.join(outside, "docs/decisions/0001-adopt-docbound.md"),
      "utf8",
    );
    assert.match(adr, /the skill's scripts\/audit\.mjs/);
    assert.ok(
      !adr.includes("`" + SKILL_DIR),
      "a path outside the repository is never backticked, or dead-ref would fire on it",
    );

    const inside = tempDir("scaffold-inside");
    made.push(inside);
    fs.cpSync(SKILL_DIR, path.join(inside, ".agents/skills/docbound"), { recursive: true });
    fs.mkdirSync(path.join(inside, "src"));
    fs.writeFileSync(path.join(inside, "src", "app.py"), "def main():\n    return 0\n");
    runNode(path.join(inside, ".agents/skills/docbound/scripts/scaffold.mjs"), [
      "--root",
      inside,
    ]);
    const insideAdr = fs.readFileSync(
      path.join(inside, "docs/decisions/0001-adopt-docbound.md"),
      "utf8",
    );
    assert.match(insideAdr, /`\.agents\/skills\/docbound\/scripts\/audit\.mjs`/);
    assert.ok(
      fs.existsSync(path.join(inside, ".agents/skills/docbound/scripts/audit.mjs")),
      "the backticked path exists, which is what dead-ref checks",
    );
  });

  test("a scaffolded repository fails the audit on its placeholders", () => {
    const dir = bareProject();
    runNode(SCAFFOLD, ["--root", dir]);
    const { json, status } = runAudit(dir);
    assert.equal(status, 1);
    const checks = new Set(json.errors.map((f) => f.check));
    assert.ok(checks.has("template-residue"), "the placeholders are the finding");
  });
});
