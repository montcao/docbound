// A backticked path that does not exist is the mechanism by which docs and code
// come untethered: the claim reads as checkable and is not.
//
// Two levels, because two kinds of token reach here and only one of them is
// unambiguous. `src/pricing.py` and `worker/queue/` say what they are: an
// extension or a trailing slash is a path and nothing else, so a missing one is
// an error. `owner/repo` and `read/write` are a slash between two words, which
// is a path in some documents and English in most. Reporting those at error
// level blocked on prose in the first repository this was pointed at, and a
// blocking check that fires on prose is a check somebody switches off. They are
// warnings: still on the record, no longer in the way.
//
// The two historical documents never block, whatever the token looks like. A
// decision record's body is immutable and the worklog is the log of what
// happened, so a path either one named that has since been deleted cannot be
// fixed: both are describing the world as it was, correctly, and satisfying an
// error would mean editing an archive or falsifying a record. `stale-marker`
// already exempts exactly these two for exactly this reason. This surfaced the
// moment a record about a check outlived the check
// (`docs/decisions/0026-docbound-does-not-recommend-logic.md`).

import { isAdr, readText } from "../paths.mjs";
import { docRoot, isPathShaped, pathClaim, resolves } from "../refs.mjs";
import { stripIgnored } from "../text.mjs";

export const id = "dead-ref";
export const level = "error";

const PATH_REF = /`([^`\s]+)`/g;

/** The two documents that describe the past rather than the present. */
function historical(doc) {
  return isAdr(doc) || doc === "docs/WORKLOG.md";
}

export function run(ctx) {
  for (const doc of ctx.docs()) {
    const raw = readText(ctx.root, doc);
    if (raw === null) continue;
    const text = stripIgnored(raw);
    const anchor = docRoot(raw);

    for (const match of text.matchAll(PATH_REF)) {
      const ref = match[1];
      const target = pathClaim(ref);
      if (target === null) continue;
      if (resolves(ctx.root, doc, target, anchor)) continue;

      if (isPathShaped(ref) && !historical(doc)) {
        ctx.add(id, level, doc, `references \`${ref}\` which does not exist`);
      } else if (isPathShaped(ref)) {
        ctx.add(
          id,
          "warn",
          doc,
          `references \`${ref}\` which no longer exists; this document records ` +
            "what happened and is not rewritten, so it is history rather than a " +
            "defect",
        );
      } else {
        ctx.add(
          id,
          "warn",
          doc,
          `references \`${ref}\`, which reads as a path and does not exist; ` +
            "write the extension or a trailing slash if it is one, and this " +
            "becomes an error",
        );
      }
    }
  }
}
