// Changelog phrasing in a doc that is supposed to state current truth. The
// worklog is the changelog; everything else is rewritten to be true now.
//
// Vague elapsed time is the same fault with a different surface. "Months ago",
// "recently", "a while back": each states a duration nobody measured, and each
// is wrong the moment the reader arrives at a different time than the writer.
// This project published one, claiming a removal happened months before a
// repository that was twenty-six hours old. Every entry now carries Unix
// seconds, so the number is available to anyone who wants it
// (`docs/decisions/0029-unix-timestamps-for-elapsed-time.md`).

import { isAdr, readText, splitLines } from "../paths.mjs";
import { stripIgnored } from "../text.mjs";

export const id = "stale-marker";
export const level = "warn";

const STALE =
  /\b(TODO:? update|update this section|as of (19|20)\d\d|previously|formerly|used to be|no longer|now uses|now does|coming soon|TBD|to be determined)\b/i;

// A phrase that asserts how much time passed without measuring it. Two days ago
// is checkable against the timestamps and allowed. A while back is not a
// measurement of anything.
//
// Words that merely describe rather than assert a span are deliberately absent.
// Recently, nowadays, and these days all appear in sentences like "what has
// changed recently", which names a section rather than claiming a duration, and
// a check that fires on those is a check somebody turns off.
const VAGUE_AGE =
  /\b(months? ago|weeks? ago|years? ago|a while (ago|back)|some time ago|long ago|ages ago|for a while now|versions? stale|releases? ago|back in the day)\b/i;

export function run(ctx) {
  for (const doc of ctx.docs()) {
    const raw = readText(ctx.root, doc);
    if (raw === null) continue;
    // A document quoting the phrasing it is reporting is not making the claim.
    const text = stripIgnored(raw);
    // The worklog and the decision records are historical by design, so
    // changelog phrasing belongs in them. An unmeasured duration does not: it is
    // a claim about the world that happens to be written in the past tense, and
    // it is as wrong in an archive as anywhere else.
    const historical = doc === "docs/WORKLOG.md" || isAdr(doc);
    // A record's body cannot be edited, so appending a `## Corrections` section
    // is the only thing it is allowed to do about a false statement. Once it
    // has, repeating the finding asks for something that cannot be given. The
    // cost is that one correction quiets the whole file, which is why a record
    // gets a bullet per error rather than one section per record.
    const corrected = isAdr(doc) && /\n#{2,}\s*Corrections\b/.test(text);

    const lines = splitLines(text);
    let reported = false;
    for (let i = 0; i < lines.length && !reported; i += 1) {
      if (!corrected && VAGUE_AGE.test(lines[i])) {
        ctx.add(
          id,
          level,
          `${doc}:${i + 1}`,
          "elapsed time with no number in it; every worklog entry carries " +
            `\`t=\` in Unix seconds, so subtract them: ${lines[i].trim().slice(0, 60)}`,
        );
        reported = true;
      } else if (!historical && STALE.test(lines[i])) {
        ctx.add(
          id,
          level,
          `${doc}:${i + 1}`,
          `changelog-style phrasing: ${lines[i].trim().slice(0, 80)}`,
        );
        reported = true;
      }
    }
  }
}
