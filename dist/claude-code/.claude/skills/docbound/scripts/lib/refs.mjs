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
  // A bare word is a symbol or a command, not a path.
  if (!named && !target.includes("/") && !target.includes(".")) return null;
  if (target.startsWith("./") || target.startsWith("/")) {
    target = target.replace(/^[./]+/, "");
  }
  if (!target || target === "." || target === "..") return null;

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

/** True when `target` resolves from the repository root or from the doc's own directory. */
export function resolves(root, doc, target) {
  const local = parentOf(doc) === "." ? "" : parentOf(doc);
  return [path.join(root, target), path.join(root, local, target)].some((c) =>
    fs.existsSync(c),
  );
}
