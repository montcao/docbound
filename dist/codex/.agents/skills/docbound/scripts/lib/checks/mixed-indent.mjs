// One file, one indent character. Mixed indentation renders differently in
// every editor, which turns a diff into an argument about whitespace.

import { exists, isSource, readText, splitLines } from "../paths.mjs";

export const id = "mixed-indent";
export const level = "warn";

export function run(ctx) {
  for (const file of [...ctx.changed].sort()) {
    if (!isSource(file, ctx.excludes)) continue;
    if (!exists(ctx.root, file)) continue;

    let tabs = 0;
    let spaces = 0;
    for (const line of splitLines(readText(ctx.root, file) ?? "")) {
      if (line.startsWith("\t")) tabs += 1;
      else if (line.startsWith("  ")) spaces += 1;
    }
    if (tabs && spaces) {
      ctx.add(
        id,
        level,
        file,
        `indents with both tabs (${tabs} lines) and spaces (${spaces} lines)`,
      );
    }
  }
}
