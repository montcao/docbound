// Text machinery shared by more than one check. Anything here is a faithful
// port of a helper in `scripts/reference/audit.py`; behaviour is pinned by the
// fixtures rather than by these functions being obviously right.

import { COMMENT_PREFIX, splitLines } from "./paths.mjs";

/** Body of a Markdown section, from its heading to the next heading of `level`. */
export function sectionBody(text, heading, marker = "## ") {
  const lines = splitLines(text);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (start === -1) {
      if (lines[i].replace(/\s+$/, "") === heading) start = i + 1;
    } else if (lines[i].startsWith(marker)) {
      return lines.slice(start, i).join("\n");
    }
  }
  return start === -1 ? null : lines.slice(start).join("\n");
}

/** Remove fenced code blocks; placeholders and paths inside them are examples. */
export function stripFences(text) {
  return text.replace(/^```[\s\S]*?^```/gm, "");
}

export function normalizeParagraph(text) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Column-accurate tab expansion, matching Python's `str.expandtabs`. */
export function expandTabs(line, size = 4) {
  let out = "";
  for (const ch of line) {
    if (ch === "\t") out += " ".repeat(size - (out.length % size));
    else out += ch;
  }
  return out;
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "for", "and", "or", "in", "on", "is", "it",
  "this", "that", "with", "from", "by", "as", "at", "be", "are", "was", "we",
  "if", "then", "return", "returns", "get", "gets", "set", "sets", "value",
  "values",
]);

export function tokens(text) {
  const split = text.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  const out = new Set();
  for (const word of split.match(/[a-z]{3,}/g) ?? []) {
    if (!STOPWORDS.has(word)) out.add(word);
  }
  return out;
}

/**
 * Fraction of comment words that appear in the code, allowing a four-character
 * prefix match so load/loads and req/request count as the same word.
 */
export function overlap(comment, code) {
  if (comment.size === 0) return 0;
  let hit = 0;
  for (const word of comment) {
    for (const other of code) {
      const k = Math.min(word.length, other.length, 4);
      if (k >= 3 && word.slice(0, k) === other.slice(0, k)) {
        hit += 1;
        break;
      }
    }
  }
  return hit / comment.size;
}

/** `[lineNumber, body]` for every line that is only a comment. */
export function commentLines(text, prefix) {
  const out = [];
  let inBlock = false;
  const lines = splitLines(text);
  for (let i = 0; i < lines.length; i += 1) {
    const st = lines[i].trim();
    if (prefix === "//" && st.includes("/*") && !st.includes("*/")) {
      inBlock = true;
      continue;
    }
    if (inBlock) {
      if (st.includes("*/")) inBlock = false;
      continue;
    }
    const isComment =
      prefix === "#"
        ? st.startsWith(prefix) && !st.startsWith(`${prefix}${prefix} `)
        : st.startsWith(prefix);
    if (isComment) out.push([i + 1, st.slice(prefix.length).trim()]);
  }
  return out;
}

/**
 * Source with comments and docstrings removed, so two revisions can be compared
 * for logic changes alone. Approximate by design: it strips a trailing comment
 * only when no quote precedes the marker on that line.
 */
export function stripComments(text, suffix) {
  const prefix = COMMENT_PREFIX[suffix] ?? "#";
  let body = text;
  if (suffix === ".py") {
    body = body.replace(/"""[\s\S]*?"""/g, "");
    body = body.replace(/'''[\s\S]*?'''/g, "");
  }
  if (prefix === "//") body = body.replace(/\/\*[\s\S]*?\*\//g, "");
  const quoted = new RegExp(`["'].*${escapeRegExp(prefix)}`);
  const out = [];
  for (let line of splitLines(body)) {
    const st = line.trim();
    if (!st || st.startsWith(prefix)) continue;
    if (line.includes(prefix) && !quoted.test(line)) {
      line = line.split(prefix)[0];
    }
    out.push(line.replace(/\s+$/, ""));
  }
  return out.join("\n");
}

export function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
}
