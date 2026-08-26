// A TODO is a message to a specific future reader about a specific problem.
// Without the problem, the action, and an owner it is a shrug in the source.

import { COMMENT_PREFIX, exists, isSource, readText, splitLines, suffixOf } from "../paths.mjs";

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

    const lines = splitLines(readText(ctx.root, file) ?? "");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.includes(prefix)) continue;
      const match = TODO.exec(line.slice(line.indexOf(prefix) + prefix.length));
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
        `${file}:${i + 1}`,
        `${problems.join("; ")} — \`${line.trim().slice(0, 70)}\``,
      );
    }
  }
}
