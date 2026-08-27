// Two findings from one pass: commented-out code, which version control
// already has, and comment fragments, which read as notes to self rather than
// as sentences addressed to a reader.
//
// A run of adjacent comment lines is judged as one comment, because that is
// what a reader reads. Judging each line separately made the continuation of a
// wrapped sentence a fragment, which is every wrapped paragraph in every file
// (`docs/decisions/0016-span-scanner-not-a-parser.md`).
//
// A directive and a line of commented-out code end a run rather than joining
// it. Neither is prose, and swallowing one into the paragraph beside it changes
// what that paragraph appears to say.

import { COMMENT_PREFIX, exists, isSource, isTest, readText, suffixOf } from "../paths.mjs";
import { comments } from "../scan.mjs";
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
const MIN_BODY = 12;

/** Every comment as `{ line, body }`, from the scanner or from the old path. */
function commentsOf(text, suffix) {
  const scanned = comments(text, suffix);
  if (scanned !== null) return scanned.map(({ line, body }) => ({ line, body }));

  const prefix = COMMENT_PREFIX[suffix];
  if (!prefix) return null;
  return commentLines(text, prefix).map(([line, body]) => ({ line, body }));
}

/**
 * Classify each comment, then group the prose ones that sit on adjacent lines.
 *
 * Classification comes first so that a directive or a fossil breaks a run
 * instead of being absorbed into it.
 */
export function runsOf(entries) {
  const fossils = [];
  const runs = [];
  let current = null;

  const flush = () => {
    if (current) runs.push(current);
    current = null;
  };

  for (const entry of entries) {
    const body = entry.body ?? "";
    const skip =
      body.length < MIN_BODY ||
      DIRECTIVE.some((d) => body.startsWith(d)) ||
      ["=", ",", "\\"].includes(body.slice(-1));
    if (skip) {
      flush();
      continue;
    }
    if (CODE_LIKE.test(body) && !PROSE.test(body)) {
      fossils.push(entry.line);
      flush();
      continue;
    }
    // A multi-line block comment is already one unit; a line comment joins the
    // run above it only when it is the very next line.
    if (current && entry.line === current.nextLine) {
      current.body += ` ${body}`;
      current.nextLine = entry.line + lineCount(body);
      continue;
    }
    flush();
    current = { line: entry.line, body, nextLine: entry.line + lineCount(body) };
  }
  flush();
  return { fossils, runs };
}

function lineCount(body) {
  return body.split("\n").length;
}

export function run(ctx) {
  for (const file of [...ctx.changed].sort()) {
    if (!isSource(file, ctx.excludes) || isTest(file)) continue;
    if (!exists(ctx.root, file)) continue;

    const entries = commentsOf(readText(ctx.root, file) ?? "", suffixOf(file));
    if (entries === null) continue;

    const { fossils, runs } = runsOf(entries);
    const fragments = runs.filter((r) => !isSentence(r.body)).map((r) => r.line);

    if (fossils.length > 0) {
      ctx.add(
        id,
        level,
        `${file}:${fossils[0]}`,
        `${fossils.length} line(s) look like commented-out code; delete — ` +
          "version control has it",
      );
    }
    if (runs.length >= 3 && fragments.length / runs.length > 0.5) {
      ctx.add(
        id,
        level,
        `${file}:${fragments[0]}`,
        `${fragments.length}/${runs.length} comments are not complete sentences ` +
          "(capital letter, terminal punctuation)",
      );
    }
  }
}

function isSentence(body) {
  const flat = body.replace(/\s+/g, " ").trim();
  if (!flat) return false;
  return opensAsSentence(flat) && TERMINAL.includes(flat.slice(-1));
}

function opensAsSentence(body) {
  const first = body[0];
  const upper = first !== first.toLowerCase() && first === first.toUpperCase();
  return upper || /[0-9]/.test(first) || "\"'`".includes(first);
}
