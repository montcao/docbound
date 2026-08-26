// The repo's own limit if it sets one, else 80. Convention beats preference,
// so the check reads the repository's linter and formatter config first.

import { exists, isSource, isTest, readText, splitLines, suffixOf } from "../paths.mjs";
import { expandTabs } from "../text.mjs";

export const id = "line-length";
export const level = "warn";

const DEFAULT_LIMIT = 80;
const MIN_LONG_LINES = 3;
const MAX_LONG_FRACTION = 0.05;
const JS_LIKE = new Set([
  ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs", ".vue", ".svelte",
]);

export function run(ctx) {
  for (const file of [...ctx.changed].sort()) {
    if (!isSource(file, ctx.excludes) || isTest(file)) continue;
    const suffix = suffixOf(file);
    // gofmt sets no limit; SQL is habitually wide.
    if (suffix === ".go" || suffix === ".sql") continue;
    if (!exists(ctx.root, file)) continue;

    const limit = configuredLineLength(ctx.root, suffix);
    const lines = splitLines(readText(ctx.root, file) ?? "");
    const long = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (expandTabs(lines[i]).length > limit && !lines[i].includes("http")) {
        long.push(i + 1);
      }
    }

    const tooMany =
      lines.length > 0 &&
      long.length >= MIN_LONG_LINES &&
      long.length / lines.length > MAX_LONG_FRACTION;
    if (tooMany) {
      ctx.add(
        id,
        level,
        `${file}:${long[0]}`,
        `${long.length} line(s) exceed ${limit} columns (repo limit or default 80)`,
      );
    }
  }
}

export function configuredLineLength(root, suffix) {
  const editorconfig = firstMatch(root, ".editorconfig", /^\s*max_line_length\s*=\s*(\d+)/im);
  if (editorconfig !== null) return editorconfig;

  if (suffix === ".py") {
    const sources = [
      ["pyproject.toml", /^\s*line[-_]length\s*=\s*(\d+)/im],
      ["setup.cfg", /^\s*max[-_]line[-_]length\s*=\s*(\d+)/im],
      [".flake8", /^\s*max[-_]line[-_]length\s*=\s*(\d+)/im],
      ["tox.ini", /^\s*max[-_]line[-_]length\s*=\s*(\d+)/im],
    ];
    for (const [file, pattern] of sources) {
      const found = firstMatch(root, file, pattern);
      if (found !== null) return found;
    }
  }

  if (JS_LIKE.has(suffix)) {
    const files = [
      ".prettierrc", ".prettierrc.json", "prettier.config.js", ".prettierrc.js",
      "package.json",
    ];
    for (const file of files) {
      const found = firstMatch(root, file, /printWidth\W+(\d+)/);
      if (found !== null) return found;
    }
  }

  if (suffix === ".rs") {
    const found = firstMatch(root, "rustfmt.toml", /^\s*max_width\s*=\s*(\d+)/im);
    if (found !== null) return found;
  }

  return DEFAULT_LIMIT;
}

function firstMatch(root, file, pattern) {
  const text = readText(root, file);
  if (text === null) return null;
  const match = pattern.exec(text);
  return match ? Number(match[1]) : null;
}
