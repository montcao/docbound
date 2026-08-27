// An accepted ADR is an archive. Two edits are permitted: the Status line
// (superseded by NNNN, deprecated), and appending a `## Corrections` section at
// the end. Anything else needs a new ADR, because the value of the record is
// what was believed at the time it was written.
//
// Corrections exist because immutability protects the reasoning and not the
// facts. A record here claimed something happened "a week ago" in a repository
// twenty-six hours old. Superseding the record would be wrong, since the
// decision stands; leaving it would keep a false statement in an archive with
// no way to mark it. Errata are how archives have always handled this: the
// original text is never touched, and the correction sits below it with the
// date it was made (`docs/decisions/0029-unix-timestamps-for-elapsed-time.md`).

import { exists, isAdr, readText } from "../paths.mjs";

export const id = "adr-immutable";
export const level = "error";

const STATUS_LINE = /^\s*[-*]?\s*Status:.*$/gm;
// Anchored at the end, so a Corrections section is an append and never a place
// to hide an edit to the body above it.
const CORRECTIONS = /\n#{2,}\s*Corrections\b[\s\S]*$/;

export function run(ctx) {
  for (const file of [...ctx.changed].sort()) {
    if (!isAdr(file) || ctx.added.has(file)) continue;
    if (!exists(ctx.root, file)) continue;

    const before = ctx.beforeVersion(file);
    // Untracked, or no reference commit: `adr-shape` owns new records.
    if (before === null) continue;

    const after = readText(ctx.root, file) ?? "";
    if (comparable(before) !== comparable(after)) {
      ctx.add(
        id,
        level,
        file,
        "existing Architecture Decision Record edited beyond its Status line " +
          "and a trailing Corrections section; a record is an archive, so " +
          "write a superseding record for a changed decision, or append a " +
          "correction for a false statement of fact",
      );
    }
  }
}

function comparable(text) {
  return text.replace(CORRECTIONS, "").replace(STATUS_LINE, "").trim();
}
