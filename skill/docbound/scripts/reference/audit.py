#!/usr/bin/env python3
"""docbound audit. Exit 0 means the task's documentation is complete.

Checks (id — level):
  worklog-entry       error  a worklog entry exists for the current session
  worklog-closed      error  its Outcome and Still open sections are filled
  doc-coverage        error  every changed source file has a covering doc in the diff
  new-dir-readme      error  every new directory holding source has a README.md
  dead-ref            error  no doc references a path that does not exist
  dep-adr             error  a changed dependency manifest has an ADR (Architecture Decision Record) in the diff
  adr-shape           error  new ADRs have Context / Decision / What would reverse this
  adr-immutable       error  existing ADRs are edited only on their Status line
  template-residue    error  no unfilled <placeholders> in docs
  orphan-doc          warn   every doc under docs/ is linked from another doc
  duplicate-block     warn   no substantial paragraph appears verbatim in two docs
  stale-marker        warn   docs contain changelog-style phrasing
  restating-comments  warn   changed source has mostly comments that restate code
  todo-shape          warn   TODO/FIXME comments state problem + action and name an owner
  comment-sentence    warn   full-line comments are complete sentences; no commented-out code
  line-length         warn   changed source respects the repo's configured line length (or 80)
  mixed-indent        warn   no changed source file mixes tabs and spaces for indentation

Waivers: a line in the current worklog entry of the form
    waiver: <check-id> [target] — <reason>
suppresses that check (or that one finding if a target path is given).

Subagent mode (--mode subagent) adds:
  handoff-present     error  the worklog entry has a filled ### Handoff section from the coder
  adr-sourced         error  new ADRs have ## Sources; inferred-only ADRs are 'accepted (unconfirmed)'
  inferred-open       error  every 'Inferred:' marker has a confirmation item under Still open
  logic-touched       warn   with --since <coder-commit>: only comments/docstrings changed since

Usage:
  python audit.py [--root .] [--base <ref>] [--mode author|subagent] [--since <ref>]
                  [--session-days 2] [--next-adr] [--json]

Change detection: working tree + index vs HEAD, unioned with HEAD vs the merge
base of --base (default: origin/main, main, or master, whichever exists). With no
git repository, every file is treated as changed and coverage is not checked.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

# ---------------------------------------------------------------- constants

SOURCE_EXT = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs", ".go", ".rs", ".java",
    ".kt", ".rb", ".php", ".cs", ".c", ".cc", ".cpp", ".h", ".hpp", ".swift",
    ".scala", ".ex", ".exs", ".erl", ".hs", ".ml", ".clj", ".lua", ".dart",
    ".sh", ".bash", ".zsh", ".sql", ".proto", ".graphql", ".vue", ".svelte",
}
EXCLUDE_DIRS = {
    ".git", "node_modules", "vendor", "dist", "build", "target", ".venv", "venv",
    "__pycache__", ".agents", ".claude", ".idea", ".vscode", "coverage", ".next",
    ".cache", "out", ".tox", ".mypy_cache", ".pytest_cache", "site-packages",
}
MANIFESTS = {
    "package.json", "pyproject.toml", "requirements.txt", "setup.py", "setup.cfg",
    "Pipfile", "go.mod", "Cargo.toml", "Gemfile", "pom.xml", "build.gradle",
    "build.gradle.kts", "composer.json", "mix.exs", "pubspec.yaml", "Package.swift",
    "environment.yml",
}
MANIFEST_PATTERNS = [re.compile(r"^requirements[-_.\w]*\.txt$")]
TEST_PATTERNS = [
    re.compile(r"(^|/)tests?/"), re.compile(r"(^|/)__tests__/"), re.compile(r"(^|/)spec/"),
    re.compile(r"(^|/)test_[^/]+\.py$"), re.compile(r"_test\.(py|go|rs|rb)$"),
    re.compile(r"\.(test|spec)\.[jt]sx?$"),
]
TRIVIAL_LINES = 15  # source files at or below this many non-blank lines are exempt from coverage

PLACEHOLDER = re.compile(r"<[a-z][a-z0-9 /|:'’\-]{1,80}>")
HTML_TAGS = {
    "br", "hr", "p", "b", "i", "u", "a", "img", "div", "span", "details", "summary",
    "sub", "sup", "kbd", "code", "pre", "table", "tr", "td", "th", "ul", "ol", "li",
    "em", "strong", "small", "center", "input", "button", "script", "style",
}
STALE = re.compile(
    r"\b(TODO:? update|update this section|as of (19|20)\d\d|previously|formerly|used to be|"
    r"no longer|now uses|now does|coming soon|TBD|to be determined)\b",
    re.IGNORECASE,
)
PATH_REF = re.compile(r"`([^`\s]+)`")
ADR_SECTIONS = ["## Context", "## Decision", "## What would reverse this"]
COMMENT_PREFIX = {
    ".py": "#", ".sh": "#", ".bash": "#", ".zsh": "#", ".rb": "#", ".yaml": "#", ".yml": "#",
    ".js": "//", ".ts": "//", ".tsx": "//", ".jsx": "//", ".mjs": "//", ".cjs": "//",
    ".go": "//", ".rs": "//", ".java": "//", ".kt": "//", ".c": "//", ".cc": "//",
    ".cpp": "//", ".h": "//", ".hpp": "//", ".cs": "//", ".swift": "//", ".scala": "//",
    ".dart": "//", ".php": "//", ".sql": "--", ".lua": "--", ".hs": "--", ".ex": "#", ".exs": "#",
}
STOPWORDS = {
    "the", "a", "an", "of", "to", "for", "and", "or", "in", "on", "is", "it", "this",
    "that", "with", "from", "by", "as", "at", "be", "are", "was", "we", "if", "then",
    "return", "returns", "get", "gets", "set", "sets", "value", "values",
}


@dataclass
class Finding:
    check: str
    level: str  # "error" | "warn"
    path: str
    message: str


@dataclass
class Waiver:
    check: str
    target: str | None
    reason: str


@dataclass
class Ctx:
    root: Path
    changed: set[str]            # repo-relative paths, forward slashes
    added_dirs: set[str]
    git: bool
    session_days: int
    added: set[str] = field(default_factory=set)   # paths new in this change set
    ref: str | None = None                          # commit holding the "before" version
    mode: str = "author"
    since: str | None = None                        # subagent mode: the coder's end state
    findings: list[Finding] = field(default_factory=list)
    waivers: list[Waiver] = field(default_factory=list)
    top_entry: str | None = None

    def add(self, check: str, level: str, path: str, msg: str) -> None:
        self.findings.append(Finding(check, level, path, msg))


# ---------------------------------------------------------------- helpers

def run(cmd: list[str], cwd: Path) -> str | None:
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        return None
    if r.returncode != 0:
        return None
    return r.stdout


def rel(root: Path, p: Path) -> str:
    return p.relative_to(root).as_posix()


def excluded(relpath: str) -> bool:
    return any(part in EXCLUDE_DIRS for part in relpath.split("/"))


def is_source(relpath: str) -> bool:
    return Path(relpath).suffix in SOURCE_EXT and not excluded(relpath)


def is_test(relpath: str) -> bool:
    return any(p.search(relpath) for p in TEST_PATTERNS)


def is_manifest(relpath: str) -> bool:
    name = Path(relpath).name
    return name in MANIFESTS or any(p.match(name) for p in MANIFEST_PATTERNS)


def is_doc(relpath: str) -> bool:
    return relpath.endswith(".md") and not excluded(relpath)


def all_docs(root: Path) -> list[str]:
    out = []
    for p in root.rglob("*.md"):
        r = rel(root, p)
        if not excluded(r):
            out.append(r)
    return sorted(out)


def nonblank_lines(path: Path) -> int:
    try:
        return sum(1 for line in path.read_text(encoding="utf-8", errors="replace").splitlines() if line.strip())
    except OSError:
        return 0


# ---------------------------------------------------------------- change detection

def detect_changes(root: Path, base: str | None) -> tuple[set[str], set[str], bool, set[str], str | None]:
    """Return (changed, new dirs, git_available, added paths, reference commit)."""
    if run(["git", "rev-parse", "--is-inside-work-tree"], root) is None:
        files = set()
        for p in root.rglob("*"):
            if p.is_file():
                r = rel(root, p)
                if not excluded(r):
                    files.add(r)
        return files, set(), False, set(), None

    changed: set[str] = set()
    added: set[str] = set()
    ref: str | None = "HEAD"

    status = run(["git", "status", "--porcelain=v1", "--untracked-files=all"], root) or ""
    for line in status.splitlines():
        if len(line) < 4:
            continue
        code, path = line[:2], line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        path = path.strip().strip('"')
        changed.add(path)
        if code.strip() in {"A", "??", "AM"}:
            added.add(path)

    # Committed-but-unmerged work on this branch, if a base can be found.
    candidates = [base] if base else ["origin/main", "main", "origin/master", "master"]
    head = (run(["git", "rev-parse", "HEAD"], root) or "").strip()
    branch = (run(["git", "rev-parse", "--abbrev-ref", "HEAD"], root) or "").strip()
    for cand in candidates:
        if not cand:
            continue
        mb = run(["git", "merge-base", cand, "HEAD"], root)
        if mb is None:
            continue
        mb = mb.strip()
        on_base = branch == cand.split("/")[-1]
        if on_base and not status.strip():
            # Sitting on the base branch with a clean tree: audit the last commit
            # so a direct-to-main workflow still gets checked.
            diff = run(["git", "diff", "--name-status", "HEAD~1", "HEAD"], root)
            ref = "HEAD~1"
        elif mb == head:
            diff = ""  # feature branch with no commits yet: only the working tree counts
        else:
            diff = run(["git", "diff", "--name-status", f"{mb}..HEAD"], root)
            ref = mb
        for line in (diff or "").splitlines():
            parts = line.split("\t")
            if len(parts) < 2:
                continue
            code, path = parts[0], parts[-1]
            changed.add(path)
            if code.startswith("A"):
                added.add(path)
        break

    changed = {c for c in changed if not excluded(c)}
    added = {a for a in added if not excluded(a)}

    # New directories: those where every source file under them is newly added.
    dirs_with_source: dict[str, list[str]] = defaultdict(list)
    for c in changed:
        if is_source(c):
            d = str(Path(c).parent.as_posix())
            if d != ".":
                dirs_with_source[d].append(c)
    new_dirs: set[str] = set()
    for d, files in dirs_with_source.items():
        tracked = run(["git", "ls-tree", "-r", "--name-only", "HEAD", "--", d], root)
        existed_before = bool(tracked and tracked.strip())
        if not existed_before:
            new_dirs.add(d)
    return changed, new_dirs, True, added, ref


# ---------------------------------------------------------------- worklog

def entry_section(entry: str, name: str) -> str:
    sm = re.search(rf"(?ms)^### {re.escape(name)}\s*\n(.*?)(?=^### |\Z)", entry)
    return (sm.group(1) if sm else "").strip()


def filled(text: str) -> bool:
    """True if a section has real content once template placeholders are removed."""
    for _ in range(4):
        text = re.sub(r"<[^<>]*>", "", text)
    return bool(re.search(r"\w", text))

def parse_worklog(ctx: Ctx) -> None:
    wl = ctx.root / "docs" / "WORKLOG.md"
    if not wl.exists():
        ctx.add("worklog-entry", "error", "docs/WORKLOG.md", "missing; open an entry from references/templates/WORKLOG-entry.md")
        return
    if ctx.git and "docs/WORKLOG.md" not in ctx.changed:
        ctx.add("worklog-entry", "error", "docs/WORKLOG.md",
                "not modified in this change set; open a new entry for this task before editing code")
    text = wl.read_text(encoding="utf-8", errors="replace")
    entries = re.split(r"(?m)^## ", text)
    if len(entries) < 2:
        ctx.add("worklog-entry", "error", "docs/WORKLOG.md", "no entries; open one before the first edit")
        return
    top = "## " + entries[1]
    ctx.top_entry = top

    m = re.match(r"## (\d{4}-\d{2}-\d{2})", top)
    if not m:
        ctx.add("worklog-entry", "error", "docs/WORKLOG.md", "top entry has no ISO date in its heading")
    else:
        try:
            d = dt.date.fromisoformat(m.group(1))
            age = (dt.date.today() - d).days
            if age > ctx.session_days or age < -1:
                ctx.add("worklog-entry", "error", "docs/WORKLOG.md",
                        f"top entry is dated {d} ({age}d old); open a new entry for this task")
        except ValueError:
            ctx.add("worklog-entry", "error", "docs/WORKLOG.md", "top entry date is not a valid ISO date")

    def section(name: str) -> str:
        return entry_section(top, name)

    for name in ("Outcome", "Still open"):
        body = section(name)
        stripped = body
        for _ in range(4):  # placeholders nest one or two deep in the templates
            stripped = re.sub(r"<[^<>]*>", "", stripped)
        if not re.search(r"\w", stripped):
            ctx.add("worklog-closed", "error", "docs/WORKLOG.md", f"'{name}' section of the top entry is empty or still a placeholder")

    for line in section("Waivers").splitlines():
        wm = re.match(r"\s*(?:[-*]\s*)?waiver:\s*([a-z\-]+)\s*([^\s—-][^—]*?)?\s*[—-]{1,2}\s*(.+)$", line.strip())
        if wm:
            target = wm.group(2).strip() if wm.group(2) else None
            ctx.waivers.append(Waiver(wm.group(1), target, wm.group(3).strip()))


# ---------------------------------------------------------------- checks

def check_coverage(ctx: Ctx) -> None:
    """A changed source file is covered when, in the same diff, either its own
    (or an ancestor) module README was touched, or a system-level doc — root
    README, ARCHITECTURE, or an ADR — was touched *and names the file or its
    directory*. Touching an unrelated ADR does not cover a file."""
    if not ctx.git:
        return
    changed_docs = {c for c in ctx.changed if is_doc(c) and (ctx.root / c).exists()}
    system_docs = {d for d in changed_docs if d in ("README.md", "docs/ARCHITECTURE.md") or d.startswith("docs/decisions/")}
    system_text = {d: (ctx.root / d).read_text(encoding="utf-8", errors="replace") for d in system_docs}

    for c in sorted(ctx.changed):
        if not is_source(c) or is_test(c):
            continue
        p = ctx.root / c
        if not p.exists():
            continue  # deleted; coverage of removals is the dead-ref check's job
        if nonblank_lines(p) <= TRIVIAL_LINES:
            continue
        module_readmes = set()
        parent = Path(c).parent
        while parent.as_posix() not in (".", ""):
            module_readmes.add((parent / "README.md").as_posix())
            parent = parent.parent
        if module_readmes & changed_docs:
            continue
        mentions = [c, Path(c).parent.as_posix() + "/"] if Path(c).parent.as_posix() != "." else [c]
        if any(any(m in txt for m in mentions) for txt in system_text.values()):
            continue
        ctx.add("doc-coverage", "error", c,
                "changed with no covering doc in the diff: touch its module README, or a system doc "
                "(root README, ARCHITECTURE, an ADR) that names this file or its directory")


def check_new_dir_readme(ctx: Ctx) -> None:
    for d in sorted(ctx.added_dirs):
        if is_test(d + "/"):
            continue
        if not (ctx.root / d / "README.md").exists():
            ctx.add("new-dir-readme", "error", d, "new directory with source and no README.md (references/templates/MODULE.md)")


def check_dead_refs(ctx: Ctx) -> None:
    for doc in all_docs(ctx.root):
        text = (ctx.root / doc).read_text(encoding="utf-8", errors="replace")
        for m in PATH_REF.finditer(text):
            ref = m.group(1)
            if "://" in ref or ref.startswith(("$", "-", "--", "<", "{", "@", "#")):
                continue
            if any(ch in ref for ch in "*?<>{}()="):
                continue
            target = ref.split(":", 1)[0].rstrip("/")
            if "/" not in target and "." not in target:
                continue  # bare word, probably a symbol or command
            if target.startswith(("./", "/")):
                target = target.lstrip("./")
            if not target or target in {".", ".."}:
                continue
            if Path(target).suffix and Path(target).suffix not in SOURCE_EXT | {".md", ".json", ".toml", ".yaml", ".yml", ".txt", ".cfg", ".ini", ".env", ".lock", ".html", ".css", ".xml"} and "/" not in target:
                continue  # things like `v1.2.3` or `foo.bar`
            candidates = [ctx.root / target, (ctx.root / doc).parent / target]
            if not any(c.exists() for c in candidates):
                ctx.add("dead-ref", "error", doc, f"references `{ref}` which does not exist")


def check_dep_adr(ctx: Ctx) -> None:
    manifests = sorted(c for c in ctx.changed if is_manifest(c))
    if not manifests:
        return
    adrs = [c for c in ctx.changed if c.startswith("docs/decisions/") and c.endswith(".md")]
    if adrs:
        return
    for m in manifests:
        ctx.add("dep-adr", "error", m, "dependency manifest changed with no Architecture Decision Record (ADR) in the diff (docs/decisions/)")


def is_adr(path: str) -> bool:
    return path.startswith("docs/decisions/") and path.endswith(".md")


def before_version(ctx: Ctx, path: str) -> str | None:
    if not ctx.git or not ctx.ref:
        return None
    return run(["git", "show", f"{ctx.ref}:{path}"], ctx.root)


STATUS_LINE = re.compile(r"(?m)^\s*[-*]?\s*Status:.*$")


def check_adr_immutable(ctx: Ctx) -> None:
    """An accepted ADR is an archive. The only permitted edit is the Status line
    (superseded by NNNN / deprecated). Anything else needs a new ADR."""
    for c in sorted(ctx.changed):
        if not is_adr(c) or c in ctx.added:
            continue
        p = ctx.root / c
        if not p.exists():
            continue
        before = before_version(ctx, c)
        if before is None:
            continue  # genuinely new (untracked) or no reference; adr-shape covers new ones
        after = p.read_text(encoding="utf-8", errors="replace")
        norm = lambda t: STATUS_LINE.sub("", t).strip()
        if norm(before) != norm(after):
            ctx.add("adr-immutable", "error", c,
                    "existing Architecture Decision Record edited beyond its Status line; ADRs are archives — write a superseding ADR instead")


def check_adr_shape(ctx: Ctx) -> None:
    for c in sorted(ctx.changed):
        if not is_adr(c):
            continue
        if ctx.git and c not in ctx.added and before_version(ctx, c) is not None:
            continue  # existing ADR: adr-immutable owns it
        p = ctx.root / c
        if not p.exists():
            continue
        text = p.read_text(encoding="utf-8", errors="replace")
        for sec in ADR_SECTIONS:
            m = re.search(rf"(?ms)^{re.escape(sec)}\s*\n(.*?)(?=^## |\Z)", text)
            body = re.sub(r"<[^>]*>", "", m.group(1)).strip() if m else ""
            if not body:
                ctx.add("adr-shape", "error", c, f"section '{sec}' missing or empty")


def check_orphan_docs(ctx: Ctx) -> None:
    """A doc nobody links to is a doc nobody reads, which is how it dies."""
    docs = all_docs(ctx.root)
    corpus = {d: (ctx.root / d).read_text(encoding="utf-8", errors="replace") for d in docs}
    for d in docs:
        if not d.startswith("docs/") or d in ("docs/ARCHITECTURE.md", "docs/WORKLOG.md") or is_adr(d):
            continue
        name = Path(d).name
        linked = any(
            (d in txt or name in txt) for other, txt in corpus.items() if other != d
        )
        if not linked:
            ctx.add("orphan-doc", "warn", d, "not linked from any other doc; link it from README or ARCHITECTURE, or delete it")


def normalize_para(t: str) -> str:
    return re.sub(r"\s+", " ", t).strip().lower()


def check_duplicate_blocks(ctx: Ctx) -> None:
    """Same paragraph in two docs means one owner too many."""
    seen: dict[str, str] = {}
    reported: set[tuple[str, str]] = set()
    for d in all_docs(ctx.root):
        if d == "docs/WORKLOG.md":
            continue
        text = (ctx.root / d).read_text(encoding="utf-8", errors="replace")
        text = re.sub(r"(?ms)^```.*?^```", "", text)
        for para in re.split(r"\n\s*\n", text):
            if para.lstrip().startswith(("#", "|", "-", "*", ">")):
                continue
            key = normalize_para(para)
            if len(key) < 160:
                continue
            if key in seen and seen[key] != d:
                pair = tuple(sorted((seen[key], d)))
                if pair not in reported:
                    reported.add(pair)
                    ctx.add("duplicate-block", "warn", d,
                            f"paragraph duplicated from `{seen[key]}`; keep one and link to it")
            else:
                seen.setdefault(key, d)


def check_template_residue(ctx: Ctx) -> None:
    for doc in all_docs(ctx.root):
        text = (ctx.root / doc).read_text(encoding="utf-8", errors="replace")
        # strip fenced code blocks; placeholders inside code are legitimate examples
        stripped = re.sub(r"(?ms)^```.*?^```", "", text)
        hits = []
        for m in PLACEHOLDER.finditer(stripped):
            token = m.group(0)[1:-1].split()[0].lower()
            if token in HTML_TAGS:
                continue
            hits.append(m.group(0))
        if hits:
            shown = ", ".join(dict.fromkeys(hits[:4]))
            ctx.add("template-residue", "error", doc, f"unfilled placeholder(s): {shown}")


def check_stale_markers(ctx: Ctx) -> None:
    for doc in all_docs(ctx.root):
        if doc == "docs/WORKLOG.md" or is_adr(doc):
            continue  # both are historical records by design
        text = (ctx.root / doc).read_text(encoding="utf-8", errors="replace")
        for i, line in enumerate(text.splitlines(), 1):
            if STALE.search(line):
                ctx.add("stale-marker", "warn", f"{doc}:{i}", f"changelog-style phrasing: {line.strip()[:80]}")
                break


def tokens(s: str) -> set[str]:
    s = re.sub(r"([a-z])([A-Z])", r"\1 \2", s)
    return {t for t in re.findall(r"[A-Za-z]{3,}", s.lower()) if t not in STOPWORDS}


def overlap(comment: set[str], code: set[str]) -> float:
    """Fraction of comment words that appear in the code, allowing a 4-char
    prefix match so load/loads and req/request count as the same word."""
    if not comment:
        return 0.0
    hit = 0
    for c in comment:
        for n in code:
            k = min(len(c), len(n), 4)
            if k >= 3 and c[:k] == n[:k]:
                hit += 1
                break
    return hit / len(comment)


def check_restating_comments(ctx: Ctx) -> None:
    for c in sorted(ctx.changed):
        if not is_source(c) or is_test(c):
            continue
        p = ctx.root / c
        prefix = COMMENT_PREFIX.get(p.suffix)
        if not prefix or not p.exists():
            continue
        lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        total = restating = 0
        for i, line in enumerate(lines):
            s = line.strip()
            if not s.startswith(prefix) or s.startswith(prefix * 2 + " ") and prefix == "#":
                continue
            body = s[len(prefix):].strip()
            if len(body) < 8 or body.startswith(("!", "type:", "noqa", "pragma", "eslint", "TODO", "FIXME")):
                continue
            # The comment describes either the code after it or the enclosing
            # definition before it; compare against both.
            nearby = ""
            for j in range(i + 1, min(i + 4, len(lines))):
                if lines[j].strip() and not lines[j].strip().startswith(prefix):
                    nearby += " " + lines[j]
                    break
            for j in range(i - 1, max(i - 3, -1), -1):
                if lines[j].strip() and not lines[j].strip().startswith(prefix):
                    nearby += " " + lines[j]
                    break
            ct = tokens(body)
            if not ct or not nearby.strip():
                continue
            total += 1
            if overlap(ct, tokens(nearby)) >= 0.5:
                restating += 1
        if total >= 3 and restating / total > 0.6:
            ctx.add("restating-comments", "warn", c,
                    f"{restating}/{total} comments restate the adjacent code; comments should explain why")


# ---------------------------------------------------------------- code style (references/code-style.md)

TODO_RE = re.compile(r"\b(TODO|FIXME|XXX|HACK)\b[:\s(]*(.*)", re.IGNORECASE)
OWNER_RE = re.compile(r"(@\w+|#\d+|\b[A-Z]{2,}-\d+\b|\([A-Za-z][\w .-]*\)|https?://)")
CODE_LIKE = re.compile(r"(=[^=]|\bdef\b|\bfunc\b|\breturn\b|\bif\b.*[:{]|[;{}]\s*$|\)\s*$|\w+\(.*\)|\bimport\b|\bconst\b|\blet\b|\bvar\b)")
DIRECTIVE = ("!", "type:", "noqa", "pragma", "eslint", "pylint", "fmt:", "nolint", "-*-", "coding", "TODO", "FIXME", "XXX", "HACK", "@")
TAB_LANGS = {".go", ".mk"}


def comment_lines(path: Path, prefix: str) -> list[tuple[int, str]]:
    """(line number, comment body) for every line that is only a comment."""
    out = []
    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return out
    in_block = False
    for i, line in enumerate(lines, 1):
        st = line.strip()
        if prefix == "//" and "/*" in st and "*/" not in st:
            in_block = True
            continue
        if in_block:
            if "*/" in st:
                in_block = False
            continue
        if st.startswith(prefix) and not st.startswith(prefix * 2 + " ") if prefix == "#" else st.startswith(prefix):
            out.append((i, st[len(prefix):].strip()))
    return out


def check_todo_shape(ctx: Ctx) -> None:
    for c in sorted(ctx.changed):
        if not is_source(c):
            continue
        p = ctx.root / c
        prefix = COMMENT_PREFIX.get(p.suffix)
        if not prefix or not p.exists():
            continue
        for i, line in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if prefix not in line:
                continue
            m = TODO_RE.search(line.split(prefix, 1)[1])
            if not m:
                continue
            rest = m.group(2).strip()
            words = len(re.findall(r"[A-Za-z]+", rest))
            problems = []
            if words < 6:
                problems.append("fewer than six words — state the problem and the action")
            if not OWNER_RE.search(rest):
                problems.append("no owner, ticket, or reference")
            if problems:
                ctx.add("todo-shape", "warn", f"{c}:{i}", "; ".join(problems) + f" — `{line.strip()[:70]}`")


def check_comment_sentences(ctx: Ctx) -> None:
    for c in sorted(ctx.changed):
        if not is_source(c) or is_test(c):
            continue
        p = ctx.root / c
        prefix = COMMENT_PREFIX.get(p.suffix)
        if not prefix or not p.exists():
            continue
        fossils, fragments, total = [], [], 0
        for i, body in comment_lines(p, prefix):
            if len(body) < 12 or body.startswith(DIRECTIVE) or body.endswith(("=", ",", "\\")):
                continue
            if CODE_LIKE.search(body) and not re.search(r"\b(the|a|an|this|because|so|when|if we|since)\b", body):
                fossils.append(i)
                continue
            total += 1
            if not (body[0].isupper() or body[0].isdigit() or body[0] in "\"'`") or body[-1] not in ".!?:)":
                fragments.append(i)
        if fossils:
            ctx.add("comment-sentence", "warn", f"{c}:{fossils[0]}",
                    f"{len(fossils)} line(s) look like commented-out code; delete — version control has it")
        if total >= 3 and len(fragments) / total > 0.5:
            ctx.add("comment-sentence", "warn", f"{c}:{fragments[0]}",
                    f"{len(fragments)}/{total} comments are not complete sentences (capital letter, terminal punctuation)")


def configured_line_length(root: Path, suffix: str) -> int:
    """The repo's own limit if it sets one; else 80. Convention beats preference."""
    try:
        ec = (root / ".editorconfig").read_text(encoding="utf-8", errors="replace")
        m = re.search(r"(?im)^\s*max_line_length\s*=\s*(\d+)", ec)
        if m:
            return int(m.group(1))
    except OSError:
        pass
    if suffix == ".py":
        for f, pat in (("pyproject.toml", r"(?im)^\s*line[-_]length\s*=\s*(\d+)"),
                       ("setup.cfg", r"(?im)^\s*max[-_]line[-_]length\s*=\s*(\d+)"),
                       (".flake8", r"(?im)^\s*max[-_]line[-_]length\s*=\s*(\d+)"),
                       ("tox.ini", r"(?im)^\s*max[-_]line[-_]length\s*=\s*(\d+)")):
            try:
                m = re.search(pat, (root / f).read_text(encoding="utf-8", errors="replace"))
                if m:
                    return int(m.group(1))
            except OSError:
                continue
    if suffix in (".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"):
        for f in (".prettierrc", ".prettierrc.json", "prettier.config.js", ".prettierrc.js", "package.json"):
            try:
                m = re.search(r"printWidth\W+(\d+)", (root / f).read_text(encoding="utf-8", errors="replace"))
                if m:
                    return int(m.group(1))
            except OSError:
                continue
    if suffix == ".rs":
        try:
            m = re.search(r"(?im)^\s*max_width\s*=\s*(\d+)", (root / "rustfmt.toml").read_text())
            if m:
                return int(m.group(1))
        except OSError:
            pass
    return 80


