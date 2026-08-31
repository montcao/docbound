#!/usr/bin/env node
// docbound audit. Exit 0 means the task's documentation is complete.
//
// Usage:
//   node audit.mjs [--root .] [--base <ref>] [--mode author|subagent]
//                  [--since <ref>] [--baseline <ref>] [--session-days 2]
//                  [--fast] [--next-adr] [--json]
//
// Change detection: working tree and index against HEAD, unioned with HEAD
// against the merge base of --base (default: origin/main, main, or master,
// whichever exists). With no git repository every file is treated as changed
// and coverage is not evaluated. See `lib/changes.mjs`.
//
// A baseline, from `--baseline` or `audit.baseline` in `.docbound/config.json`,
// replaces the merge base: the change set is everything since that commit, and
// the whole-repository doc checks report only on docs that changed since it.
// That is what makes adopting docbound on an existing repository a first run
// with nothing in it rather than a wall
// (`docs/decisions/0019-adoption-baseline.md`).
//
// Waivers: a line in the current worklog entry of the form
//     waiver: <check-id> [target] - <reason>
// dismisses that check, or that one finding when a target path is given.
//
// The check set, its IDs, and its levels are documented in `docs/checks.md` of
// the docbound repository and in the table in `SKILL.md`. They are a public
// interface: agents write waivers against them.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { detectChanges } from "./lib/changes.mjs";
import { FAST_CHECKS, loadConfig } from "./lib/config.mjs";
import { showFile, topLevel } from "./lib/git.mjs";
import { allDocs } from "./lib/paths.mjs";
import { applyWaivers, partition, toJson, toText } from "./lib/report.mjs";
import { parseWorklog } from "./lib/worklog.mjs";
import { ignoreEpipe, isEntryPoint } from "./lib/entry.mjs";

import * as worklogEntry from "./lib/checks/worklog-entry.mjs";
import * as worklogClosed from "./lib/checks/worklog-closed.mjs";
import * as entryLength from "./lib/checks/entry-length.mjs";
import * as docCoverage from "./lib/checks/doc-coverage.mjs";
import * as newDirReadme from "./lib/checks/new-dir-readme.mjs";
import * as deadRef from "./lib/checks/dead-ref.mjs";
import * as diagramRefs from "./lib/checks/diagram-refs.mjs";
import * as depAdr from "./lib/checks/dep-adr.mjs";
import * as adrShape from "./lib/checks/adr-shape.mjs";
import * as adrImmutable from "./lib/checks/adr-immutable.mjs";
import * as templateResidue from "./lib/checks/template-residue.mjs";
import * as orphanDoc from "./lib/checks/orphan-doc.mjs";
import * as duplicateBlock from "./lib/checks/duplicate-block.mjs";
import * as staleMarker from "./lib/checks/stale-marker.mjs";
import * as restatingComments from "./lib/checks/restating-comments.mjs";
import * as todoShape from "./lib/checks/todo-shape.mjs";
import * as commentSentence from "./lib/checks/comment-sentence.mjs";
import * as openItemTypo from "./lib/checks/open-item-typo.mjs";
import * as openItemForm from "./lib/checks/open-item-form.mjs";
import * as plainOpening from "./lib/checks/plain-opening.mjs";
import * as handoffPresent from "./lib/checks/handoff-present.mjs";
import * as adrSourced from "./lib/checks/adr-sourced.mjs";
import * as inferredOpen from "./lib/checks/inferred-open.mjs";
import * as logicTouched from "./lib/checks/logic-touched.mjs";

// Order is the order findings are reported in. Adding a check is a line here
// and a fixture; see `docs/DEVELOP.md`.
export const AUTHOR_CHECKS = [
  worklogEntry, worklogClosed, entryLength, docCoverage, newDirReadme, deadRef, diagramRefs,
  depAdr,
  adrShape, adrImmutable, templateResidue, orphanDoc, duplicateBlock,
  staleMarker, restatingComments, todoShape, commentSentence,
  openItemTypo, openItemForm, plainOpening,
];
export const SUBAGENT_CHECKS = [
  handoffPresent, adrSourced, inferredOpen, logicTouched,
];

const USAGE = `usage: audit.mjs [--root DIR] [--base REF] [--mode author|subagent]
                 [--since REF] [--baseline REF] [--session-days N] [--fast]
                 [--next-adr] [--json]`;

