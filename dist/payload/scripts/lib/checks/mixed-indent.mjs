// One file, one indent character. Mixed indentation renders differently in
// every editor, which turns a diff into an argument about whitespace.
//
// Read through the scanner, because a string literal is not indentation. A
// gofmt-clean Go file that embeds a JSON prompt in a raw string has
// space-indented lines inside that string, and counting them called the file
// mixed. Masking the string leaves those lines blank, and a blank line indents
// with nothing (`docs/decisions/0016-span-scanner-not-a-parser.md`).

import { exists, isSource, readText, splitLines, suffixOf } from "../paths.mjs";
import { maskNonCode } from "../scan.mjs";

export const id = "mixed-indent";
export const level = "warn";

export function run(ctx) {
  for (const file of [...ctx.changed].sort()) {
    if (!isSource(file, ctx.excludes)) continue;
    if (!exists(ctx.root, file)) continue;

    const text = readText(ctx.root, file) ?? "";
    // An unknown language falls back to the raw text, which is what this check
    // read throughout, rather than declining to answer.
    const code = maskNonCode(text, suffixOf(file)) ?? text;

    let tabs = 0;
    let spaces = 0;
    for (const line of splitLines(code)) {
      if (line.trim() === "") continue;
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