def check_line_length(ctx: Ctx) -> None:
    for c in sorted(ctx.changed):
        if not is_source(c) or is_test(c):
            continue
        p = ctx.root / c
        if not p.exists() or p.suffix in (".go", ".sql"):  # gofmt sets no limit; SQL is habitually wide
            continue
        limit = configured_line_length(ctx.root, p.suffix)
        lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        long = [i for i, l in enumerate(lines, 1) if len(l.expandtabs(4)) > limit and "http" not in l]
        if lines and len(long) >= 3 and len(long) / len(lines) > 0.05:
            ctx.add("line-length", "warn", f"{c}:{long[0]}",
                    f"{len(long)} line(s) exceed {limit} columns (repo limit or default 80)")


def check_mixed_indent(ctx: Ctx) -> None:
    for c in sorted(ctx.changed):
        if not is_source(c):
            continue
        p = ctx.root / c
        if not p.exists():
            continue
        tabs = spaces = 0
        for l in p.read_text(encoding="utf-8", errors="replace").splitlines():
            if l.startswith("\t"):
                tabs += 1
            elif l.startswith("  "):
                spaces += 1
        if tabs and spaces:
            ctx.add("mixed-indent", "warn", c, f"indents with both tabs ({tabs} lines) and spaces ({spaces} lines)")