export function parseArgs(argv) {
  const options = {
    root: null,
    base: null,
    mode: "author",
    since: null,
    baseline: null,
    sessionDays: 2,
    nextAdr: false,
    json: false,
    fast: false,
    help: false,
  };
  const takesValue = {
    "--root": "root",
    "--base": "base",
    "--mode": "mode",
    "--since": "since",
    "--baseline": "baseline",
    "--session-days": "sessionDays",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    if (flag in takesValue) {
      const value = eq === -1 ? argv[++i] : arg.slice(eq + 1);
      if (value === undefined) throw new UsageError(`${flag} needs a value`);
      options[takesValue[flag]] =
        flag === "--session-days" ? Number(value) : value;
    } else if (arg === "--next-adr") {
      options.nextAdr = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--fast") {
      options.fast = true;
    } else if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else {
      throw new UsageError(`unrecognized argument: ${arg}`);
    }
  }

  if (!["author", "subagent"].includes(options.mode)) {
    throw new UsageError(`--mode must be author or subagent, got ${options.mode}`);
  }
  if (!Number.isFinite(options.sessionDays)) {
    throw new UsageError("--session-days must be a number");
  }
  return options;
}

class UsageError extends Error {}

function nextAdrNumber(root) {
  const dir = path.join(root, "docs", "decisions");
  let highest = 0;
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return 1;
  }
  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    const match = /^(\d+)/.exec(name);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return highest + 1;
}

/** Run the checks and return `{ ctx, findings }` without printing anything. */
export function audit(options) {
  const root = resolveRoot(options.root);
  const config = loadConfig(root);
  const excludes = config.audit?.exclude ?? [];

  const baseline = options.baseline ?? config.audit?.baseline ?? null;
  const detected = detectChanges(root, options.base, excludes, baseline);
  const worklog = parseWorklog(root, {
    git: detected.git,
    changed: detected.changed,
    sessionDays: options.sessionDays,
    today: new Date(),
  });

  let docCache = null;
  let scopedDocCache = null;
  const beforeCache = new Map();
  const ctx = {
    root,
    // Unix seconds. Passed in by a caller that needs a fixed clock, so a test
    // can assert on output without the number moving underneath it.
    timestamp: options.timestamp ?? Math.floor(Date.now() / 1000),
    excludes,
    config,
    changed: detected.changed,
    added: detected.added,
    addedDirs: detected.addedDirs,
    git: detected.git,
    ref: detected.ref,
    mode: options.mode,
    since: options.since,
    sessionDays: options.sessionDays,
    topEntry: worklog.topEntry,
    waivers: worklog.waivers,
    worklogProblems: worklog.problems,
    findings: [],
    add(check, level, target, message) {
      this.findings.push({ check, level, path: target, message });
    },
    baseline: detected.baseline,
    /**
     * The docs this change is answerable for.
     *
     * Every doc in the repository, until a baseline is set. With one, only the
     * docs that changed since it: a repository adopting docbound inherits the
     * documentation it already had, and a check that reports every existing
     * flaw on the first run reports nothing anyone can act on.
     */
    docs() {
      if (scopedDocCache !== null) return scopedDocCache;
      const all = this.allDocs();
      scopedDocCache =
        detected.baseline === null
          ? all
          : all.filter((doc) => detected.changed.has(doc));
      return scopedDocCache;
    },
    /** Every doc, whatever the baseline. A corpus, not a set to report on. */
    allDocs() {
      if (docCache === null) docCache = allDocs(root, excludes);
      return docCache;
    },
    beforeVersion(relpath) {
      if (!this.git || !this.ref) return null;
      if (!beforeCache.has(relpath)) {
        beforeCache.set(relpath, showFile(root, this.ref, relpath));
      }
      return beforeCache.get(relpath);
    },
  };

  let checks = [...AUTHOR_CHECKS];
  if (options.mode === "subagent") checks = checks.concat(SUBAGENT_CHECKS);
  if (options.fast) checks = checks.filter((c) => FAST_CHECKS.includes(c.id));
  for (const check of checks) check.run(ctx);

  return { ctx, findings: applyWaivers(ctx.findings, ctx.waivers) };
}

function resolveRoot(requested) {
  if (requested) return path.resolve(requested);
  const top = topLevel(process.cwd());
  return top ? path.resolve(top) : path.resolve(process.cwd());
}

export function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    process.stderr.write(`${USAGE}\naudit.mjs: error: ${err.message}\n`);
    return 2;
  }
  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (options.nextAdr) {
    const root = resolveRoot(options.root);
    process.stdout.write(`${String(nextAdrNumber(root)).padStart(4, "0")}\n`);
    return 0;
  }

  const { ctx, findings } = audit(options);
  const output = options.json ? toJson(ctx, findings) : toText(ctx, findings);
  process.stdout.write(`${output}\n`);
  return partition(findings).errors.length > 0 ? 1 : 0;
}

if (isEntryPoint(import.meta.url)) {
  ignoreEpipe();
  process.exitCode = main(process.argv.slice(2));
}
