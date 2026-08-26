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
  return {
    root,
    project: project(root),
    architecture: architecture(root),
    modules: modules(root, excludes),
    decisions: decisions(root),
    recent: all.slice(0, entries),
    stillOpen: all.flatMap((entry) =>
      entry.stillOpen.map((item) => ({ item, entry: entry.title, date: entry.date })),
    ),
    entryCount: all.length,
    excludes,
  };
}

export function renderOpen(digest) {
  if (digest.stillOpen.length === 0) {
    return "Nothing is recorded as open.\n";
  }
  const lines = ["# Open work", ""];
  const seen = new Set();
  for (const { item, entry, date } of digest.stillOpen) {
    const key = item.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 90);
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`- ${item}`);
    lines.push(`  (${date ?? "undated"}, ${entry})`);
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

  // Only what the entries shown above left open, deduplicated. An item carried
  // across five entries is one piece of unfinished work, not five, and the full
  // history is what `--open` is for.
  const recentOpen = dedupe(
    digest.recent.flatMap((entry) => entry.stillOpen),
  );
  if (recentOpen.length > 0) {
    say("## Still open");
    say();
    for (const item of recentOpen) say(`- ${item}`);
    say();
    const older = digest.stillOpen.length - recentOpen.length;
    if (older > 0) {
      say(`${older} more open item(s) in older entries. Run with --open for all.`);
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

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 90);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
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
    process.stdout.write(
      `---\nAssembled from ${spend.docsRead} document(s), no source read. ` +
        `About ${spend.summaryTokens} tokens here, against roughly ` +
        `${spend.sourceTokens} in the ${spend.sourceFiles} source file(s) an ` +
        "answer from the code would have cost. Both figures are estimates.\n",
    );
  }
  return 0;
}

if (isEntryPoint(import.meta.url)) {
  ignoreEpipe();
  process.exitCode = main(process.argv.slice(2));
}