# ---------------------------------------------------------------- subagent mode (references/subagent-mode.md)

INFERRED = re.compile(r"\bInferred:")


def check_handoff_present(ctx: Ctx) -> None:
    if ctx.top_entry is None:
        return  # worklog-entry already failed
    if not filled(entry_section(ctx.top_entry, "Handoff")):
        ctx.add("handoff-present", "error", "docs/WORKLOG.md",
                "no ### Handoff section from the coding agent; reconstructing reasoning without one is guesswork — report upstream")


def check_adr_sourced(ctx: Ctx) -> None:
    for c in sorted(ctx.changed):
        if not is_adr(c) or (ctx.git and c not in ctx.added and before_version(ctx, c) is not None):
            continue
        p = ctx.root / c
        if not p.exists():
            continue
        text = p.read_text(encoding="utf-8", errors="replace")
        m = re.search(r"(?ms)^## Sources\s*\n(.*?)(?=^## |\Z)", text)
        body = m.group(1) if m else ""
        if not filled(body):
            ctx.add("adr-sourced", "error", c, "no ## Sources section; every reason must trace to handoff, a code comment, a prior ADR, or be marked inferred")
            continue
        sources = [l.strip(" -*`").lower() for l in body.splitlines() if l.strip()]
        only_inferred = all(src.startswith("inferred") for src in sources)
        status = re.search(r"(?m)^\s*[-*]?\s*Status:\s*(.+)$", text)
        status_text = status.group(1).strip().lower() if status else ""
        if only_inferred and "unconfirmed" not in status_text:
            ctx.add("adr-sourced", "error", c, "sourced only from inference; Status must be 'accepted (unconfirmed)'")


