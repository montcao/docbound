// A scaffolded doc is not a doc until it says something true. A placeholder
// left in place tells the reader the whole file is unreliable, which
// contaminates the sections that were filled in.
//
// A document that specifies a format writes the same shape on purpose: a repo
// documenting its commit convention writes `<type>(scope): <summary>`, and
// nothing distinguishes that from a placeholder nobody filled in. Guessing
// either way is wrong, so the doc says which with a `docbound-ignore` marker
// (`skill/docbound/scripts/lib/text.mjs`).

import { readText } from "../paths.mjs";
import { stripFences, stripIgnored } from "../text.mjs";

export const id = "template-residue";
export const level = "error";

const PLACEHOLDER = /<[a-z][a-z0-9 /|:'’-]{1,80}>/g;
const HTML_TAGS = new Set([
  "br", "hr", "p", "b", "i", "u", "a", "img", "div", "span", "details",
  "summary", "sub", "sup", "kbd", "code", "pre", "table", "tr", "td", "th",
  "ul", "ol", "li", "em", "strong", "small", "center", "input", "button",
  "script", "style",
]);

export function run(ctx) {
  for (const doc of ctx.docs()) {
    const text = readText(ctx.root, doc);
    if (text === null) continue;
    const hits = [];
    for (const match of stripFences(stripIgnored(text)).matchAll(PLACEHOLDER)) {
      const token = match[0].slice(1, -1).split(/\s+/)[0].toLowerCase();
      if (HTML_TAGS.has(token)) continue;
      hits.push(match[0]);
    }
    if (hits.length === 0) continue;
    const shown = [...new Set(hits.slice(0, 4))].join(", ");
    ctx.add(id, level, doc, `unfilled placeholder(s): ${shown}`);
  }
}
