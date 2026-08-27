// The first paragraph is the door. A reader who cannot get through it never
// reaches anything behind it, however accurate that is.
//
// The reader this skill writes for is a junior engineer six months from now
// (`skill/docbound/SKILL.md`). The documents were passing every accuracy check
// while opening like this:
//
//   `catalog.LookupProduct` returns a project type string, the lockfile it
//   matched on, and an error when nothing matches.
//
// True, and useful to somebody who already knows the package. Nothing before it
// says what the package is for, so a junior stops there and learns nothing from
// the boundaries and invariants further down, which are the part that would
// have taught them something.
//
// So: one sentence, near the top, with no identifier in it. Not a readability
// score and not a word list. Whether prose is clear is a judgement no check can
// make, but whether a reader was handed a term before a meaning is a fact about
// the text (`docs/decisions/0027-open-plainly-then-go-deep.md`).

import { readText, splitLines } from "../paths.mjs";

export const id = "plain-opening";
export const level = "warn";

const MIN_WORDS = 5;
// Lines that sit above the opening prose rather than being it.
const PREAMBLE = /^(status|owner|maintainer|license|version)\s*:/i;

/**
 * True for the documents a reader arrives at cold.
 *
 * A README at the root of a directory and the architecture document. Matching
 * on the basename rather than the suffix, so a file like `plugin-README.md`,
 * which is a source for a generated one, is not mistaken for a door.
 */
export function opensADocument(doc) {
  return doc === "docs/ARCHITECTURE.md" || doc === "README.md" || doc.endsWith("/README.md");
}

/**
 * The first paragraph after the title, or null when there is none.
 *
 * Badges, HTML comments, and a `Status:` line are skipped: they sit above the
 * opening prose rather than being it.
 */
export function openingParagraph(text) {
  const lines = splitLines(text);
  const paragraph = [];
  let seenTitle = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!seenTitle) {
      if (line.startsWith("# ")) seenTitle = true;
      continue;
    }
    if (paragraph.length === 0) {
      if (line === "") continue;
      if (line.startsWith("<!--") || line.startsWith("!") || PREAMBLE.test(line)) continue;
      // A heading or a list before any prose means the document has no opening.
      if (line.startsWith("#") || line.startsWith("|") || line.startsWith("```")) return null;
      if (line.startsWith("-") || line.startsWith("*")) return null;
    }
    if (line === "") break;
    paragraph.push(line);
  }

  return paragraph.length === 0 ? null : paragraph.join(" ");
}

/** True when some sentence in the paragraph hands the reader no identifier. */
export function hasPlainSentence(paragraph) {
  for (const sentence of paragraph.split(/(?<=[.!?])\s+/)) {
    if (sentence.includes("`")) continue;
    if ((sentence.match(/[A-Za-z]+/g) ?? []).length < MIN_WORDS) continue;
    return true;
  }
  return false;
}

export function run(ctx) {
  for (const doc of ctx.docs()) {
    if (!opensADocument(doc)) continue;
    const text = readText(ctx.root, doc);
    if (text === null) continue;

    const paragraph = openingParagraph(text);
    if (paragraph === null) {
      ctx.add(
        id,
        level,
        doc,
        "opens with no prose; say what this is and who it is for before the " +
          "first heading, list, or table",
      );
      continue;
    }
    if (hasPlainSentence(paragraph)) continue;

    ctx.add(
      id,
      level,
      doc,
      "every sentence in the opening paragraph names something the reader has " +
        "not met yet; add one that says what this is and who it is for, with " +
        "no identifier in it",
    );
  }
}
