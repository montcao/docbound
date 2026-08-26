// Every git call in the audit goes through `run`, which reports failure as
// null rather than throwing. A missing ref, a missing file at a ref, and a
// missing git binary are all ordinary states here: the audit degrades to a
// whole-tree scan instead of erroring, so it still works in a tarball.

import { spawnSync } from "node:child_process";

export function run(args, cwd) {
  let result;
  try {
    result = spawnSync("git", args, {
      cwd,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
  if (result.error || result.status !== 0) return null;
  return result.stdout;
}

export function insideWorkTree(root) {
  return run(["rev-parse", "--is-inside-work-tree"], root) !== null;
}

export function topLevel(cwd) {
  const out = run(["rev-parse", "--show-toplevel"], cwd);
  return out === null ? null : out.trim();
}

/** File content at a ref, or null when the path did not exist there. */
export function showFile(root, ref, relpath) {
  return run(["show", `${ref}:${relpath}`], root);
}
