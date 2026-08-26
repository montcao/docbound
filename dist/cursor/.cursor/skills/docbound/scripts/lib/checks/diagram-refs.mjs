// A diagram is the first thing a reader trusts and the last thing anyone
// updates. This is `dead-ref` for the boxes: a node that names a path has to
// name a path that exists.
//
// Only path-shaped tokens are checked — a file with a known extension, or a
// directory with a trailing slash — so an ordinary label like `read/write` is
// prose, not a broken reference. That rule is also the convention the template
// demonstrates: in a diagram, name a path the way you would in prose.

import { readText, splitLines } from "../paths.mjs";
import { isPathShaped, pathClaim, resolves } from "../refs.mjs";

export const id = "diagram-refs";
export const level = "error";

const MERMAID_BLOCK = /^```mermaid[^\n]*\n([\s\S]*?)^```/gm;
// Mermaid's own syntax carries no slash: arrows, braces, and pipes all split
// away here, and an HTML break or a URL is refused by `pathClaim`.
const TOKEN_SEPARATORS = /[\s[\]{}()"'|,;]+/;

export function run(ctx) {
  for (const doc of ctx.docs()) {
    const text = readText(ctx.root, doc);
    if (text === null) continue;

    const seen = new Set();
    for (const block of text.matchAll(MERMAID_BLOCK)) {
      for (const line of splitLines(block[1])) {
        const code = line.split("%%")[0];
        for (const token of code.split(TOKEN_SEPARATORS)) {
          if (!isPathShaped(token)) continue;
          const target = pathClaim(token, { trailingSlashIsPath: true });
          if (target === null) continue;
          if (resolves(ctx.root, doc, target)) continue;
          if (seen.has(token)) continue;
          seen.add(token);
          ctx.add(
            id,
            level,
            doc,
            `diagram node names \`${token}\` which does not exist`,
          );
        }
      }
    }
  }
}
