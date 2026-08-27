#!/usr/bin/env node
// The gate. This is what turns "the audit is the definition of done" from an
// instruction competing for the agent's attention into something the agent
// cannot finish around.
//
// Two events, deliberately asymmetric:
//
//   after-edit  a fast subset, findings returned as context, never blocking.
//               It fires after every file edit, so its cost is paid constantly
//               and its job is to surface a problem early, not to stop work.
//               It reports each finding once. Repeating the same seventeen
//               findings after every edit fills the transcript with the thing
//               it was already told, which is the cost this project exists to
//               argue against (`docs/decisions/0022-report-each-finding-once.md`).
//   stop        the full audit. On failure it exits 2 with the findings on
//               stderr, which every supported provider treats as "do not stop,
//               and here is why".
//
// Usage:
//   node hook.mjs --event after-edit|stop [--root DIR] [--provider NAME]
//
// Providers deliver their payload on stdin as JSON and differ in what they call
// each field; nothing here reads that payload beyond looking for a working
// directory, because the audit derives everything else from the repository.
//
// Output carries findings only — check id, path, message — and never the buffer
// that was edited: a hook runs on every edit, and that is the most sensitive
// moment in a session to be echoing a file back into a transcript.
//
// Two checks quote a truncated line inside their own message, `todo-shape` and
// `stale-marker`, and those messages pass through here like any other. That is
// the whole of the file content that can reach a transcript by this route.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { audit } from "./audit.mjs";
import { loadConfig } from "./lib/config.mjs";
import { partition } from "./lib/report.mjs";
import { topLevel } from "./lib/git.mjs";
import { isEntryPoint } from "./lib/entry.mjs";

const EVENTS = new Set(["after-edit", "stop"]);
const MAX_REPORTED = 20;
const SEEN_FILE = path.join(".docbound", "cache", "reported.json");
// Findings this session already surfaced, so a long edit sequence does not keep
// restating them. Bounded so a repository with thousands of findings cannot
// grow the file without limit.
const MAX_REMEMBERED = 500;

/** A finding's identity for the purpose of "have I already said this". */
function fingerprint(finding) {
  return `${finding.check}\u0000${finding.path}\u0000${finding.message}`;
}

function readSeen(root) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(root, SEEN_FILE), "utf8"));
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    // No cache, unreadable, or malformed: report everything. Losing the memory
    // costs a repeat; trusting a bad file costs a finding nobody ever sees.
    return new Set();
  }
}

function writeSeen(root, keys) {
  const file = path.join(root, SEEN_FILE);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(keys.slice(-MAX_REMEMBERED)));
  } catch {
    // A read-only or absent working directory is not a reason to fail an edit.
  }
}

/**
 * The findings not reported yet, and the memory to persist.
 *
 * A finding that goes away and comes back is reported again, because the
 * memory is rebuilt from what is currently open rather than accumulated.
 */
export function unreported(seen, errors) {
  const current = errors.map(fingerprint);
  return { fresh: errors.filter((f) => !seen.has(fingerprint(f))), current };
}

export function parseHookArgs(argv) {
  const options = { event: "after-edit", root: null, provider: "unknown" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const value = () => (eq === -1 ? argv[++i] : arg.slice(eq + 1));
    if (flag === "--event") options.event = value();
    else if (flag === "--root") options.root = value();
    else if (flag === "--provider") options.provider = value();
    else if (flag === "-h" || flag === "--help") options.help = true;
  }
  return options;
}

/** One line per finding: check id, path, message. Never file contents. */
export function formatFindings(findings) {
  const shown = findings.slice(0, MAX_REPORTED);
  const lines = shown.map((f) => `  [${f.check}] ${f.path}\n      ${f.message}`);
  if (findings.length > shown.length) {
    lines.push(`  ... and ${findings.length - shown.length} more`);
  }
  return lines.join("\n");
}

export function runHook(options) {
  const root = options.root
    ? path.resolve(options.root)
    : path.resolve(topLevel(process.cwd()) ?? process.cwd());
  const config = loadConfig(root);

  if (config.hook?.enabled === false) return { code: 0, stdout: "", stderr: "" };
  if (!EVENTS.has(options.event)) {
    return {
      code: 2,
      stdout: "",
      stderr: `docbound hook: unknown event ${options.event}\n`,
    };
  }

  const fast = options.event === "after-edit" && config.hook?.fast !== false;
  const { findings } = audit({
    root,
    base: null,
    mode: "author",
    since: null,
    sessionDays: 2,
    fast,
    json: true,
    nextAdr: false,
  });
  const { errors, warnings } = partition(findings);

  if (options.event === "after-edit") {
    const { fresh, current } = unreported(readSeen(root), errors);
    writeSeen(root, current);
    if (fresh.length === 0) return { code: 0, stdout: "", stderr: "" };
    const rest = errors.length - fresh.length;
    const tail = rest > 0 ? ` (${rest} reported earlier)` : "";
    return {
      code: 0,
      stdout:
        `docbound: ${fresh.length} new documentation finding(s) on this ` +
        `change${tail}.\n${formatFindings(fresh)}\n` +
        "Fix them as you go; the full audit runs before this task can end.\n",
      stderr: "",
    };
  }

  // The stop event reports everything still open, so what the edit hook
  // already said is no longer worth suppressing: the memory starts over.
  writeSeen(root, []);

  if (errors.length === 0) {
    const tail = warnings.length > 0 ? ` (${warnings.length} warning(s))` : "";
    return { code: 0, stdout: `docbound: audit passes${tail}.\n`, stderr: "" };
  }
  if (config.hook?.blockOnStop === false) {
    return {
      code: 0,
      stdout:
        `docbound: audit fails with ${errors.length} error(s); blocking is ` +
        `off in .docbound config.\n${formatFindings(errors)}\n`,
      stderr: "",
    };
  }
  return {
    code: 2,
    stdout: "",
    stderr:
      `docbound: the task is not done — the audit reports ${errors.length} ` +
      `error(s).\n${formatFindings(errors)}\n` +
      "Fix each one, or add a `waiver: <check-id> [target] - <reason>` line to " +
      "the Waivers section of the current worklog entry, then continue.\n",
  };
}

export function main(argv) {
  const options = parseHookArgs(argv);
  if (options.help) {
    process.stdout.write(
      "usage: hook.mjs --event after-edit|stop [--root DIR] [--provider NAME]\n",
    );
    return 0;
  }
  let result;
  try {
    result = runHook(options);
  } catch (err) {
    // A hook that throws must not wedge the session: report and stand aside.
    process.stderr.write(`docbound hook: ${err.message}\n`);
    return 0;
  }
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.code;
}

if (isEntryPoint(import.meta.url)) {
  // Providers write their event payload to stdin. Draining it keeps the caller
  // from seeing a broken pipe when nothing here reads it.
  process.stdin.resume();
  process.stdin.on("data", () => {});
  process.stdin.on("end", () => {});
  process.exitCode = main(process.argv.slice(2));
  process.stdin.pause();
}
