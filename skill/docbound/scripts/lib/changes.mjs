// Change detection. Every check that says "in this diff" reads what this
// produces, so its three cases are the audit's most load-bearing behaviour:
//
//   baseline set                    everything since the baseline commit
//   feature branch with no commits  the working tree alone is the change set
//   base branch with a clean tree   the last commit is the change set
//   no git                          the whole tree, with coverage not evaluated
//
// The middle two were wrong in an early version of the reference implementation
// and were fixed there; `tests/fixtures/undocumented-change` and
// `tests/fixtures/direct-to-main` pin them.
//
// The baseline exists because the merge-base rule is right for a change and
// wrong for an adoption. A repository installing docbound on a branch that is
// 128 files from main owes documentation for all 128 on the first run, and
// cutting a fresh branch does not help because the merge base does not move.
// `docbound baseline` writes the current commit into `.docbound/config.json`
// and everything before it is somebody else's work
// (`docs/decisions/0019-adoption-baseline.md`).

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { excluded, isSource, parentOf } from "./paths.mjs";
import { run } from "./git.mjs";

const BASE_CANDIDATES = ["origin/main", "main", "origin/master", "master"];

/**
 * The default branch this clone was made from, or null.
 *
 * Asked first, because the guessed list is wrong whenever a repository's default
 * branch is not main or master. A clone whose default is `init-product` and
 * which also carried a stale `origin/main` had every one of its 128 files
 * reported as undocumented, with nothing in the output naming the ref it had
 * compared against (`docs/decisions/0034-ask-git-for-the-default-branch.md`).
 */
function defaultBranch(root) {
  const ref = run(["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"], root);
  if (ref === null) return null;
  const name = ref.trim().replace(/^refs\/remotes\//, "");
  return name === "" ? null : name;
}

export function detectChanges(root, base, extraExcludes = [], baseline = null) {
  if (run(["rev-parse", "--is-inside-work-tree"], root) === null) {
    // A baseline here is stale configuration, most likely copied from a
    // repository that had history. Saying so matters because the audit is then
    // quietly wider than the config file reads: the whole tree, not what came
    // after a commit.
    if (baseline) {
      process.stderr.write(
        "docbound: audit.baseline is set but this is not a git repository; " +
          "scanning the whole tree instead\n",
      );
    }
    return {
      changed: allFiles(root, extraExcludes),
      addedDirs: new Set(),
      git: false,
      added: new Set(),
      ref: null,
      baseline: null,
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

  // A baseline that no longer resolves is reported and ignored rather than
  // failing the audit: it usually means a rebase or a shallow clone, and an
  // audit that refuses to run is worse than one that widens its scope.
  const resolvedBaseline = baseline ? resolveRef(root, baseline) : null;
  if (baseline && resolvedBaseline === null) {
    process.stderr.write(
      `docbound: baseline ${baseline} is not a commit in this repository; ` +
        "ignoring it and using the merge base\n",
    );
  }

  if (resolvedBaseline !== null) {
    const diff = run(
      ["diff", "--name-status", `${resolvedBaseline}..HEAD`],
      root,
    );
    collect(diff, changed, added);
    const keptSince = filterExcluded(changed, extraExcludes);
    return {
      changed: keptSince,
      addedDirs: newDirs(root, keptSince, extraExcludes),
      git: true,
      added: filterExcluded(added, extraExcludes),
      ref: resolvedBaseline,
      baseline: resolvedBaseline,
    };
  }

  const candidates = base
    ? [base]
    : [defaultBranch(root), ...BASE_CANDIDATES].filter(Boolean);
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

    collect(diff, changed, added);
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
    baseline: null,
  };
}

/** Names from `--name-status` output into the two sets, in place. */
function collect(diff, changed, added) {
  for (const line of (diff ?? "").split("\n")) {
    const parts = line.split("\t");
    if (parts.length < 2) continue;
    const file = parts[parts.length - 1];
    changed.add(file);
    if (parts[0].startsWith("A")) added.add(file);
  }
}

/** The commit a ref names, or null when the ref is not one. */
function resolveRef(root, ref) {
  const resolved = run(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], root);
  return resolved === null || resolved.trim() === "" ? null : resolved.trim();
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
