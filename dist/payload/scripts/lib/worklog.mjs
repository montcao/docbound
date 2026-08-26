// Reading the worklog entry that governs this audit run.
//
// The top entry is the whole of the audit's memory of the task: its date
// decides whether an entry was opened for this session, its Outcome and Still
// open decide whether the task was closed, its Handoff is the documentation
// subagent's only source of stated reasoning, and its Waivers section is the
// one place a finding can be dismissed on the record.

import { readText, splitLines } from "./paths.mjs";

export const WORKLOG_PATH = "docs/WORKLOG.md";

/** Section body between `### <name>` and the next `### ` heading. */
export function entrySection(entry, name) {
  const lines = splitLines(entry);
  const heading = `### ${name}`;
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (start === -1) {
      if (lines[i].replace(/\s+$/, "") === heading) start = i + 1;
    } else if (lines[i].startsWith("### ")) {
      return lines.slice(start, i).join("\n").trim();
    }
  }
  return start === -1 ? "" : lines.slice(start).join("\n").trim();
}

/** True when a section says something once template placeholders are removed. */
export function filled(text) {
  let stripped = text;
  // Placeholders nest one or two deep in the templates; four passes flattens
  // anything the templates actually contain.
  for (let i = 0; i < 4; i += 1) stripped = stripped.replace(/<[^<>]*>/g, "");
  return /[\p{L}\p{N}_]/u.test(stripped);
}

const WAIVER_RE =
  /^\s*(?:[-*]\s*)?waiver:\s*([a-z-]+)\s*([^\s—-][^—]*?)?\s*[—-]{1,2}\s*(.+)$/;

/**
 * Parse the worklog once. Returns the top entry, its waivers, and the problems
 * the `worklog-entry` and `worklog-closed` checks report, in the order the
 * reference implementation reports them.
 */
export function parseWorklog(root, { git, changed, sessionDays, today }) {
  const problems = [];
  const waivers = [];
  const text = readText(root, WORKLOG_PATH);

  if (text === null) {
    problems.push({
      check: "worklog-entry",
      message: "missing; open an entry from templates/WORKLOG-entry.md",
    });
    return { topEntry: null, waivers, problems };
  }

  if (git && !changed.has(WORKLOG_PATH)) {
    problems.push({
      check: "worklog-entry",
      message:
        "not modified in this change set; open a new entry for this task " +
        "before editing code",
    });
  }

  const entries = text.split(/^## /m);
  if (entries.length < 2) {
    problems.push({
      check: "worklog-entry",
      message: "no entries; open one before the first edit",
    });
    return { topEntry: null, waivers, problems };
  }

  const topEntry = `## ${entries[1]}`;
  const dated = /^## (\d{4}-\d{2}-\d{2})/.exec(topEntry);
  if (!dated) {
    problems.push({
      check: "worklog-entry",
      message: "top entry has no ISO date in its heading",
    });
  } else {
    const age = ageInDays(dated[1], today);
    if (age === null) {
      problems.push({
        check: "worklog-entry",
        message: "top entry date is not a valid ISO date",
      });
    } else if (age > sessionDays || age < -1) {
      problems.push({
        check: "worklog-entry",
        message:
          `top entry is dated ${dated[1]} (${age}d old); ` +
          "open a new entry for this task",
      });
    }
  }

  for (const name of ["Outcome", "Still open"]) {
    if (!filled(entrySection(topEntry, name))) {
      problems.push({
        check: "worklog-closed",
        message: `'${name}' section of the top entry is empty or still a placeholder`,
      });
    }
  }

  for (const line of splitLines(entrySection(topEntry, "Waivers"))) {
    const match = WAIVER_RE.exec(line.trim());
    if (!match) continue;
    waivers.push({
      check: match[1],
      target: match[2] ? match[2].trim() : null,
      reason: match[3].trim(),
    });
  }

  return { topEntry, waivers, problems };
}

/** Whole days between an ISO date and today, or null when the date is invalid. */
function ageInDays(iso, today = new Date()) {
  const [year, month, day] = iso.split("-").map(Number);
  const stamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(stamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((now - stamp) / 86_400_000);
}
