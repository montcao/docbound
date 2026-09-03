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
// The historical documents are not read at all. A decision record's body is
// immutable, the worklog and its archives are the log of what happened, and a
// changelog's whole subject is what a version changed, so a path any of them
// named that has since been deleted cannot be fixed: each is describing the
// world as it was, correctly, and satisfying a finding would mean editing an
// archive or falsifying a record. Reporting it anyway produced a warning per
// deleted file per mention, thirty-six of them here, each carrying a message
// that said it was not a defect
// (`docs/decisions/0046-history-is-not-reported-at-all.md`). `stale-marker`
// exempts the same set for the same reason
// (`docs/decisions/0041-the-historical-set-is-every-record-of-the-past.md`).
//
// The message a reader gets has to be one they can act on. Telling somebody to
// "write the extension" on a token that already carries one is advice with no
// action behind it, and it printed thirteen times in this project's own output
// (`docs/decisions/0042-a-known-extension-is-a-path-claim.md`).

import { isHistorical, readText } from "../paths.mjs";
import { docRoot, isPathShaped, pathClaim, resolves } from "../refs.mjs";
import { stripIgnored } from "../text.mjs";

export const id = "dead-ref";
export const level = "error";

const PATH_REF = /`([^`\s]+)`/g;

export function run(ctx) {
  for (const doc of ctx.docs()) {
    if (isHistorical(doc)) continue;
    const raw = readText(ctx.root, doc);
    if (raw === null) continue;
    const text = stripIgnored(raw);
    const anchor = docRoot(raw);

    for (const match of text.matchAll(PATH_REF)) {
      const token = match[1];
      const target = pathClaim(token);
      if (target === null) continue;
      if (resolves(ctx.root, doc, target, anchor)) continue;

      // A finding quotes a fragment of a file, so it is bounded like the other
      // two that do. `SECURITY.md` says how much of a file reaches a transcript
      // by this route, and an unbounded token would make that untrue.
      const ref = token.length > 80 ? `${token.slice(0, 80)}…` : token;

      if (isPathShaped(token)) {
        ctx.add(id, level, doc, `references \`${ref}\` which does not exist`);
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
