// Subagent mode only, and only with `--since <coder-commit>`. Naming is the
// coder's first mechanism of communication; a documentation agent that renames
// or restructures is editing the thing it was sent to describe.

import { excluded, exists, isSource, readText, suffixOf } from "../paths.mjs";
import { run as git, showFile } from "../git.mjs";
import { stripComments } from "../text.mjs";

export const id = "logic-touched";
export const level = "warn";

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
    if (stripComments(before, suffix) !== stripComments(after, suffix)) {
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
