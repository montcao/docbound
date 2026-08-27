#!/usr/bin/env node
// What this repository is, assembled from the documents the audit keeps true.
//
// This is step 1 of the loop, Orient, done in one command instead of by hand.
// It reads the root README, ARCHITECTURE, the module READMEs, the decision
// records, and the worklog, and it reads no source file at all.
//
// That is the whole point. A summary reconstructed from code recovers what the
// code does and never why it is that way, because the why was never in the
// source. The documents hold it.
//
// Usage:
//   node summary.mjs [--root DIR] [--entries N] [--open] [--json]
//
//   --entries N   how many worklog entries to include, five by default
//   --open        only the unfinished work, across every entry
//   --json        the same content as data
//
// The output describes the project and nothing else. This project makes no claim
// here about what it saved anyone, because that would rest on a counterfactual
// nobody measured. What it reads is checkable, and a test checks it.
//
// A repository with no documentation is told so plainly, along with the files
// that were looked for and the command that creates them.

import process from "node:process";
import path from "node:path";

import { loadConfig } from "./lib/config.mjs";
import {
  architecture,
  decisions,
  missing,
  modules,
  openItems,
  project,
  worklogEntries,
} from "./lib/digest.mjs";
import { ignoreEpipe, isEntryPoint } from "./lib/entry.mjs";
import { topLevel } from "./lib/git.mjs";

const USAGE =
  "usage: summary.mjs [--root DIR] [--entries N] [--open] [--json]";
const DEFAULT_ENTRIES = 5;

export function parseArgs(argv) {
  const options = {
    root: null,
    entries: DEFAULT_ENTRIES,
    open: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const value = () => (eq === -1 ? argv[++i] : arg.slice(eq + 1));
    if (flag === "--root") options.root = value();
    else if (flag === "--entries") options.entries = Number(value());
    else if (flag === "--open") options.open = true;
    else if (flag === "--json") options.json = true;
    else if (flag === "-h" || flag === "--help") options.help = true;
    else return { error: `unrecognized argument: ${arg}` };
  }
  if (!Number.isFinite(options.entries) || options.entries < 0) {
    return { error: "--entries must be a number" };
  }
  return options;
}

export function collect(root, { entries = DEFAULT_ENTRIES } = {}) {
  const excludes = loadConfig(root).audit?.exclude ?? [];
  const all = worklogEntries(root);
  const tracked = openItems(all);
  return {
    root,
    project: project(root),
    architecture: architecture(root),
    modules: modules(root, excludes),
    decisions: decisions(root),
    recent: all.slice(0, entries),
    stillOpen: tracked.open,
    closed: tracked.closed,
    entryCount: all.length,
    excludes,
  };
}

