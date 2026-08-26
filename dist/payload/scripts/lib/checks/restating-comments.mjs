// A comment that restates the line beneath it has spent the reader's last
// resort on nothing. The threshold is a majority of a file's comments, so one
// unavoidable restatement is not a finding.

import { COMMENT_PREFIX, exists, isSource, isTest, readText, splitLines, suffixOf } from "../paths.mjs";
import { overlap, tokens } from "../text.mjs";

export const id = "restating-comments";
export const level = "warn";

const SKIP_BODY = ["!", "type:", "noqa", "pragma", "eslint", "TODO", "FIXME"];

export function run(ctx) {
  for (const file of [...ctx.changed].sort()) {
    if (!isSource(file, ctx.excludes) || isTest(file)) continue;
    const prefix = COMMENT_PREFIX[suffixOf(file)];
    if (!prefix || !exists(ctx.root, file)) continue;

    const lines = splitLines(readText(ctx.root, file) ?? "");
    let total = 0;
    let restating = 0;

    for (let i = 0; i < lines.length; i += 1) {
      const st = lines[i].trim();
      const isHeading = prefix === "#" && st.startsWith(`${prefix}${prefix} `);
      if (!st.startsWith(prefix) || isHeading) continue;

      const body = st.slice(prefix.length).trim();
      if (body.length < 8 || SKIP_BODY.some((s) => body.startsWith(s))) continue;

      // The comment describes either the code after it or the enclosing
      // definition before it; compare against both.
      let nearby = "";
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j += 1) {
        if (lines[j].trim() && !lines[j].trim().startsWith(prefix)) {
          nearby += ` ${lines[j]}`;
          break;
        }
      }
      for (let j = i - 1; j > Math.max(i - 3, -1); j -= 1) {
        if (lines[j].trim() && !lines[j].trim().startsWith(prefix)) {
          nearby += ` ${lines[j]}`;
          break;
        }
      }

      const commentTokens = tokens(body);
      if (commentTokens.size === 0 || !nearby.trim()) continue;
      total += 1;
      if (overlap(commentTokens, tokens(nearby)) >= 0.5) restating += 1;
    }

    if (total >= 3 && restating / total > 0.6) {
      ctx.add(
        id,
        level,
        file,
        `${restating}/${total} comments restate the adjacent code; comments ` +
          "should explain why",
      );
    }
  }
}
