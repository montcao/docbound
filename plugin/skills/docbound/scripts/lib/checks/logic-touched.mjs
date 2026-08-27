// Subagent mode only, and only with `--since <coder-commit>`. Naming is the
// coder's first mechanism of communication; a documentation agent that renames
// or restructures is editing the thing it was sent to describe.

import { excluded, exists, isSource, readText, suffixOf } from "../paths.mjs";
import { run as git, showFile } from "../git.mjs";
import { maskDocumentation } from "../scan.mjs";
import { stripComments } from "../text.mjs";

export const id = "logic-touched";
export const level = "warn";

/**
 * The file with its documentation removed, for comparing two revisions.
 *
 * The scanner knows a comment marker inside a string from a comment, which the
 * regular expression it replaces does not: a Python line reading
 * `URL = "https://x/#f"  # note` kept its trailing comment, so rewording that
 * comment read as a logic change and this check accused a subagent of an edit
 * the contract allows.
 *
 * A language the scanner has no table entry for falls back to that regular
 * expression, which is what this check used before and is still better than
 * refusing to answer.
 */
export function logicOf(text, suffix) {
  return maskDocumentation(text, suffix) ?? stripComments(text, suffix);
}

export function run(ctx) {
  if (!ctx.git || !ctx.since) return;

  const diff = git(["diff", "--name-only", ctx.since], ctx.root) ?? "";
  const untracked =
    git(["ls-files", "--others", "--exclude-standard"], ctx.root) ?? "";
  const files = new Set([...diff.split(/\s+/), ...untracked.split(/\s+/)]);

  for (const file of [...files].filter(Boolean).sort()) {
    if (!isSource(file, ctx.excludes) || excluded(file, ctx.excludes)) continue;

    const before = showFile(ctx.root, ctx.since, file);
    if (before === null) {
      ctx.add(id, level, file, "new source file created by the documentation subagent");
      continue;
    }
    if (!exists(ctx.root, file)) {
      ctx.add(id, level, file, "source file deleted by the documentation subagent");
      continue;
    }

    const after = readText(ctx.root, file) ?? "";
    const suffix = suffixOf(file);
    if (logicOf(before, suffix) !== logicOf(after, suffix)) {
      ctx.add(
        id,
        level,
        file,
        "changed beyond comments and docstrings since the coder's end state; " +
          "the subagent may not touch logic, names, or tests",
      );
    }
  }
}
