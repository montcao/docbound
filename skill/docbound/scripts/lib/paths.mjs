// Path vocabulary shared by every check. The sets and predicates here decide
// what counts as source, as a doc, as a test, and as out of scope; changing one
// changes what several checks see, so they live in one place.

import fs from "node:fs";
import path from "node:path";

export const SOURCE_EXT = new Set([
  ".py", ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs", ".go", ".rs", ".java",
  ".kt", ".rb", ".php", ".cs", ".c", ".cc", ".cpp", ".h", ".hpp", ".swift",
  ".scala", ".ex", ".exs", ".erl", ".hs", ".ml", ".clj", ".lua", ".dart",
  ".sh", ".bash", ".zsh", ".sql", ".proto", ".graphql", ".vue", ".svelte",
]);

export const EXCLUDE_DIRS = new Set([
  ".git", "node_modules", "vendor", "dist", "build", "target", ".venv", "venv",
  "__pycache__", ".agents", ".claude", ".idea", ".vscode", "coverage", ".next",
  ".cache", "out", ".tox", ".mypy_cache", ".pytest_cache", "site-packages",
]);

const MANIFESTS = new Set([
  "package.json", "pyproject.toml", "requirements.txt", "setup.py", "setup.cfg",
  "Pipfile", "go.mod", "Cargo.toml", "Gemfile", "pom.xml", "build.gradle",
  "build.gradle.kts", "composer.json", "mix.exs", "pubspec.yaml",
  "Package.swift", "environment.yml",
]);

const MANIFEST_PATTERNS = [/^requirements[-_.\w]*\.txt$/];

// A lockfile is where a dependency change actually lands. `npm audit fix` and
// most automated bumps touch nothing else, and none of these were in the set,
// so the check missed the case it exists for
// (`docs/decisions/0035-dep-adr-reads-the-dependencies.md`).
const LOCKFILES = new Set([
  "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml",
  "bun.lockb", "Cargo.lock", "poetry.lock", "Pipfile.lock", "uv.lock",
  "go.sum", "Gemfile.lock", "composer.lock", "mix.lock", "pubspec.lock",
  "Package.resolved",
]);

/** True for a file whose every change is a dependency change. */
export function isLockfile(relpath) {
  return LOCKFILES.has(relpath.split("/").pop());
}

const TEST_PATTERNS = [
  /(^|\/)tests?\//, /(^|\/)__tests__\//, /(^|\/)spec\//,
  /(^|\/)test_[^/]+\.py$/, /_test\.(py|go|rs|rb)$/,
  /\.(test|spec)\.[jt]sx?$/,
];

// Source files at or below this many non-blank lines are exempt from coverage.
export const TRIVIAL_LINES = 15;

export const COMMENT_PREFIX = {
  ".py": "#", ".sh": "#", ".bash": "#", ".zsh": "#", ".rb": "#", ".yaml": "#",
  ".yml": "#", ".js": "//", ".ts": "//", ".tsx": "//", ".jsx": "//",
  ".mjs": "//", ".cjs": "//", ".go": "//", ".rs": "//", ".java": "//",
  ".kt": "//", ".c": "//", ".cc": "//", ".cpp": "//", ".h": "//", ".hpp": "//",
  ".cs": "//", ".swift": "//", ".scala": "//", ".dart": "//", ".php": "//",
  ".sql": "--", ".lua": "--", ".hs": "--", ".ex": "#", ".exs": "#",
};

/** File extension including the dot, matching Python's `PurePath.suffix`. */
export function suffixOf(relpath) {
  const name = relpath.split("/").pop();
  const i = name.lastIndexOf(".");
  return i > 0 && i < name.length - 1 ? name.slice(i) : "";
}

export function excluded(relpath, extra = []) {
  if (relpath.split("/").some((part) => EXCLUDE_DIRS.has(part))) return true;
  return extra.some((rule) => matchesRule(relpath, rule));
}

