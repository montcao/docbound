// What kind of span is this character in.
//
// A state machine over the text, driven by the delimiter table in
// `languages.mjs`. Code, line comment, block comment, or string. That is the
// whole question, and it is the one four checks currently answer with regular
// expressions that cannot tell a comment marker inside a string from a comment
// (`docs/decisions/0016-span-scanner-not-a-parser.md`).
//
// Nothing here builds a tree. There is no grammar, no precedence, no error
// recovery. A check that needs any of those needs a real parser, and that is a
// different package.
//
// Three properties are requirements rather than niceties, because this runs
// from a hook after every file edit, over source from repositories nobody here
// has read:
//
//   * every iteration advances `i`, so no input loops forever
//   * the loop compares strings at an index and runs no backtracking-capable
//     pattern, so no input makes it hang
//   * input above `MAX_BYTES` is declined rather than scanned
//
// Declining returns null. Callers fall back to the line-based path, which is
// what they did before this existed.

import { resolve } from "./languages.mjs";
import { suffixOf } from "./paths.mjs";

/** Two megabytes of source is a generated file, and not what a check is about. */
export const MAX_BYTES = 2_000_000;

export const CODE = "code";
export const LINE_COMMENT = "line";
export const BLOCK_COMMENT = "block";
export const STRING = "string";

/**
 * Spans covering the whole text, in order, with no gaps.
 *
 * Returns null when the language is unknown or the input is too large, which
 * the caller reads as "use the old path" rather than as an error.
 */
