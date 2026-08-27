// A TODO is a message to a specific future reader about a specific problem.
// Without the problem, the action, and an owner it is a shrug in the source.

import { COMMENT_PREFIX, exists, isSource, readText, splitLines, suffixOf } from "../paths.mjs";
import { comments } from "../scan.mjs";

export const id = "todo-shape";
export const level = "warn";

const TODO = /\b(TODO|FIXME|XXX|HACK)\b[:\s(]*(.*)/i;
const OWNER = /(@\w+|#\d+|\b[A-Z]{2,}-\d+\b|\([A-Za-z][\w .-]*\)|https?:\/\/)/;
const MIN_WORDS = 6;

export function run(ctx) {
  for (const file of [...ctx.changed].sort()) {
    if (!isSource(file, ctx.excludes)) continue;
    const prefix = COMMENT_PREFIX[suffixOf(file)];
    if (!prefix || !exists(ctx.root, file)) continue;

    for (const { line, body, text } of commentsOf(ctx.root, file)) {
      const match = TODO.exec(body);
      if (!match) continue;

      const rest = match[2].trim();
      const words = (rest.match(/[A-Za-z]+/g) ?? []).length;
      const problems = [];
      if (words < MIN_WORDS) {
        problems.push("fewer than six words — state the problem and the action");
      }
      if (!OWNER.test(rest)) problems.push("no owner, ticket, or reference");
      if (problems.length === 0) continue;

      ctx.add(
        id,
        level,
        `${file}:${line}`,
        `${problems.join("; ")} — \`${text.split("\n")[0].trim().slice(0, 70)}\``,
      );
    }
  }
}

/**
 * Comments only, so a marker inside a string is not read as a TODO.
 *
 * Falls back to scanning lines for the comment prefix when the scanner has no
 * table entry for the language, which is what this check did throughout.
 */
function commentsOf(root, file) {
  const suffix = suffixOf(file);
  const text = readText(root, file) ?? "";
  const scanned = comments(text, suffix);
  if (scanned !== null) return scanned;

  const prefix = COMMENT_PREFIX[suffix];
  if (!prefix) return [];
  const out = [];
  splitLines(text).forEach((raw, index) => {
    if (!raw.includes(prefix)) return;
    out.push({
      line: index + 1,
      body: raw.slice(raw.indexOf(prefix) + prefix.length),
      text: raw,
    });
  });
  return out;
}
