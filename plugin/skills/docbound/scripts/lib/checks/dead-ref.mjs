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

import { readText } from "../paths.mjs";
import { docRoot, isPathShaped, pathClaim, resolves } from "../refs.mjs";
import { stripIgnored } from "../text.mjs";

export const id = "dead-ref";
export const level = "error";

const PATH_REF = /`([^`\s]+)`/g;

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

      if (isPathShaped(ref)) {
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
