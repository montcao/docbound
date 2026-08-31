// A worklog entry nobody reads is a worklog entry nobody wrote.
//
// This project's own log reached 3,016 lines across 32 entries in two days, an
// average of 94 lines each, while the skill asked for two to four sentences. An
// instruction did not hold it, so a count does
// (`docs/decisions/0032-worklog-entries-are-short.md`).
//
// The entry is the index. Reasoning belongs in a decision record, which is
// linked from the entry and read when somebody wants it.

import { splitLines } from "../paths.mjs";

export const id = "entry-length";
export const level = "warn";

// Prose lines only. Headings, the Agent line, blank lines, and `Still open`
// bullets are structure or a list, and a task with eight open items is not the
// failure this is about.
const LIMIT = 12;

/** Prose lines in an entry: not headings, not blanks, not list items. */
export function proseLines(entry) {
  return splitLines(entry).filter((raw) => {
    const line = raw.trim();
    if (line === "") return false;
    if (line.startsWith("#")) return false;
    if (line.startsWith("-") || line.startsWith("*")) return false;
    if (line.startsWith("Agent:")) return false;
    if (line.startsWith("<!--")) return false;
    return true;
  }).length;
}

export function run(ctx) {
  if (!ctx.topEntry) return;
  const lines = proseLines(ctx.topEntry);
  if (lines <= LIMIT) return;

  ctx.add(
    id,
    level,
    "docs/WORKLOG.md",
    `${lines} lines of prose in this entry, over ${LIMIT}. An entry says what ` +
      "the task was for and what changed; reasoning goes in a decision record " +
      "and detail is in the diff",
  );
}
