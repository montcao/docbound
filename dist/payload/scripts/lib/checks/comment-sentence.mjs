// Two findings from one pass: commented-out code, which version control
// already has, and comment fragments, which read as notes to self rather than
// as sentences addressed to a reader.

import { COMMENT_PREFIX, exists, isSource, isTest, readText, suffixOf } from "../paths.mjs";
import { commentLines } from "../text.mjs";

export const id = "comment-sentence";
export const level = "warn";

const DIRECTIVE = [
  "!", "type:", "noqa", "pragma", "eslint", "pylint", "fmt:", "nolint", "-*-",
  "coding", "TODO", "FIXME", "XXX", "HACK", "@",
];
const CODE_LIKE =
  /(=[^=]|\bdef\b|\bfunc\b|\breturn\b|\bif\b.*[:{]|[;{}]\s*$|\)\s*$|\w+\(.*\)|\bimport\b|\bconst\b|\blet\b|\bvar\b)/;
const PROSE = /\b(the|a|an|this|because|so|when|if we|since)\b/;
const TERMINAL = ".!?:)";

export function run(ctx) {
  for (const file of [...ctx.changed].sort()) {
    if (!isSource(file, ctx.excludes) || isTest(file)) continue;
    const prefix = COMMENT_PREFIX[suffixOf(file)];
    if (!prefix || !exists(ctx.root, file)) continue;

    const fossils = [];
    const fragments = [];
    let total = 0;

    for (const [lineNumber, body] of commentLines(readText(ctx.root, file) ?? "", prefix)) {
      if (body.length < 12) continue;
      if (DIRECTIVE.some((d) => body.startsWith(d))) continue;
      if (["=", ",", "\\"].includes(body.slice(-1))) continue;

      if (CODE_LIKE.test(body) && !PROSE.test(body)) {
        fossils.push(lineNumber);
        continue;
      }
      total += 1;
      if (!opensAsSentence(body) || !TERMINAL.includes(body.slice(-1))) {
        fragments.push(lineNumber);
      }
    }

    if (fossils.length > 0) {
      ctx.add(
        id,
        level,
        `${file}:${fossils[0]}`,
        `${fossils.length} line(s) look like commented-out code; delete — ` +
          "version control has it",
      );
    }
    if (total >= 3 && fragments.length / total > 0.5) {
      ctx.add(
        id,
        level,
        `${file}:${fragments[0]}`,
        `${fragments.length}/${total} comments are not complete sentences ` +
          "(capital letter, terminal punctuation)",
      );
    }
  }
}

function opensAsSentence(body) {
  const first = body[0];
  const upper = first !== first.toLowerCase() && first === first.toUpperCase();
  return upper || /[0-9]/.test(first) || "\"'`".includes(first);
}