/**
 * Extra exclusion rules come from `.docbound/config.json` and are either an
 * exact path, a directory prefix, or a suffix glob (`skill/**`, `*.gen.md`).
 * Deliberately not a full glob dialect: the config exists to name known
 * directories, and a half-implemented glob is harder to predict than none.
 */
function matchesRule(relpath, rule) {
  const r = rule.replace(/\/+$/, "");
  if (!r) return false;
  if (r.endsWith("/**")) {
    const base = r.slice(0, -3);
    return relpath === base || relpath.startsWith(base + "/");
  }
  if (r.startsWith("*.")) return relpath.endsWith(r.slice(1));
  return relpath === r || relpath.startsWith(r + "/");
}

export function isSource(relpath, extra = []) {
  return SOURCE_EXT.has(suffixOf(relpath)) && !excluded(relpath, extra);
}

export function isTest(relpath) {
  return TEST_PATTERNS.some((p) => p.test(relpath));
}

export function isManifest(relpath) {
  const name = relpath.split("/").pop();
  if (MANIFESTS.has(name)) return true;
  return MANIFEST_PATTERNS.some((p) => p.test(name));
}

export function isDoc(relpath, extra = []) {
  return relpath.endsWith(".md") && !excluded(relpath, extra);
}

export function isAdr(relpath) {
  return relpath.startsWith("docs/decisions/") && relpath.endsWith(".md");
}

/**
 * True for a document that records the past rather than stating current truth.
 *
 * The worklog, the archives `prune` writes beside it, the decision records, and
 * the changelog. Each is written once about a moment and is not rewritten
 * afterwards, so changelog phrasing belongs in it and a path it names that has
 * since been deleted is history rather than a defect. A changelog is the clearest
 * case and was the one missing: "no longer", "previously", and "now uses" are
 * the vocabulary the format is made of
 * (`docs/decisions/0041-the-historical-set-is-every-record-of-the-past.md`).
 */
export function isHistorical(relpath) {
  return (
    relpath === "docs/WORKLOG.md" ||
    relpath.startsWith("docs/worklog/") ||
    relpath.split("/").pop() === "CHANGELOG.md" ||
    isAdr(relpath)
  );
}

/**
 * Every Markdown file under `root` that is not excluded, repo-relative and
 * sorted. Symlinked directories are not followed, so an installed copy of the
 * skill that points back into the tree is walked once at most.
 */
export function allDocs(root, extra = []) {
  const out = [];
  walk(root, "", out, extra);
  return out.sort();
}

function walk(root, prefix, out, extra) {
  let entries;
  try {
    entries = fs.readdirSync(path.join(root, prefix), { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) {
      if (rel.endsWith(".md") && !excluded(rel, extra) && isFile(root, rel)) {
        out.push(rel);
      }
      continue;
    }
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) walk(root, rel, out, extra);
    } else if (entry.name.endsWith(".md") && !excluded(rel, extra)) {
      out.push(rel);
    }
  }
}

function isFile(root, rel) {
  try {
    return fs.statSync(path.join(root, rel)).isFile();
  } catch {
    return false;
  }
}

export function readText(root, relpath) {
  try {
    return fs.readFileSync(path.join(root, relpath), "utf8");
  } catch {
    return null;
  }
}

export function exists(root, relpath) {
  return fs.existsSync(path.join(root, relpath));
}

/**
 * Split like Python's `str.splitlines()`: universal newlines, and no trailing
 * empty element for a file that ends in a newline. Line counts feed the ratio
 * threshold in `comment-sentence`, so an extra element at
 * the end would move a finding.
 */
export function splitLines(text) {
  if (text === "") return [];
  const lines = text.split(/\r\n|[\n\r\v\f\u0085\u2028\u2029]/);
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

export function nonblankLines(root, relpath) {
  const text = readText(root, relpath);
  if (text === null) return 0;
  return splitLines(text).filter((line) => line.trim()).length;
}

/** Repo-relative parent directory, or "." at the root, as Python renders it. */
export function parentOf(relpath) {
  const i = relpath.lastIndexOf("/");
  return i === -1 ? "." : relpath.slice(0, i);
}
