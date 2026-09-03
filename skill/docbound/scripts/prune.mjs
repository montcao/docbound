#!/usr/bin/env node
// Move old worklog entries into a dated archive, leaving the recent ones.
//
// The worklog is append-only by design and grows without limit. This project's
// own reached 3,000 lines in five days, and the template's advice to prune after
// a quarter had nothing behind it: no command did it, and no reader was going to
// do it by hand (`docs/decisions/0039-the-ledger-needs-pressure.md`).
//
// Archives are ordinary Markdown under `docs/worklog/`, linked from the top of
// the worklog. Nothing is deleted, so an entry that mattered is one link away.
// Entries holding an open item stay where they are, since `summary --open` and
// the ledger checks read the live file.
//
// Usage:
//   node prune.mjs [--root DIR] [--keep 10] [--dry-run]

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { openItems, worklogEntries } from "./lib/digest.mjs";
import { topLevel } from "./lib/git.mjs";
import { ignoreEpipe, isEntryPoint } from "./lib/entry.mjs";

const WORKLOG = "docs/WORKLOG.md";
const ARCHIVE_DIR = "docs/worklog";
const DEFAULT_KEEP = 10;
const USAGE = "usage: prune.mjs [--root DIR] [--keep N] [--dry-run]";

export function parseArgs(argv) {
  const options = { root: null, keep: DEFAULT_KEEP, dryRun: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const value = () => (eq === -1 ? argv[++i] : arg.slice(eq + 1));
    if (flag === "--root") options.root = value();
    else if (flag === "--keep") options.keep = Number(value());
    else if (flag === "--dry-run") options.dryRun = true;
    else if (flag === "-h" || flag === "--help") options.help = true;
    else return { error: `unrecognized argument: ${arg}` };
  }
  if (!Number.isInteger(options.keep) || options.keep < 1) {
    return { error: "--keep must be a positive whole number" };
  }
  return options;
}

/** The quarter an ISO date falls in, as an archive basename. */
export function quarterOf(iso) {
  const [year, month] = iso.split("-").map(Number);
  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
}

/**
 * Which entries move and which stay.
 *
 * The newest `keep` stay whatever they hold. Older ones stay only while they
 * carry a slug that is still open, because the ledger checks and
 * `summary --open` read the live file and moving an open item would hide it.
 */
export function partition(entries, keep, openSlugs) {
  const stay = [];
  const move = [];
  entries.forEach((entry, index) => {
    const holdsOpen = entry.stillOpen.some((raw) =>
      [...openSlugs].some((slug) => raw.includes(`[${slug}]`)),
    );
    if (index < keep || holdsOpen) stay.push(entry);
    else move.push(entry);
  });
  return { stay, move };
}

export function main(argv) {
  const options = parseArgs(argv);
  if (options.error) {
    process.stderr.write(`${USAGE}\nprune.mjs: ${options.error}\n`);
    return 2;
  }
  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  const root = options.root
    ? path.resolve(options.root)
    : path.resolve(topLevel(process.cwd()) ?? process.cwd());
  const file = path.join(root, WORKLOG);
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    process.stderr.write(`prune.mjs: no ${WORKLOG}\n`);
    return 1;
  }

  const entries = worklogEntries(root);
  const openSlugs = new Set(
    openItems(entries).open.filter((i) => i.slug).map((i) => i.slug),
  );
  const { move } = partition(entries, options.keep, openSlugs);
  if (move.length === 0) {
    process.stdout.write(
      `nothing to prune: ${entries.length} entries, keeping ${options.keep}, ` +
        `${openSlugs.size} still open\n`,
    );
    return 0;
  }

  // Split on the same boundary the parser uses, so an entry moves whole.
  const chunks = text.split(/^## /m);
  const header = chunks[0];
  const bodies = chunks.slice(1).map((c) => `## ${c.replace(/\s+$/, "")}\n`);
  const moveTitles = new Set(move.map((e) => e.title));
  const kept = [];
  const archived = new Map();

  bodies.forEach((body, index) => {
    const entry = entries[index];
    if (!moveTitles.has(entry.title)) {
      kept.push(body);
      return;
    }
    const quarter = quarterOf(entry.date ?? "0000-01-01");
    if (!archived.has(quarter)) archived.set(quarter, []);
    archived.get(quarter).push(body);
  });

  if (options.dryRun) {
    for (const [quarter, list] of archived) {
      process.stdout.write(`would move ${list.length} entries to ${ARCHIVE_DIR}/${quarter}.md\n`);
    }
    return 0;
  }

  fs.mkdirSync(path.join(root, ARCHIVE_DIR), { recursive: true });
  for (const [quarter, list] of archived) {
    const target = path.join(root, ARCHIVE_DIR, `${quarter}.md`);
    const existing = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
    const head = existing || `# Worklog archive ${quarter}\n\nEntries moved out of \`docs/WORKLOG.md\`. Newest first.\n`;
    fs.writeFileSync(target, `${head.replace(/\s+$/, "")}\n\n${list.join("\n")}`);
    process.stdout.write(`  ${ARCHIVE_DIR}/${quarter}.md: ${list.length} entries\n`);
  }

  const links = [...archived.keys()]
    .sort()
    .reverse()
    .map((q) => `- \`${ARCHIVE_DIR}/${q}.md\``);
  const pointer = header.includes(ARCHIVE_DIR)
    ? header
    : `${header.replace(/\s+$/, "")}\n\nOlder entries are archived:\n\n${links.join("\n")}\n\n`;
  fs.writeFileSync(file, `${pointer.replace(/\s+$/, "")}\n\n${kept.join("\n")}`);
  process.stdout.write(`kept the newest ${options.keep} and every entry holding an open item\n`);
  return 0;
}

if (isEntryPoint(import.meta.url)) {
  ignoreEpipe();
  process.exitCode = main(process.argv.slice(2));
}
