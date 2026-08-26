// A backticked path that does not exist is the mechanism by which docs and code
// come untethered: the claim reads as checkable and is not.

import { allDocs, readText } from "../paths.mjs";
import { pathClaim, resolves } from "../refs.mjs";

export const id = "dead-ref";
export const level = "error";

const PATH_REF = /`([^`\s]+)`/g;

export function run(ctx) {
  for (const doc of ctx.docs()) {
    const text = readText(ctx.root, doc);
    if (text === null) continue;
    for (const match of text.matchAll(PATH_REF)) {
      const target = pathClaim(match[1]);
      if (target === null) continue;
      if (resolves(ctx.root, doc, target)) continue;
      ctx.add(id, level, doc, `references \`${match[1]}\` which does not exist`);
    }
  }
}