export function renderOpen(digest) {
  if (digest.stillOpen.length === 0) {
    return "Nothing is recorded as open.\n";
  }
  const lines = ["# Open work", ""];
  for (const item of digest.stillOpen) {
    lines.push(`- ${item.slug ? `[${item.slug}] ` : ""}${item.text}`);
    const carried = item.mentions > 1 ? `, restated ${item.mentions} times` : "";
    lines.push(`  (opened ${item.date ?? "undated"}: ${item.entry}${carried})`);
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * How long ago an entry was opened, from the Unix seconds it carries.
 *
 * Empty when the entry has no timestamp, which is every entry written before
 * the field existed. An absent age reads as unknown; a guessed one reads as
 * fact, and this project has already published a guessed one
 * (`docs/decisions/0029-unix-timestamps-for-elapsed-time.md`).
 */
export function ageOf(entry, now) {
  if (typeof entry.timestamp !== "number") return "";
  const seconds = now - entry.timestamp;
  if (seconds < 0) return "";
  if (seconds < 3600) return ` (${Math.floor(seconds / 60)}m ago)`;
  if (seconds < 172800) return ` (${Math.floor(seconds / 3600)}h ago)`;
  return ` (${Math.floor(seconds / 86400)}d ago)`;
}

export function render(digest, now = Math.floor(Date.now() / 1000)) {
  const lines = [];
  const say = (line = "") => lines.push(line);
  const nothing = thin(digest);

  say(`# ${digest.project?.name ?? path.basename(digest.root)}`);
  say();
  if (digest.project?.purpose) {
    say(digest.project.purpose);
    say();
  }

  if (digest.architecture) {
    say("## Shape");
    say();
    if (digest.architecture.summary) {
      say(digest.architecture.summary);
      say();
    }
    if (digest.architecture.diagram) {
      say("```mermaid");
      say(digest.architecture.diagram);
      say("```");
      say();
    }
  }

  if (digest.modules.length > 0) {
    say("## Modules");
    say();
    for (const module of digest.modules) {
      say(`### ${module.directory}`);
      say();
      if (module.purpose) say(module.purpose);
      // The bullets already open with "Must not"; the heading carries the rest.
      if (module.mustNot.length > 0) say("Must not:");
      for (const rule of module.mustNot) say(`- ${rule}`);
      if (module.gaps.length > 0) say("Known gaps:");
      for (const gap of module.gaps) say(`- ${gap}`);
      say();
    }
  }

  const invariants = [
    ...(digest.project?.invariants ?? []),
    ...(digest.architecture?.invariants ?? []),
  ];
  if (invariants.length > 0) {
    say("## Invariants");
    say();
    for (const invariant of invariants) say(`- ${invariant}`);
    say();
  }

  if (digest.architecture?.gaps.length > 0) {
    say("## Known gaps");
    say();
    for (const gap of digest.architecture.gaps) say(`- ${gap}`);
    say();
  }

  if (digest.decisions.length > 0) {
    say("## Decisions");
    say();
    for (const decision of digest.decisions) {
      say(`- ${decision.title}`);
      say(`  Status: ${decision.status}. ${decision.file}`);
      if (decision.reverses) say(`  Reverses if: ${decision.reverses}`);
    }
    say();
  }

  if (digest.recent.length > 0) {
    say(`## Recent work (${digest.recent.length} of ${digest.entryCount} entries)`);
    say();
    for (const entry of digest.recent) {
      say(`### ${entry.date ?? "undated"}${ageOf(entry, now)} ${entry.title}`);
      say();
      if (entry.outcome) say(entry.outcome);
      say();
    }
  }

  // One line per piece of unfinished work, not one per time it was mentioned.
  // A slug makes that exact. An untagged note cannot be followed across
  // entries, so it is shown while its entry is still in view and counted after
  // that, rather than being restated forever as a separate item.
  const shown = new Set(digest.recent.map((entry) => entry.title));
  const tracked = digest.stillOpen.filter((item) => item.slug !== null);
  const notes = digest.stillOpen.filter((item) => item.slug === null);
  const recentNotes = notes.filter((item) => shown.has(item.entry));

  const older = notes.length - recentNotes.length;
  if (tracked.length > 0 || recentNotes.length > 0 || older > 0) {
    say("## Still open");
    say();
    for (const item of tracked) say(`- [${item.slug}] ${item.text}`);
    for (const item of recentNotes) say(`- ${item.text}`);
    if (tracked.length > 0 || recentNotes.length > 0) say();
    if (older > 0) {
      say(
        `${older} untagged note(s) in older entries, which cannot be followed ` +
          "across entries. Run with --open for all of them, and see " +
          "`docs/decisions/0013-tagged-open-items.md` for the convention that " +
          "makes them trackable.",
      );
      say();
    }
  }

  const absent = missing(digest.root, digest);
  if (absent.length > 0) {
    say(nothing ? "## Nothing to summarise" : "## Not found");
    say();
    if (nothing) {
      say(
        "This repository has no documentation for docbound to read, so there " +
          "is nothing above. That is a report about the repository rather than " +
          "a failure of this command.",
      );
      say();
    }
    say("Looked for and did not find:");
    say();
    for (const item of absent) say(`- ${item}`);
    say();
    say(
      "`docbound scaffold` creates the structure, and `docbound audit` says " +
        "what is still missing once it exists.",
    );
    say();
  }

  return lines.join("\n");
}

/** Nothing docbound reads exists here, so the summary has no subject. */
function thin(digest) {
  return (
    digest.modules.length === 0 &&
    digest.decisions.length === 0 &&
    digest.entryCount === 0 &&
    digest.architecture === null &&
    digest.project === null
  );
}

export function main(argv) {
  const options = parseArgs(argv);
  if (options.error) {
    process.stderr.write(`${USAGE}\nsummary.mjs: error: ${options.error}\n`);
    return 2;
  }
  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  const root = options.root
    ? path.resolve(options.root)
    : path.resolve(topLevel(process.cwd()) ?? process.cwd());
  const digest = collect(root, { entries: options.entries });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(digest, null, 2)}\n`);
    return 0;
  }

  const body = options.open ? renderOpen(digest) : render(digest);
  process.stdout.write(body);

  return 0;
}

if (isEntryPoint(import.meta.url)) {
  ignoreEpipe();
  process.exitCode = main(process.argv.slice(2));
}
