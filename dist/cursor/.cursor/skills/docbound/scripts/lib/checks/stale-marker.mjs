// Changelog phrasing in a doc that is supposed to state current truth. The
// worklog is the changelog; everything else is rewritten to be true now.

import { isAdr, readText, splitLines } from "../paths.mjs";

export const id = "stale-marker";
export const level = "warn";

const STALE =
  /\b(TODO:? update|update this section|as of (19|20)\d\d|previously|formerly|used to be|no longer|now uses|now does|coming soon|TBD|to be determined)\b/i;

export function run(ctx) {
  for (const doc of ctx.docs()) {
    // Both are historical records by design.
    if (doc === "docs/WORKLOG.md" || isAdr(doc)) continue;
    const text = readText(ctx.root, doc);
    if (text === null) continue;

    const lines = splitLines(text);
    for (let i = 0; i < lines.length; i += 1) {
      if (!STALE.test(lines[i])) continue;
      ctx.add(
        id,
        level,
        `${doc}:${i + 1}`,
        `changelog-style phrasing: ${lines[i].trim().slice(0, 80)}`,
      );
      break;
    }
  }
}