def check_inferred_open(ctx: Ctx) -> None:
    if ctx.top_entry is None:
        return
    still_open = entry_section(ctx.top_entry, "Still open").lower()
    for c in sorted(ctx.changed):
        if not is_doc(c) or c == "docs/WORKLOG.md":
            continue
        p = ctx.root / c
        if not p.exists():
            continue
        n = len(INFERRED.findall(p.read_text(encoding="utf-8", errors="replace")))
        if n and not (("inferred" in still_open or "confirm" in still_open) and (c.lower() in still_open or Path(c).name.lower() in still_open)):
            ctx.add("inferred-open", "error", c,
                    f"{n} 'Inferred:' claim(s) with no confirmation item naming this doc under Still open")


def strip_comments(text: str, suffix: str) -> str:
    prefix = COMMENT_PREFIX.get(suffix, "#")
    if suffix == ".py":
        text = re.sub(r'(?s)"""(.*?)"""', "", text)
        text = re.sub(r"(?s)\'\'\'(.*?)\'\'\'", "", text)
    if prefix == "//":
        text = re.sub(r"(?s)/\*.*?\*/", "", text)
    out = []
    for line in text.splitlines():
        st = line.strip()
        if not st or st.startswith(prefix):
            continue
        # strip trailing comments outside of string literals (approximate)
        if prefix in line and not re.search(r"[\"\'].*" + re.escape(prefix), line):
            line = line.split(prefix, 1)[0]
        out.append(line.rstrip())
    return "\n".join(out)


