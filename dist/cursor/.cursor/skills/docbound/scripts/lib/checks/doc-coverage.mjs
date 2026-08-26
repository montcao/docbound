// A changed source file is covered when, in the same diff, either its own (or
// an ancestor) module README was touched, or a system-level doc — root README,
// ARCHITECTURE, or an ADR — was touched *and names the file or its directory*.
// Touching an unrelated ADR does not cover a file.

import {
  TRIVIAL_LINES,
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
