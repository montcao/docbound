#!/usr/bin/env node
// Open a worklog entry, before the first edit.
//
// The shape of an entry is structure, not judgement, and an agent hand-writing
// it spends attention on a heading and a date that a command can produce
// identically every time. Hand-written headings are also why this project's own
// worklog mixed an em dash into one heading and hyphens into the rest, which
// the summary parser then had to tolerate. A hyphen, matching
// `templates/WORKLOG-entry.md` and the majority of this project's own entries,
// so a worklog holding entries from both this command and `scaffold` reads as
// one document.
//
// The sections come from `templates/WORKLOG-entry.md`, so the template stays
// the one place that decides which sections an entry has. Their guidance text
// is stripped: a section left holding its own instructions is what
// `template-residue` exists to catch, and there is no reason to create the
// finding here only to make the agent clear it.
//
// Usage:
//   node start.mjs "Add rate limiting" [--root DIR] [--agent NAME] [--force]
//
// It refuses when the newest entry has an empty Outcome, because that entry is
// a task nobody closed, and stacking a second one on top of it is how a worklog
// stops being a record of what happened. --force says you meant it.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { entrySection, filled } from "./lib/worklog.mjs";
import { ignoreEpipe, isEntryPoint } from "./lib/entry.mjs";
import { run, topLevel } from "./lib/git.mjs";
import { readText, splitLines } from "./lib/paths.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(path.dirname(HERE), "templates", "WORKLOG-entry.md");
const WORKLOG = path.join("docs", "WORKLOG.md");

const USAGE =
  'usage: start.mjs "Add rate limiting" [--root DIR] [--agent NAME] [--force]';

// Sections an entry opens with. Outcome and Still open are written at the end,
// and the two optional ones are left out rather than created empty: a heading
// with nothing under it tells the reader the document is unreliable.
const OPENING = ["Intent", "Expected to touch", "Unknowns going in"];
const CLOSING = ["Outcome", "Still open"];

export function parseArgs(argv) {
  const options = { title: null, root: null, agent: null, force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const value = () => (eq === -1 ? argv[++i] : arg.slice(eq + 1));
    if (flag === "--root") options.root = value();
    else if (flag === "--agent") options.agent = value();
    else if (flag === "--force") options.force = true;
    else if (flag === "-h" || flag === "--help") options.help = true;
    else if (arg.startsWith("-")) return { error: `unrecognized argument: ${arg}` };
    else if (options.title === null) options.title = arg;
    else return { error: "more than one title given; quote the whole thing" };
  }
  if (!options.help && !options.title) return { error: "a task title is required" };
  return options;
}

/** Which sections the template defines, so this file does not decide that. */
export function templateSections() {
  const text = fs.readFileSync(TEMPLATE, "utf8");
  return splitLines(text)
    .filter((line) => line.startsWith("### "))
    .map((line) => line.slice(4).trim());
}

export function renderEntry({ title, date, agent, branch }) {
  const known = templateSections();
  const lines = [
    `## ${date} - ${title}`,
    "",
    `Agent: ${agent} · Branch: ${branch}`,
    "",
  ];
  for (const section of [...OPENING, ...CLOSING]) {
    if (!known.includes(section)) continue;
    lines.push(`### ${section}`, "");
  }
  return lines.join("\n");
}

/** The newest entry, or null when the worklog has none yet. */
export function topEntry(text) {
  const parts = text.split(/^## /m);
  return parts.length < 2 ? null : `## ${parts[1]}`;
}

export function insert(worklogText, entry) {
  const firstEntry = worklogText.search(/^## /m);
  if (firstEntry === -1) return `${worklogText.replace(/\s*$/, "")}\n\n${entry}`;
  return `${worklogText.slice(0, firstEntry)}${entry}\n${worklogText.slice(firstEntry)}`;
}

export function main(argv) {
  const options = parseArgs(argv);
  if (options.error) {
    process.stderr.write(`${USAGE}\nstart.mjs: error: ${options.error}\n`);
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
  const existing = readText(root, WORKLOG);
  if (existing === null) {
    process.stderr.write(
      `start.mjs: ${WORKLOG} does not exist. Run \`docbound scaffold\` first.\n`,
    );
    return 1;
  }

  const previous = topEntry(existing);
  if (previous && !options.force && !filled(entrySection(previous, "Outcome"))) {
    const heading = splitLines(previous)[0].replace(/^##\s*/, "");
    process.stderr.write(
      `start.mjs: the newest entry has no Outcome yet:\n  ${heading}\n` +
        "Close it before opening another, or pass --force if you meant to.\n",
    );
    return 1;
  }

  const branch = (run(["rev-parse", "--abbrev-ref", "HEAD"], root) ?? "").trim();
  const entry = renderEntry({
    title: options.title,
    date: new Date().toISOString().slice(0, 10),
    agent: options.agent ?? "agent",
    branch: branch || 'n/a',
  });

  fs.writeFileSync(file, insert(existing, entry));
  process.stdout.write(
    `opened ${WORKLOG}: ${options.title}\nWrite Intent before the first edit.\n`,
  );
  return 0;
}

if (isEntryPoint(import.meta.url)) {
  ignoreEpipe();
  process.exitCode = main(process.argv.slice(2));
}
