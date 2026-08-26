// Change detection. Every check that says "in this diff" reads what this
// produces, so its three cases are the audit's most load-bearing behaviour:
//
//   feature branch with no commits  the working tree alone is the change set
//   base branch with a clean tree   the last commit is the change set
//   no git                          the whole tree, with coverage not evaluated
//
// The first two were wrong in an early version of the reference implementation
// and were fixed there; `tests/fixtures/undocumented-change` and
// `tests/fixtures/direct-to-main` pin them.

import fs from "node:fs";
import path from "node:path";
import { excluded, isSource, parentOf } from "./paths.mjs";
import { run } from "./git.mjs";

const BASE_CANDIDATES = ["origin/main", "main", "origin/master", "master"];

export function detectChanges(root, base, extraExcludes = []) {
  if (run(["rev-parse", "--is-inside-work-tree"], root) === null) {
    return {
      changed: allFiles(root, extraExcludes),
      addedDirs: new Set(),
      git: false,
      added: new Set(),
      ref: null,
    };
  }

  const changed = new Set();
  const added = new Set();
  let ref = "HEAD";

  const status =
    run(["status", "--porcelain=v1", "--untracked-files=all"], root) ?? "";
  // "Clean" means nothing the audit would look at, not nothing at all: a tree
  // dirtied only by excluded paths still wants its last commit audited.
  let dirty = false;
  for (const line of status.split("\n")) {
    if (line.length < 4) continue;
    const code = line.slice(0, 2);
    let file = line.slice(3);
    if (file.includes(" -> ")) file = file.split(" -> ").slice(1).join(" -> ");
    file = file.trim().replace(/^"|"$/g, "");
    changed.add(file);
    if (["A", "??", "AM"].includes(code.trim())) added.add(file);
    if (!excluded(file, extraExcludes)) dirty = true;
  }

  const candidates = base ? [base] : BASE_CANDIDATES;
  const head = (run(["rev-parse", "HEAD"], root) ?? "").trim();
  const branch = (run(["rev-parse", "--abbrev-ref", "HEAD"], root) ?? "").trim();

  for (const candidate of candidates) {
    if (!candidate) continue;
    const mergeBase = run(["merge-base", candidate, "HEAD"], root);
    if (mergeBase === null) continue;
    const mb = mergeBase.trim();
    const onBase = branch === candidate.split("/").pop();

    let diff;
    if (onBase && !dirty) {
      // Sitting on the base branch with a clean tree: audit the last commit so
      // a direct-to-main workflow still gets checked.
      diff = run(["diff", "--name-status", "HEAD~1", "HEAD"], root);
      ref = "HEAD~1";
    } else if (mb === head) {
      // Feature branch with no commits yet: only the working tree counts.
      diff = "";
    } else {
      diff = run(["diff", "--name-status", `${mb}..HEAD`], root);
      ref = mb;
    }

    for (const line of (diff ?? "").split("\n")) {
      const parts = line.split("\t");
      if (parts.length < 2) continue;
      const file = parts[parts.length - 1];
      changed.add(file);
      if (parts[0].startsWith("A")) added.add(file);
    }
    break;
  }

  const keptChanged = filterExcluded(changed, extraExcludes);
  const keptAdded = filterExcluded(added, extraExcludes);

  return {
    changed: keptChanged,
    addedDirs: newDirs(root, keptChanged, extraExcludes),
    git: true,
    added: keptAdded,
    ref,
  };
}

function filterExcluded(paths, extraExcludes) {
  return new Set([...paths].filter((p) => !excluded(p, extraExcludes)));
}

/** A directory is new when git knows nothing under it at HEAD. */
function newDirs(root, changed, extraExcludes) {
  const dirs = new Set();
  for (const file of changed) {
    if (!isSource(file, extraExcludes)) continue;
    const dir = parentOf(file);
    if (dir !== ".") dirs.add(dir);
  }
  const out = new Set();
  for (const dir of dirs) {
    const tracked = run(["ls-tree", "-r", "--name-only", "HEAD", "--", dir], root);
    if (!tracked || !tracked.trim()) out.add(dir);
  }
  return out;
}

function isFile(absolute) {
  try {
    return fs.statSync(absolute).isFile();
  } catch {
    return false;
  }
}

function allFiles(root, extraExcludes) {
  const out = new Set();
  const stack = [""];
  while (stack.length) {
    const prefix = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(path.join(root, prefix), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (excluded(rel, extraExcludes)) continue;
      if (entry.isSymbolicLink()) {
        // Symlinked directories are not walked, so a skill installed as a link
        // back into the tree is not scanned twice.
        if (isFile(path.join(root, rel))) out.add(rel);
      } else if (entry.isDirectory()) {
        stack.push(rel);
      } else {
        out.add(rel);
      }
    }
  }
  return out;
}
