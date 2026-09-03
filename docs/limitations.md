# What docbound does not catch

Every check here is a heuristic over English and file paths. This page is the
list of things it gets wrong or does not attempt, kept so that a reader can
decide what to trust rather than discovering the edges one at a time.

These are known and deliberate. Work that is actually planned lives in
`docs/WORKLOG.md` under `Still open`; this page is the part that is not going to
change soon, and much of it never will.

## Reading source

The scanner is a lexer with a delimiter table, not a parser
(`docs/decisions/0016-span-scanner-not-a-parser.md`). What follows is the price
of that choice.

- The inside of a template literal or an f-string reads as string, not code, so
  a finding inside one is suppressed rather than invented. The safer direction,
  and still wrong.
- A JavaScript regular expression containing a quote or a comment marker is read
  wrongly. Telling a regex literal from division needs a parser.
- TSX, JSX, Vue, and Svelte are deliberately absent from the language table,
  because each nests a second syntax. They fall back to the line-based path.
- `restating-comments` still reads source with a regular expression, comparing a
  comment against whichever line sits nearby. Moving it onto the scanner means
  deciding what a comment is attached to, which the scanner does not answer.

## Paths and references

- `dead-ref` discards the symbol half of a reference: a path written with a
  trailing colon and a function name is checked as a file, and the function is
  not looked for.
- A dead directory written in prose without backticks goes uncaught.
- The bare-name index skips a fixed list of vendor directories. A repository
  keeping dependencies elsewhere has them in the index, where they can satisfy a
  reference that should have failed.
- `diagram-refs` reads a diagram's labels, not its structure. Every box can
  exist while every arrow is wrong.
- The seeded architecture diagram's instructional text begins with a capital
  letter, so `template-residue` does not see it and a half-filled diagram
  section passes.

## Coverage

- `doc-coverage` is satisfied by a doc touched anywhere in the change set. On a
  long branch, one edit to a module README covers every later change to that
  module. A per-commit mode would close it at the cost of the working-tree
  workflow.
- Nothing stops a repository moving its baseline forward to dodge findings. The
  baseline is a tracked file, so the move appears in review; that is the whole of
  the defence (`docs/decisions/0019-adoption-baseline.md`).

## The ledger

- `open-item-typo` compares slugs within two edits. A slug three characters
  wrong opens a second item silently, and a wider threshold would start matching
  genuinely different slugs.
- `open-item-form` reads a slug beside a closing word as an attempt to close it,
  so an entry discussing an item it is not finishing gets a warning it does not
  deserve.
- It is also the first check whose cost grows with the worklog's length rather
  than with the diff.
- `docbound close` writes into the newest entry, so a closing is recorded where
  it was noticed rather than beside the item it closes. Following one item means
  reading two entries.
- `entry-length` counts a wrapped bullet's later lines as prose, though bullets
  are structure. Twelve lines is four times what the old instruction asked for
  and has no other evidence behind it.
- Entries written before `t=` existed carry no timestamp, so `summary` shows no
  age for that history.
- The worklog has no errata mechanism. The convention that emerged is a
  `Correction, t=` paragraph above the original text, and no check knows what
  that looks like.

## What no check can hold

Each of these is a rule the skill states and nothing enforces. They are held by
reading, which is stated here rather than implied.

- That a finding recommends documentation rather than logic
  (`docs/decisions/0026-docbound-does-not-recommend-logic.md`). A check cannot
  tell the two apart when both are English.
- That prose follows the sentence-level patterns in
  `skill/docbound/references/anti-patterns.md`. A document ignoring all six
  passes the audit.
- That an example in shipped text is invented rather than borrowed.
- That a record's `## What to do` line matches the decision underneath it.
- `plain-opening` measures whether an opening sentence carries no identifier,
  which a paragraph of filler satisfies.
- One `## Corrections` section quiets `stale-marker` for a whole record, so a
  second false claim added later goes unreported.
- `stale-marker` matches the vague-duration phrasings that have caused a real
  error here. An unmeasured span written another way passes.

## Configuration and shape

- The worklog archive exemption is the path `docbound prune` writes. A
  repository archiving somewhere else gets no exemption short of
  `audit.exclude`.
- HISTORY.md, CHANGES.md, and NEWS are historical documents by any
  reasonable reading and are not in the set; only `CHANGELOG.md` is
  (`docs/decisions/0041-the-historical-set-is-every-record-of-the-past.md`).
- A waiver target containing a space cannot be written, because a target is one
  token.
- `docbound-ignore` regions do not nest: the first end marker closes the region.
- Excluding a file from the audit costs it every check, not the one that was
  wrong about it.
- `todo-shape` and `comment-sentence` fire on prose *about* themselves, which a
  repository whose subject is documentation vocabulary will meet constantly.
- The reserved route basenames in `new-dir-readme` date with the frameworks that
  chose them, and a directory whose only source file is named `index` is exempt
  everywhere (`docs/decisions/0036-route-directories-are-not-modules.md`).
- A lockfile bump blocks until somebody writes a record. Whether that trade is
  right is unmeasured; how often it gets waived is the measurement.
- A finding the edit hook reported once can scroll out of an agent's context and
  not be repeated until the stop hook blocks.
- `docbound start` records the agent as "agent" unless told otherwise, because
  no harness exports which agent is running.
- `summary --entries` defaults to five, chosen without evidence.

## Where the audit stops

- `summary` is exactly as good as the documentation under it. On a
  part-way-adopted repository it is partial, and nothing distinguishes "this
  module has no must-not list" from "this module's must-not list is empty on
  purpose".
- `scaffold` creates everything or nothing. A repository with some of the
  structure has no command that fills only the gaps.
- No check reads a document's claims about what the software supports. The
  provider list is the one claim that could be compared against
  `cli/providers.mjs` mechanically, and is not.
- A repository that used docbound for line width or indent consistency has
  neither. The answer is a formatter, and nothing in the install path says so
  (`docs/decisions/0026-docbound-does-not-recommend-logic.md`).
- The line index built for a file costs one offset per line for the length of
  the call, unmeasured against a generated file near the two-megabyte cap.
- Three calls in `cli/index.mjs` exit 2 for what are failed operations rather
  than usage errors: a missing `--source` target, an ADR file that already
  exists, and a failed next-number lookup.
- `tests/package.test.mjs` shells out to `npm`, so the suite needs npm on the
  path (`docs/decisions/0009-package-is-the-artifact.md`).