def check_logic_touched(ctx: Ctx) -> None:
    if not ctx.git or not ctx.since:
        return
    diff = run(["git", "diff", "--name-only", ctx.since], ctx.root) or ""
    untracked = run(["git", "ls-files", "--others", "--exclude-standard"], ctx.root) or ""
    for c in sorted(set(diff.split()) | set(untracked.split())):
        if not is_source(c) or excluded(c):
            continue
        p = ctx.root / c
        before = run(["git", "show", f"{ctx.since}:{c}"], ctx.root)
        if before is None:
            ctx.add("logic-touched", "warn", c, "new source file created by the documentation subagent")
            continue
        if not p.exists():
            ctx.add("logic-touched", "warn", c, "source file deleted by the documentation subagent")
            continue
        after = p.read_text(encoding="utf-8", errors="replace")
        if strip_comments(before, p.suffix) != strip_comments(after, p.suffix):
            ctx.add("logic-touched", "warn", c,
                    "changed beyond comments and docstrings since the coder's end state; the subagent may not touch logic, names, or tests")


# ---------------------------------------------------------------- driver

def next_adr(root: Path) -> int:
    d = root / "docs" / "decisions"
    n = 0
    if d.is_dir():
        for p in d.glob("*.md"):
            m = re.match(r"(\d+)", p.name)
            if m:
                n = max(n, int(m.group(1)))
    return n + 1


