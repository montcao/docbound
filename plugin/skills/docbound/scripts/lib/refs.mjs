// Deciding whether a token in a document is a claim about a path.
//
// Two checks ask that question — `dead-ref` about backticked text and
// `diagram-refs` about Mermaid node labels — and they have to answer it the
// same way. A token the one treats as prose and the other treats as a path is
// a finding that appears and disappears depending on where it was written.
//
// The heuristic is deliberately conservative in one direction. Missing a real
// dead path costs a stale reference nobody caught; inventing one costs a
// blocking error on text that was never a path, which is how a check gets
// switched off. When in doubt this says "not a path".

import fs from "node:fs";
import path from "node:path";

import { SOURCE_EXT, parentOf, suffixOf } from "./paths.mjs";

export const DATA_EXT = new Set([
  ".md", ".json", ".toml", ".yaml", ".yml", ".txt", ".cfg", ".ini", ".env",
  ".lock", ".html", ".css", ".xml",
]);
const SKIP_PREFIX = ["$", "-", "--", "<", "{", "@", "#"];
// One capture, no nesting, no alternation: linear over any input, which matters
// because every doc in the repository passes through it on every edit.
const ANCHOR = /<!--\s*docbound-root:\s*([^\s>]+)\s*-->/;
const SKIP_CHARS = "*?<>{}()=";

/**
 * The repository-relative path a token claims, or null when it claims none.
 *
 * Returns the token stripped of a trailing slash, a `:symbol` suffix, and a
 * leading `./`, which is the form the caller resolves.
 *
 * `trailingSlashIsPath` is the one place the two callers disagree, and they
 * disagree for a reason. Stripping the slash off a top-level directory leaves a
 * bare word, and a bare word in prose is more often a symbol or a command than
 * a path — so `dead-ref` lets it go. Inside a diagram a trailing slash is the
 * documented way to write a directory, so `diagram-refs` takes it literally.
 */
export function pathClaim(ref, { trailingSlashIsPath = false } = {}) {
  if (ref.includes("://")) return null;
  if (SKIP_PREFIX.some((prefix) => ref.startsWith(prefix))) return null;
  if ([...SKIP_CHARS].some((ch) => ref.includes(ch))) return null;

  const named = trailingSlashIsPath && ref.endsWith("/");
  let target = ref.split(":")[0].replace(/\/+$/, "");
  // Normalising before the bare-word test, not after. A URL route written
  // `/scan` carries a slash only because of its leading one, so testing for a
  // bare word first let it through the gate that exists to stop it, and the
  // route was reported as a missing file.
  if (target.startsWith("./") || target.startsWith("/")) {
    target = target.replace(/^[./]+/, "");
  }
  if (!target || target === "." || target === "..") return null;
  // A bare word is a symbol or a command, not a path.
  if (!named && !target.includes("/") && !target.includes(".")) return null;

  const suffix = suffixOf(target);
  const known = SOURCE_EXT.has(suffix) || DATA_EXT.has(suffix);
  // Things like `v1.2.3` or `foo.bar`: a dot, no slash, no known extension.
  if (suffix && !known && !target.includes("/")) return null;

  return target;
}

/**
 * True when a token is shaped like a path rather than merely containing a slash.
 *
 * A file carries a known extension; a directory carries a trailing slash.
 * Without this, an ordinary label — `read/write`, `input/output`, `client/server`
 * — reads as a path to a file that was never there, and a blocking check that
 * fires on English is a blocking check somebody turns off.
 */
export function isPathShaped(token) {
  if (!token.includes("/")) return false;
  if (token.endsWith("/")) return true;
  const suffix = suffixOf(token);
  return SOURCE_EXT.has(suffix) || DATA_EXT.has(suffix);
}

/**
 * The directory a doc writes its relative paths against, or null for the root.
 *
 * A doc describing one package of a monorepo writes paths the way that
 * package's own tooling does: `internal/httpapi`, not
 * `services/search-api/internal/router`. Both are correct, and nothing in
 * the text says which. This lets the doc say it, once, at the top:
 *
 *     <!-- docbound-root: services/search-api -->
 *
 * An HTML comment because it is invisible wherever Markdown is rendered.
 */
export function docRoot(text) {
  const match = ANCHOR.exec(text);
  if (!match) return null;
  const anchor = match[1].replace(/^[./]+/, "").replace(/\/+$/, "");
  return anchor === "" ? null : anchor;
}

/**
 * True when `target` resolves from the repository root, the doc's own
 * directory, or the doc's declared anchor.
 */
export function resolves(root, doc, target, anchor = null) {
  const local = parentOf(doc) === "." ? "" : parentOf(doc);
  const bases = ["", local];
  if (anchor !== null) bases.push(anchor);
  return bases.some((base) => fs.existsSync(path.join(root, base, target)));
}
