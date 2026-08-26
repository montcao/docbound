#!/usr/bin/env python3
"""Bootstrap the docbound structure in a repository.

Creates, from templates, whatever is missing:

  README.md
  docs/ARCHITECTURE.md
  docs/WORKLOG.md          (with one open entry for the adoption task)
  docs/decisions/0001-adopt-docbound.md
  <top-level source dir>/README.md   for each top-level directory holding source

Never overwrites. Run from the repository root (or pass --root).

Templates contain <placeholders>. The audit fails on unfilled placeholders on
purpose: a scaffolded doc is not a doc until it says something true.
"""

from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATES = HERE.parent / "references" / "templates"

SOURCE_EXT = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs", ".go", ".rs", ".java",
    ".kt", ".rb", ".php", ".cs", ".c", ".cc", ".cpp", ".h", ".hpp", ".swift",
    ".scala", ".ex", ".exs", ".erl", ".hs", ".ml", ".clj", ".lua", ".dart",
    ".sh", ".bash", ".zsh", ".sql", ".proto", ".graphql", ".vue", ".svelte",
}
EXCLUDE_DIRS = {
    ".git", "node_modules", "vendor", "dist", "build", "target", ".venv", "venv",
    "__pycache__", ".agents", ".claude", ".github", ".idea", ".vscode", "docs",
    "coverage", ".next", ".cache", "out",
}


def read_template(name: str) -> str:
    return (TEMPLATES / name).read_text(encoding="utf-8")


def write_if_missing(path: Path, content: str, created: list[Path]) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    created.append(path)


def has_source(d: Path) -> bool:
    for p in d.rglob("*"):
        if any(part in EXCLUDE_DIRS for part in p.relative_to(d).parts):
            continue
        if p.is_file() and p.suffix in SOURCE_EXT:
            return True
    return False


def skill_refs(root: Path) -> tuple[str, str]:
    """How to refer to the skill and its audit from inside the target repo.
    Backticked paths are checked by the audit, so only backtick paths that exist in the repo."""
    skill_dir = HERE.parent.resolve()
    try:
        r = skill_dir.relative_to(root).as_posix()
        return f"`{r}/`", f"`{r}/scripts/audit.py`"
    except ValueError:
        return f"{skill_dir} (outside the repository)", "the skill's scripts/audit.py"


def adoption_adr(today: str, root: Path) -> str:
    skill_ref, audit_ref = skill_refs(root)
    return f"""# 0001. Adopt docbound as the documentation discipline

- Date: {today}
- Status: accepted
- Supersedes: none

## Context

Code in this repository is written and modified by AI agents across sessions that
do not share memory. The discipline follows established industry and academic
documentation practice (minimum viable docs, update docs with code, delete dead
docs, good over perfect, docs as the story of the code, no duplication). Without a discipline that captures reasoning at the moment
it happens, the *why* behind the code is lost between sessions and re-derived,
often incorrectly, by the next one.

## Options

### Document at the end of each task

Cheapest per task. Produces summaries of diffs rather than descriptions of the
system, and decisions are reconstructed after the fact rather than recorded when
the alternatives were still in view.

### Continuous documentation with a blocking audit (docbound)

Docs move in the same step as the code; decisions are recorded when made; a
deterministic audit ({audit_ref}) defines "done." Costs a few minutes per
task. Produces docs that describe the current system and a decision trail that
can be revisited.

## Decision

Adopt docbound. The skill lives at {skill_ref}. Every task
opens a worklog entry before the first edit and cannot close until the audit
exits 0.

## Consequences

Tasks take slightly longer. `docs/WORKLOG.md` grows and needs periodic pruning
of entries older than a quarter. Stale documentation encountered during any task
becomes that task's responsibility to fix.

## What would reverse this

If the audit's false-positive rate makes waivers routine (more than one in five
entries carries a waiver), the checks need retuning or the discipline is not
fitting this repository and should be replaced.
"""


def worklog_initial(today: str) -> str:
    entry = read_template("WORKLOG-entry.md")
    entry = entry.replace("<YYYY-MM-DD>", today).replace(
        "<task title, as a verb phrase>", "Adopt docbound and write initial documentation"
    )
    return (
        "# Worklog\n\n"
        "Newest entry first. One entry per task. Intent is written before the first\n"
        "edit; Outcome and Still open are written after the audit passes.\n"
        "Entries older than a quarter can be pruned once their content is reflected\n"
        "in ARCHITECTURE, module READMEs, or Architecture Decision Records (ADRs).\n\n"
        + entry
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=".", help="repository root (default: cwd)")
    ap.add_argument("--dry-run", action="store_true", help="print what would be created")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"not a directory: {root}", file=sys.stderr)
        return 2
    today = dt.date.today().isoformat()
    created: list[Path] = []

    plan: list[tuple[Path, str]] = [
        (root / "README.md", read_template("README.md")),
        (root / "docs" / "ARCHITECTURE.md", read_template("ARCHITECTURE.md")),
        (root / "docs" / "WORKLOG.md", worklog_initial(today)),
        (root / "docs" / "decisions" / "0001-adopt-docbound.md", adoption_adr(today, root)),
    ]

    for d in sorted(p for p in root.iterdir() if p.is_dir()):
        if d.name in EXCLUDE_DIRS or d.name.startswith("."):
            continue
        if has_source(d):
            plan.append((d / "README.md", read_template("MODULE.md")))

    for path, content in plan:
        if path.exists():
            continue
        if args.dry_run:
            print(f"would create {path.relative_to(root)}")
        else:
            write_if_missing(path, content, created)

    if args.dry_run:
        return 0
    if not created:
        print("nothing to create; structure already present")
        return 0
    print("created:")
    for p in created:
        print(f"  {p.relative_to(root)}")
    print(
        "\nNext: read the code, replace every <placeholder> with a true statement,\n"
        "delete sections that do not apply, then run scripts/audit.py."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
