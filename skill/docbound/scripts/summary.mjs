#!/usr/bin/env node
// What this repository is, assembled from the documents the audit keeps true.
//
// This is step 1 of the loop, Orient, done in one command instead of by hand.
// It reads the root README, ARCHITECTURE, the module READMEs, the decision
// records, and the worklog. It reads no source file at all, which is the whole
// point: asking an agent what a project does normally costs a re-read of the
// tree, and answers with a reconstruction that can recover what the code does
// and never why it is that way. The documents hold the why, and they are a
// rounding error next to the source.
//
// Usage:
//   node summary.mjs [--root DIR] [--entries N] [--open] [--json]
//
//   --entries N   how many worklog entries to include (default 5)
//   --open        only the unfinished work, across every entry
//   --json        the same content as data
//
// A repository that has not adopted the discipline produces a thin summary, and
// the output says so rather than padding it. That is a true answer about the
// state of its documentation.

import process from "node:process";
import path from "node:path";

import { loadConfig } from "./lib/config.mjs";
import {
  architecture,
  cost,
  decisions,
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

export function render(digest) {
  const lines = [];
  const say = (line = "") => lines.push(line);

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
      say(`### ${entry.date ?? "undated"} ${entry.title}`);
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

  if (thin(digest)) {
    say("## Note");
    say();
    say(
      "This repository has little documentation for this to read, so the " +
        "summary above is thin. That is an accurate report of its state rather " +
        "than a failure of the command. `docbound scaffold` lays down the " +
        "structure and `docbound audit` says what is missing.",
    );
    say();
  }

  return lines.join("\n");
}

function thin(digest) {
  return (
    digest.modules.length === 0 &&
    digest.decisions.length === 0 &&
    digest.entryCount === 0
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

  if (!options.open) {
    const spend = cost(root, body, digest.excludes);
    // The comparison is the point of the line, and on a repository small enough
    // that reading the source is cheaper it is not a comparison worth drawing.
    const worthComparing = spend.sourceTokens > spend.summaryTokens * 2;
    process.stdout.write(
      worthComparing
        ? `---\nAssembled from ${spend.docsRead} document(s), no source read. ` +
            `About ${spend.summaryTokens} tokens here, against roughly ` +
            `${spend.sourceTokens} in the ${spend.sourceFiles} source file(s) ` +
            "an answer from the code would have cost. Both figures are " +
            "estimates.\n"
        : `---\nAssembled from ${spend.docsRead} document(s), no source read.\n`,
    );
  }
  return 0;
}

if (isEntryPoint(import.meta.url)) {
  ignoreEpipe();
  process.exitCode = main(process.argv.slice(2));
}