export function scan(text, suffix) {
  const spec = resolve(suffix);
  if (spec === null) return null;
  if (text.length > MAX_BYTES) return null;

  const spans = [];
  let kind = CODE;
  let start = 0;
  let depth = 0;
  let closer = null;
  let stringSpec = null;
  let i = 0;

  let openedBy = null;
  const close = (end, next) => {
    if (end > start) spans.push({ kind, start, end, doc: openedBy?.doc === true });
    kind = next;
    start = end;
    openedBy = null;
  };

  while (i < text.length) {
    if (kind === CODE) {
      const block = openerAt(text, i, spec.block, (b) => b[0]);
      if (block) {
        close(i, BLOCK_COMMENT);
        closer = block[1];
        depth = 1;
        i += block[0].length;
        continue;
      }
      const line = openerAt(text, i, spec.line, (l) => l);
      if (line) {
        close(i, LINE_COMMENT);
        i += line.length;
        continue;
      }
      const string = openerAt(text, i, spec.strings, (s) => s.open);
      if (string) {
        close(i, STRING);
        stringSpec = string;
        openedBy = string;
        i += string.open.length;
        continue;
      }
      i += 1;
      continue;
    }

    if (kind === LINE_COMMENT) {
      if (text[i] === "\n") {
        close(i, CODE);
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }

    if (kind === BLOCK_COMMENT) {
      // Nesting is checked before closing, so `/* /* */ */` in Rust needs both
      // closers and the first one does not end the outer comment.
      if (spec.blockNests) {
        const nested = spec.block.find((b) => text.startsWith(b[0], i) && b[1] === closer);
        if (nested) {
          depth += 1;
          i += nested[0].length;
          continue;
        }
      }
      if (text.startsWith(closer, i)) {
        depth -= 1;
        i += closer.length;
        if (depth === 0) close(i, CODE);
        continue;
      }
      i += 1;
      continue;
    }

    // STRING.
    if (stringSpec.escape && text.startsWith(stringSpec.escape, i)) {
      // Skip the escape and whatever it escapes, so an escaped quote does not
      // close the string and a trailing backslash cannot run past the end.
      i += Math.min(stringSpec.escape.length + 1, text.length - i);
      continue;
    }
    if (!stringSpec.multiline && text[i] === "\n") {
      // Unterminated. Ending it at the line break keeps one stray quote from
      // swallowing the rest of the file.
      close(i, CODE);
      i += 1;
      continue;
    }
    if (text.startsWith(stringSpec.close, i)) {
      i += stringSpec.close.length;
      close(i, CODE);
      continue;
    }
    i += 1;
  }

  if (text.length > start) {
    spans.push({ kind, start, end: text.length, doc: openedBy?.doc === true });
  }
  return spans;
}

function openerAt(text, i, candidates, openerOf) {
  for (const candidate of candidates) {
    if (text.startsWith(openerOf(candidate), i)) return candidate;
  }
  return null;
}

/**
 * The text with every non-code span blanked, keeping length and line breaks.
 *
 * Blanking rather than deleting is what keeps offsets and line numbers matching
 * the original file, so a pattern run over the result reports a location a
 * reader can open. Returns null when the language is unknown.
 */
export function maskNonCode(text, suffix) {
  const spans = scan(text, suffix);
  if (spans === null) return null;

  const out = [];
  for (const span of spans) {
    const piece = text.slice(span.start, span.end);
    out.push(span.kind === CODE ? piece : blank(piece));
  }
  return out.join("");
}

function blank(piece) {
  let out = "";
  for (const ch of piece) out += ch === "\n" ? "\n" : " ";
  return out;
}

/**
 * The text with documentation blanked and everything else kept.
 *
 * Comments always, plus strings a language uses as docstrings. An ordinary
 * string literal survives, because changing one is a logic change and blanking
 * it would hide exactly what a caller comparing two revisions is looking for.
 *
 * Blank runs are collapsed and empty lines dropped, so rewording a comment does
 * not change the result. Without that, a mask preserves the comment's length
 * and a longer sentence reads as a different program.
 */
export function maskDocumentation(text, suffix) {
  const spans = scan(text, suffix);
  if (spans === null) return null;

  const out = [];
  for (const span of spans) {
    const piece = text.slice(span.start, span.end);
    const isDocumentation =
      span.kind === LINE_COMMENT ||
      span.kind === BLOCK_COMMENT ||
      (span.kind === STRING && span.doc);
    out.push(isDocumentation ? blank(piece) : piece);
  }

  return out
    .join("")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Comment spans only, with the line each starts on and its body.
 *
 * `body` is the comment without its opener, closer, or the decorative asterisks
 * a block comment carries down its left edge, because every caller wants what
 * the comment says rather than how it was delimited.
 */
export function comments(text, suffix) {
  const spec = resolve(suffix);
  const spans = scan(text, suffix);
  if (spans === null) return null;

  return spans
    .filter((span) => span.kind === LINE_COMMENT || span.kind === BLOCK_COMMENT)
    .map((span) => {
      const raw = text.slice(span.start, span.end);
      return {
        ...span,
        line: lineOf(text, span.start),
        text: raw,
        body: bodyOf(raw, span.kind, spec),
      };
    });
}

function bodyOf(raw, kind, spec) {
  if (kind === LINE_COMMENT) {
    for (const opener of spec.line) {
      if (raw.startsWith(opener)) return raw.slice(opener.length).trim();
    }
    return raw.trim();
  }
  let inner = raw;
  for (const [open, close] of spec.block) {
    if (inner.startsWith(open)) {
      inner = inner.slice(open.length);
      if (inner.endsWith(close)) inner = inner.slice(0, -close.length);
      break;
    }
  }
  return inner
    .split("\n")
    .map((line) => line.replace(/^\s*\*+\s?/, "").trim())
    .join("\n")
    .trim();
}

/** Names this file defines, read from masked code so prose cannot supply one. */
export function definitions(text, suffix) {
  const spec = resolve(suffix);
  if (spec === null) return null;
  const masked = maskNonCode(text, suffix);
  if (masked === null) return null;

  const found = new Map();
  for (const pattern of spec.define) {
    // A fresh regex per use: a shared one carries `lastIndex` between calls.
    const scoped = new RegExp(pattern.source, pattern.flags);
    let match = scoped.exec(masked);
    while (match !== null) {
      const name = match[1];
      if (name && !found.has(name)) found.set(name, lineOf(masked, match.index));
      if (scoped.lastIndex === match.index) scoped.lastIndex += 1;
      match = scoped.exec(masked);
    }
  }
  return [...found].map(([name, line]) => ({ name, line }));
}

/** True when this file appears to define `name`. Null when nothing is known. */
export function defines(text, suffix, name) {
  const found = definitions(text, suffix);
  if (found === null) return null;
  return found.some((entry) => entry.name === name);
}

/** Whether the scanner knows anything about this file's language. */
export function scannable(relpath) {
  return resolve(suffixOf(relpath)) !== null;
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === "\n") line += 1;
  }
  return line;
}