def apply_waivers(ctx: Ctx) -> list[Finding]:
    kept = []
    for f in ctx.findings:
        waived = False
        for w in ctx.waivers:
            if w.check != f.check:
                continue
            if w.target is None or f.path == w.target or f.path.startswith(w.target.rstrip("/") + "/"):
                waived = True
                break
        if waived:
            f.level = "waived"
        kept.append(f)
    return kept


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=None, help="repository root (default: git toplevel or cwd)")
    ap.add_argument("--base", default=None, help="base ref for committed changes (default: origin/main|main|master)")
    ap.add_argument("--mode", choices=("author", "subagent"), default="author",
                    help="subagent: documenting code another agent wrote (see references/subagent-mode.md)")
    ap.add_argument("--since", default=None, help="subagent mode: the coder's final commit, to separate its edits from yours")
    ap.add_argument("--session-days", type=int, default=2, help="max age of the top worklog entry")
    ap.add_argument("--next-adr", action="store_true", help="print the next ADR number and exit")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    if args.root:
        root = Path(args.root).resolve()
    else:
        top = run(["git", "rev-parse", "--show-toplevel"], Path.cwd())
        root = Path(top.strip()).resolve() if top else Path.cwd().resolve()

    if args.next_adr:
        print(f"{next_adr(root):04d}")
        return 0

    changed, added_dirs, git, added, ref = detect_changes(root, args.base)
    ctx = Ctx(root=root, changed=changed, added_dirs=added_dirs, git=git,
              session_days=args.session_days, added=added, ref=ref, mode=args.mode, since=args.since)

    parse_worklog(ctx)
    check_coverage(ctx)
    check_new_dir_readme(ctx)
    check_dead_refs(ctx)
    check_dep_adr(ctx)
    check_adr_shape(ctx)
    check_adr_immutable(ctx)
    check_template_residue(ctx)
    check_orphan_docs(ctx)
    check_duplicate_blocks(ctx)
    check_stale_markers(ctx)
    check_restating_comments(ctx)
    check_todo_shape(ctx)
    check_comment_sentences(ctx)
    check_line_length(ctx)
    check_mixed_indent(ctx)
    if ctx.mode == "subagent":
        check_handoff_present(ctx)
        check_adr_sourced(ctx)
        check_inferred_open(ctx)
        check_logic_touched(ctx)

    findings = apply_waivers(ctx)
    errors = [f for f in findings if f.level == "error"]
    warns = [f for f in findings if f.level == "warn"]
    waived = [f for f in findings if f.level == "waived"]

    if args.json:
        print(json.dumps({
            "root": str(root), "git": git, "changed": sorted(changed),
            "errors": [f.__dict__ for f in errors], "warnings": [f.__dict__ for f in warns],
            "waived": [f.__dict__ for f in waived],
        }, indent=2))
        return 1 if errors else 0

    src_changed = sorted(c for c in changed if is_source(c))
    print(f"docbound audit · mode={ctx.mode} · root={root.name} · git={'yes' if git else 'no'} · "
          f"{len(changed)} changed file(s), {len(src_changed)} source")
    if not git:
        print("  (no git: whole tree scanned; doc-coverage not evaluated)")
    for label, group in (("ERROR", errors), ("WARN", warns), ("WAIVED", waived)):
        if not group:
            continue
        print(f"\n{label} ({len(group)})")
        for f in group:
            print(f"  [{f.check}] {f.path}\n      {f.message}")
    print()
    if errors:
        print(f"FAIL — {len(errors)} error(s). Fix them or add a waiver line to the worklog entry, then re-run.")
        return 1
    print("PASS" + (f" — {len(warns)} warning(s) left on the record" if warns else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
