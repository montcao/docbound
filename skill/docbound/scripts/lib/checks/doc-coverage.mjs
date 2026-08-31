// A changed source file is covered when, in the same diff, either its own (or
// an ancestor) module README was touched, or a system-level doc — root README,
// ARCHITECTURE, or an ADR — was touched *and names the file or its directory*.
// Touching an unrelated ADR does not cover a file.
//
// A file whose edit touched only comments and docstrings is skipped. There is no
// contract change to document, so demanding a doc for one blocks a typo fix and
// teaches people to turn the gate off
// (`docs/decisions/0031-comment-edits-need-no-doc.md`).

import { logicOf } from "../scan.mjs";
import {
  TRIVIAL_LINES,
  suffixOf,
  exists,
  isDoc,
  isSource,
  isTest,
  nonblankLines,
  parentOf,
  readText,
} from "../paths.mjs";

export const id = "doc-coverage";
export const level = "error";

export function run(ctx) {
  if (!ctx.git) return;

  const changedDocs = new Set(
    [...ctx.changed].filter(
      (c) => isDoc(c, ctx.excludes) && exists(ctx.root, c),
    ),
  );
  const systemText = [];
  for (const doc of changedDocs) {
    const isSystem =
      doc === "README.md" ||
      doc === "docs/ARCHITECTURE.md" ||
      doc.startsWith("docs/decisions/");
    if (isSystem) systemText.push(readText(ctx.root, doc) ?? "");
  }

  for (const file of [...ctx.changed].sort()) {
    if (!isSource(file, ctx.excludes) || isTest(file)) continue;
    // A deleted file needs no covering doc; `dead-ref` owns removals.
    if (!exists(ctx.root, file)) continue;
    if (nonblankLines(ctx.root, file) <= TRIVIAL_LINES) continue;
    if (commentsOnly(ctx, file)) continue;

    let covered = false;
    let parent = parentOf(file);
    while (parent !== "." && parent !== "") {
      if (changedDocs.has(`${parent}/README.md`)) {
        covered = true;
        break;
      }
      parent = parentOf(parent);
    }
    if (covered) continue;

    const dir = parentOf(file);
    const mentions = dir === "." ? [file] : [file, `${dir}/`];
    if (systemText.some((text) => mentions.some((m) => text.includes(m)))) {
      continue;
    }

    ctx.add(
      id,
      level,
      file,
      "changed with no covering doc in the diff: touch its module README, or " +
        "a system doc (root README, ARCHITECTURE, an ADR) that names this " +
        "file or its directory",
    );
  }
}

/**
 * True when the only difference from the reference commit is documentation.
 *
 * False when there is nothing to compare against: a new file, an untracked
 * tree, or a language the scanner cannot read all answer "not known to be
 * comment-only", which keeps the check demanding a doc rather than excusing one.
 */
function commentsOnly(ctx, file) {
  const before = ctx.beforeVersion(file);
  if (before === null) return false;
  const after = readText(ctx.root, file);
  if (after === null) return false;
  const suffix = suffixOf(file);
  return logicOf(before, suffix) === logicOf(after, suffix);
}
