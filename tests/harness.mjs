// Fixture plumbing shared by the test files.
//
// A fixture is a directory holding `setup.sh`, which builds a git repository in
// `$FIXTURE_DIR`, and `expected.json`, which states the check IDs and counts the
// audit must produce. The harness never inspects the repository itself: what a
// fixture asserts is the audit's output, so a fixture that stops reproducing its
// scenario shows up as a changed finding rather than as a silent pass.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.dirname(TESTS_DIR);
export const FIXTURES_DIR = path.join(TESTS_DIR, "fixtures");
export const SKILL_DIR = path.join(REPO_ROOT, "skill", "docbound");
export const AUDIT = path.join(SKILL_DIR, "scripts", "audit.mjs");
export const SCAFFOLD = path.join(SKILL_DIR, "scripts", "scaffold.mjs");
export const CLI = path.join(REPO_ROOT, "cli", "index.mjs");

export function fixtureNames() {
  return fs
    .readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => fs.existsSync(path.join(FIXTURES_DIR, name, "setup.sh")))
    .sort();
}

export function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `docbound-${prefix}-`));
}

/**
 * Run a fixture's `setup.sh` and return `{ repo, args }`: the built repository
 * and the extra audit flags the fixture asked for.
 */
export function buildFixture(name) {
  const work = tempDir(name);
  const repo = path.join(work, "repo");
  const meta = path.join(work, "meta");
  fs.mkdirSync(repo);
  fs.mkdirSync(meta);

  const setup = path.join(FIXTURES_DIR, name, "setup.sh");
  const result = spawnSync("bash", [setup], {
    encoding: "utf8",
    env: {
      ...process.env,
      FIXTURE_DIR: repo,
      FIXTURE_META: meta,
      FIXTURE_LIB: path.join(FIXTURES_DIR, "_base.sh"),
      SKILL_DIR,
      // A fixture that shells out to node must find the node running the tests.
      PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}`,
    },
  });
  if (result.status !== 0) {
    throw new Error(`fixture ${name} setup failed:\n${result.stdout}${result.stderr}`);
  }

  const argsFile = path.join(meta, "args");
  const args = fs.existsSync(argsFile)
    ? fs.readFileSync(argsFile, "utf8").trim().split(/\s+/).filter(Boolean)
    : [];
  return { work, repo, meta, args };
}

export function expectedFor(name) {
  const file = path.join(FIXTURES_DIR, name, "expected.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function runNode(script, args, options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    ...options,
  });
}

export function runAudit(repo, args = []) {
  const result = runNode(AUDIT, ["--root", repo, "--json", ...args]);
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `audit produced no JSON (exit ${result.status})\n${result.stdout}\n${result.stderr}`,
    );
  }
  return { ...result, json: parsed };
}

/** `{ checkId: count }` for one level's findings, the shape `expected.json` uses. */
export function countByCheck(findings) {
  const counts = {};
  for (const finding of findings) {
    counts[finding.check] = (counts[finding.check] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort());
}

export function removeTree(target) {
  fs.rmSync(target, { recursive: true, force: true });
}
