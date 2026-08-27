#!/usr/bin/env node
// Close a tracked open item, by slug.
//
// Creating a slug costs nothing. Reusing one costs remembering an exact string,
// and a slug typed slightly wrong opens a second item rather than continuing
// the first, with nothing to say so. This refuses a slug that is not already
// open and prints the ones that are, which turns that silent failure into a
// message naming the alternatives.
//
// Usage:
//   node close.mjs <slug> "what happened" [--root DIR]
//
// The closing line is appended to the newest entry's `Still open` section,
// because closing something is part of the task that closed it. The worklog
// stays the only record: nothing here writes state anywhere else.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { openItems, worklogEntries } from "./lib/digest.mjs";
import { ignoreEpipe, isEntryPoint } from "./lib/entry.mjs";
import { readText, splitLines } from "./lib/paths.mjs";
import { topLevel } from "./lib/git.mjs";

const WORKLOG = path.join("docs", "WORKLOG.md");
const USAGE = 'usage: close.mjs <slug> "what happened" [--root DIR]';

export function parseArgs(argv) {
  const options = { slug: null, note: null, root: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    if (flag === "--root") options.root = eq === -1 ? argv[++i] : arg.slice(eq + 1);
    else if (arg === "-h" || arg === "--help") options.help = true;
    else if (arg.startsWith("-")) return { error: `unrecognized argument: ${arg}` };
    else if (options.slug === null) options.slug = arg;
    else if (options.note === null) options.note = arg;
    else return { error: "more than one note given; quote the whole thing" };
  }
  if (options.help) return options;
  if (!options.slug) return { error: "a slug is required" };
  if (!options.note) return { error: "say what happened, in quotes" };
  return options;
}

/**
 * Append a bullet to the newest entry's `Still open` section.
 *
 * Inserted at the end of the section rather than the start, so the order of an
 * entry's items is the order they were written, which is what a reader of the
 * history expects.
 */
export function appendToStillOpen(text, bullet) {
  const lines = splitLines(text);
  let start = -1;
  let entriesSeen = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith("## ")) {
      entriesSeen += 1;
      // The second entry heading is the start of the previous task, so the
      // newest entry has no such section.
      if (entriesSeen > 1) break;
      continue;
    }
    if (entriesSeen === 1 && lines[i].replace(/\s+$/, "") === "### Still open") {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("### ") || lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }
  while (end > start + 1 && lines[end - 1].trim() === "") end -= 1;

  lines.splice(end, 0, bullet);
  return `${lines.join("\n")}\n`;
}

export function main(argv) {
  const options = parseArgs(argv);
  if (options.error) {
    process.stderr.write(`${USAGE}\nclose.mjs: error: ${options.error}\n`);
    return 2;
  }
  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  const root = options.root
    ? path.resolve(options.root)
    : path.resolve(topLevel(process.cwd()) ?? process.cwd());
  const existing = readText(root, WORKLOG);
  if (existing === null) {
    process.stderr.write(`close.mjs: ${WORKLOG} does not exist.\n`);
    return 1;
  }

  const entries = worklogEntries(root);
  const { open, closed } = openItems(entries);
  const isOpen = open.some((item) => item.slug === options.slug);

  if (!isOpen) {
    const already = closed.find((item) => item.slug === options.slug);
    if (already) {
      process.stderr.write(
        `close.mjs: [${options.slug}] was already closed on ` +
          `${already.closed.date ?? "an undated entry"}: ${already.closed.note}\n`,
      );
      return 1;
    }
    const names = open
      .filter((item) => item.slug)
      .map((item) => item.slug)
      .sort();
    process.stderr.write(
      `close.mjs: no open item is tagged [${options.slug}].\n` +
        (names.length > 0
          ? `Open slugs:\n${names.map((n) => `  ${n}`).join("\n")}\n`
          : "Nothing is tagged open in this worklog.\n"),
    );
    return 1;
  }

  const updated = appendToStillOpen(
    existing,
    `- [${options.slug}] closed: ${options.note}`,
  );
  if (updated === null) {
    process.stderr.write(
      "close.mjs: the newest entry has no `### Still open` section to write to.\n",
    );
    return 1;
  }

  fs.writeFileSync(path.join(root, WORKLOG), updated);
  process.stdout.write(`closed [${options.slug}] in ${WORKLOG}\n`);
  return 0;
}

if (isEntryPoint(import.meta.url)) {
  ignoreEpipe();
  process.exitCode = main(process.argv.slice(2));
}
