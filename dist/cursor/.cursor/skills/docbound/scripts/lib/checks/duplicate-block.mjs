// The same paragraph in two docs means one owner too many. Two copies of a fact
// are one fact and one future lie.

import { readText } from "../paths.mjs";
import { normalizeParagraph, stripFences } from "../text.mjs";

export const id = "duplicate-block";
export const level = "warn";

const SUBSTANTIAL = 160;

export function run(ctx) {
  const seen = new Map();
  const reported = new Set();

  for (const doc of ctx.docs()) {
    if (doc === "docs/WORKLOG.md") continue;
    const text = readText(ctx.root, doc);
    if (text === null) continue;

    for (const para of stripFences(text).split(/\n\s*\n/)) {
      if (/^[#|\-*>]/.test(para.replace(/^\s+/, ""))) continue;
      const key = normalizeParagraph(para);
      if (key.length < SUBSTANTIAL) continue;

      const owner = seen.get(key);
      if (owner !== undefined && owner !== doc) {
        const pair = [owner, doc].sort().join(" ");
        if (!reported.has(pair)) {
          reported.add(pair);
          ctx.add(
            id,
            level,
            doc,
            `paragraph duplicated from \`${owner}\`; keep one and link to it`,
          );
        }
      } else if (owner === undefined) {
        seen.set(key, doc);
      }
    }
  }
}
