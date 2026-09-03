// A record that only explains itself leaves the reader to work out what it
// means for them.
//
// The rest of an ADR is written for somebody deciding whether the decision was
// right. `## What to do` is written for the far commoner reader: somebody who
// found this record while trying to get something done and needs to know
// whether it changes what they are about to do. "Nothing, it is in the build"
// is a complete answer and takes four seconds to write
// (`docs/decisions/0045-a-record-says-what-to-do-about-it.md`).
//
// A warning, not an error. A record missing it is still a record, and blocking
// on the shape of a summary would be a check about formatting rather than about
// whether the reasoning was written down.

import { exists, isAdr, readText } from "../paths.mjs";
import { sectionBody } from "../text.mjs";

export const id = "adr-actionable";
export const level = "warn";

const SECTION = "## What to do";

export function run(ctx) {
  for (const file of [...ctx.added].sort()) {
    if (!isAdr(file)) continue;
    // Records this change added, and no others. An accepted record's body
    // cannot be edited, so asking an old one for a section it was never written
    // with is asking for an edit `adr-immutable` forbids — and a repository
    // adopting docbound with records already in it would open on a finding per
    // record.
    if (!exists(ctx.root, file)) continue;

    const text = readText(ctx.root, file) ?? "";
    const raw = sectionBody(text, SECTION);
    // The section present but unfilled is a scaffolded record, and
    // `template-residue` already reports that file. One cause, one finding
    // (`docs/decisions/0022-report-each-finding-once.md`).
    if (raw !== null && raw.trim() !== "") continue;

    ctx.add(
      id,
      level,
      file,
      `no '${SECTION}' section with content: say in a line what a reader ` +
        "does about this decision, or that there is nothing to do",
    );
  }
}
