// A scaffolded doc is not a doc until it says something true. A placeholder left
// in place tells the reader the whole file is unreliable, which contaminates the
// sections that were filled in.
//
// Matched against the exact vocabulary the templates ship, not against a shape.
// A shape rule cannot tell `<module name>` from `Promise<void>`, `<section>`, or
// `<username>`, and it reported all three: pointed at a repository that had
// never run scaffold, this check blocked on ordinary prose
// (`docs/decisions/0033-template-residue-is-a-closed-set.md`).
//
// `tests/scaffold.test.mjs` asserts this list still matches the templates, so a
// new placeholder in a template cannot silently stop being checked.

import { readText } from "../paths.mjs";
import { stripFences, stripIgnored } from "../text.mjs";

export const id = "template-residue";
export const level = "error";

const ANGLE_TOKEN = /<([a-z][^<>]{0,80})>/g;

export const PLACEHOLDERS = new Set([
  "active | experimental | deprecated \u2014 and what that means for a reader",
  "alternative",
  "branch or \"n/a\"",
  "check-id",
  "chosen",
  "claude | codex | gemini | copilot | other",
  "closed: and what happened",
  "component",
  "condition",
  "delete the line if the root README owner applies",
  "gap \u2014 condition, consequence, why not fixed",
  "module",
  "module name",
  "name",
  "option A",
  "option B",
  "other components, via what mechanism",
  "path",
  "path/",
  "person, team, or channel a reader should contact",
  "project name",
  "reason",
  "reason a reviewer would accept",
  "slug",
  "slug from an earlier entry",
  "symbol",
  "task title, as a verb phrase",
  "the command that runs the tests",
  "the command that starts it, or the entry point",
  "the data or behavior it is the single authority for",
  "unix seconds, from `date +%s`",
  "what",
  "what you deliberately left out, and why",
  "what you did not settle, and why",
  "who depends on it",
  "why it is open",
  "why read it first / this is the API",
]);

export function run(ctx) {
  for (const doc of ctx.docs()) {
    const text = readText(ctx.root, doc);
    if (text === null) continue;
    const hits = [];
    for (const match of stripFences(stripIgnored(text)).matchAll(ANGLE_TOKEN)) {
      if (!PLACEHOLDERS.has(match[1])) continue;
      hits.push(match[0]);
    }
    if (hits.length === 0) continue;
    const shown = [...new Set(hits.slice(0, 4))].join(", ");
    ctx.add(id, level, doc, `unfilled placeholder(s): ${shown}`);
  }
}
