# Checks

Twenty-three checks. Errors block; warnings print and do not block, but leaving
one is a choice made on the record.

Check IDs are a public interface. Agents write waiver lines against them in
repositories this project cannot see, so an ID is never renamed and a level is
never changed without a superseding decision record. Each ID is also the file name of its
implementation, in `skill/docbound/scripts/lib/checks/`.

## Waivers

A waiver goes in the `### Waivers` section of the current worklog entry:

```
waiver: doc-coverage src/legacy/parser.py - generated from the grammar in
src/legacy/parser.g; the grammar carries the contract and the generator is
documented in src/legacy/README.md.
```

The target is optional. With one, the waiver dismisses findings whose path is
that path or sits beneath it; without one, it dismisses every finding from that
check for this entry. Waivers apply to the top entry only, so one does not
outlive the task that justified it. A waived finding still appears in the
output, under `WAIVED`, and in the `waived` array of the JSON.

Two rules the audit cannot enforce. A waiver states a reason a reviewer would
accept, and "not relevant" is not one. And a waiver is an exception, not a
shortcut: the adoption record every repository gets says that waivers in more
than one entry in five mean the checks are mistuned.

## Errors

### `worklog-entry`

`docs/WORKLOG.md` was modified in this change set and its top entry is dated
within the session window (two days by default, `--session-days`).

Catching the case where a task began without an intent written first. That is
the ordering the whole discipline rests on: intent written before the code is a
prediction, and intent written after it is a summary.

Fires when the worklog is missing, has no entries, has no ISO date in its top
heading, or when the top entry predates the window.

```
waiver: worklog-entry - a one-line revert of yesterday's deploy; the entry that
covers it is the one directly above and reopening it would misdate the record.
```

### `worklog-closed`

The top entry's `Outcome` and `Still open` sections have content that is not a
template placeholder.

An entry with an empty Outcome is an entry nobody came back to. `Still open` is
the more valuable of the two and the one more often left blank: it is where a
TODO left in the code becomes visible without grepping.

```
waiver: worklog-closed - the audit is being run mid-task to check the docs so
far; the entry closes before this branch is pushed.
```

### `doc-coverage`

Every changed source file is covered in the same diff. Covered means one of two
things: its own or an ancestor module README was touched, or a system-level doc
(root `README.md`, `docs/ARCHITECTURE.md`, or a record under `docs/decisions/`)
was touched **and names the file or its directory**.

Touching an unrelated decision record does not cover a file. That distinction is
the check: without it, any doc edit anywhere would satisfy it, and the check
would measure diligence rather than coverage.

Exempt: test files, files at or under fifteen non-blank lines, deleted files,
and everything when there is no git repository to diff against.

```
waiver: doc-coverage src/generated/api_types.ts - emitted by the codegen step in
scripts/codegen.mjs; the contract lives in the schema, not in this file.
```

### `new-dir-readme`

Every new directory containing source has a `README.md`.

A new directory is a new module, and a module whose contract lives only in the
head of whoever wrote it is a module the next reader has to reverse-engineer.
`skill/docbound/templates/MODULE.md` is the starting point.

Test directories are exempt.

```
waiver: new-dir-readme src/migrations - one file per migration, each documented
by its own docstring; a README here would restate the directory listing.
```

### `dead-ref`

No doc references a backticked path that does not exist.

This is the mechanism that keeps docs tethered to code. A claim with a path is
checkable; a claim without one is an opinion, and a claim with a path that has
moved is worse than either. It is also what fires when a rename lands without
its documentation.

Anything with a scheme, a glob character, or a leading `$`, `-`, `<`, `{`, `@`,
or `#` is skipped, as is a bare word with no slash and no dot. Paths are
resolved from the repository root and from the doc's own directory.

```
waiver: dead-ref docs/ONBOARDING.md - the paths under vendor/ are created by the
bootstrap script on first run and are absent in a fresh checkout.
```

### `diagram-refs`

No node in a Mermaid diagram names a path that does not exist.

A diagram is the first thing a reader trusts and the last thing anyone updates,
which makes a stale one the most confidently wrong artifact a repository can
carry. This is `dead-ref` for the boxes: prose and picture rot at different
rates because a rename reaches every sentence and none of the labels.

Only path-shaped tokens are read as paths: a file with a known extension, or a
directory with a trailing slash. Labels like read/write, input/output, 24/7,
and Node.js are prose, not references. That rule is also the convention: in a
diagram, name a path the way you would in prose. URLs, comment lines beginning
`%%`, and Mermaid's own syntax are skipped.

Every fenced ```mermaid block in every doc is checked, not just the one in
`docs/ARCHITECTURE.md`.

```
waiver: diagram-refs docs/ARCHITECTURE.md - the diagram shows the target
topology from ADR 0012, not the current one; the boxes that do not resolve are
the ones the migration creates.
```

### `dep-adr`

A changed dependency manifest has a new or superseding record under
`docs/decisions/` in the same diff.

A dependency is a decision with a support cost, a licence, and a supply chain.
The manifests recognised are the usual ones for the major ecosystems, plus any
`requirements*.txt`.

```
waiver: dep-adr package.json - a patch-level bump of an existing dependency for
a security advisory; the choice of the dependency is recorded in ADR 0004.
```

### `adr-shape`

Every new decision record has `## Context`, `## Decision`, and
`## What would reverse this` sections with content.

The third is the one that gets skipped and the one that matters most. "We chose
X" is a decision that will be re-litigated from scratch; a reversal condition is
a decision that can be revisited.

Only new records are checked; an existing one belongs to `adr-immutable`.

```
waiver: adr-shape docs/decisions/0009-vendor-selection.md - the reversal
condition is the contract's renewal date, which is not public and sits in the
procurement record linked from Context.
```

### `adr-immutable`

An existing decision record was not edited except on its `Status` line.

A record is an archive of what was believed when the decision was made. Editing
the body to match what the code does now destroys the only thing the record was
for. Supersede instead: write a new record naming the old one in `Supersedes`,
and change the old one's `Status` to `superseded by NNNN`.

```
waiver: adr-immutable docs/decisions/0002-queue.md - repairing a path in the
Decision section that was renamed in the same commit; the reasoning is untouched.
```

### `template-residue`

No doc contains an unfilled template placeholder.

A header with a placeholder under it tells the reader the file is unreliable,
which contaminates the sections that were filled in. A scaffolded doc failing
this check is the intent, not a defect: the scaffold creates structure, and
structure is not documentation.

Placeholders inside fenced code blocks are examples and are skipped, as are
common HTML tag names.

```
waiver: template-residue docs/RUNBOOK.md - the angle-bracketed tokens are the
literal syntax of the alerting query language, inside a table rather than a
fence.
```

## Warnings

### `orphan-doc`

Every doc under `docs/` other than `ARCHITECTURE.md`, `WORKLOG.md`, and the
decision records is linked from at least one other doc.

A doc nobody links to is a doc nobody reads, which is how it dies. Either link
it from the README or from ARCHITECTURE, or delete it. The default is delete.

```
waiver: orphan-doc docs/INCIDENTS.md - written for the on-call rotation, which
reaches it from the alert runbook rather than from this repository.
```

### `duplicate-block`

No paragraph of substance appears verbatim in two docs. Substance means 160
characters or more after whitespace normalisation.

Two copies of a fact are one fact and one future lie. Link to the owner instead;
if the owner's version is wrong, fix it there. Headings, list items, table rows,
block quotes, and fenced code are not compared.

```
waiver: duplicate-block docs/SECURITY.md - the disclosure paragraph is
reproduced verbatim because the security policy is published from this file and
must match the one in the organisation profile exactly.
```

### `stale-marker`

Docs do not contain changelog phrasing, meaning the tense-mixing vocabulary a
section picks up when it is patched instead of rewritten. The word list is in
`skill/docbound/scripts/lib/checks/stale-marker.mjs`.

The worklog is the changelog; every other doc is rewritten to be true now. A
section that accumulates dated update paragraphs instead of being rewritten has
more than one tense and no owner.

The worklog and the decision records are exempt, since both are historical by
design.
One finding per doc, at the first line that matches.

```
waiver: stale-marker docs/MIGRATION.md - the whole document is about moving off
the old format and cannot be written without naming what came before.
```

### `restating-comments`

A changed source file does not consist mostly of comments that restate the
adjacent code.

The threshold is deliberately loose: at least three comments, and more than
sixty percent of them overlapping the surrounding code by half their words. One
unavoidable restatement is not a finding, and a file of them is.

```
waiver: restating-comments src/vendor/parser.c - vendored upstream; reformatting
its comments would make the next merge unreadable.
```

### `todo-shape`

Every TODO, FIXME, XXX, or HACK in changed source states a problem and an action
in six or more words, and names an owner, ticket, or reference.

`TODO: fix this` is noise. A TODO is a message to a specific future reader about
a specific problem, and the skill also asks that it appear under `Still open` in
the worklog so a human sees it without grepping.

Only comments are searched, so a marker inside a string literal is not a TODO.

Test files are **not** exempt: a stale TODO in a test is as misleading as one
anywhere else.

```
waiver: todo-shape src/net/retry.go:88 - upstream's own TODO, kept verbatim so
the next sync is a clean diff.
```

### `comment-sentence`

Full-line comments in changed source are complete sentences, opening with a
capital letter, a digit, or a quote and closing with terminal punctuation. No
comment line looks like commented-out code.

A run of adjacent comment lines is judged as one comment, because that is what
a reader reads. Judging each line separately made every continuation of a
wrapped sentence a fragment. A directive and a line of commented-out code end a
run rather than joining it, since neither is prose.

Two findings from one pass. Commented-out code is reported whenever any is
found, because version control already has it and a reader cannot tell whether a
fossil is a plan, a warning, or trash. Fragments are reported only when more than
half of at least three comments are fragments.

Test files are exempt. Directives, pragmas, and TODO markers are skipped.

```
waiver: comment-sentence src/dsp/fft.c:41 - the fragments are the standard
symbol glossary for the transform, matching the notation in the cited paper.
```

### `line-length`

Changed source respects the line length the repository configures, or 80 when it
configures none.

Convention beats preference. The limit comes from `.editorconfig` first, then
from a Python project, flake8, or tox config, a Prettier config for the
JavaScript family, or a rustfmt config for Rust. The exact files and keys are in
`skill/docbound/scripts/lib/checks/line-length.mjs`.

Fires only when at least three lines and more than five percent of the file
exceed the limit. Lines containing a URL are ignored. Go and SQL files are
skipped entirely, since gofmt sets no limit and SQL is habitually wide. Test
files are exempt.

```
waiver: line-length src/i18n/strings.ts:210 - one translated string per line;
wrapping them would put the literals out of alignment with the source catalogue.
```

### `mixed-indent`

No changed source file indents with both tabs and spaces.

Mixed indentation renders differently in every editor, which turns a diff into
an argument about whitespace. Test files are **not** exempt.

```
waiver: mixed-indent Makefile.d/build.sh - the here-doc it emits is a makefile
recipe, which must be tab-indented inside a space-indented script.
```

### `open-item-typo`

No two slugs on `Still open` items are within two characters of each other.

A slug is what lets one piece of unfinished work be carried across entries
without being retyped. Typed slightly wrong, it opens a second item that looks
like the first and tracks separately, and neither copy is wrong on its face.

`docbound close` refuses a slug that is not already open and prints the ones
that are, so a typo made through the command is an error message. Nothing
protects the file when it is edited by hand, which is what this covers.

Only slugs of six characters or more are compared, since short ones collide
innocently. Both open and closed items are considered, because closing the wrong
slug leaves the real item open.

A warning rather than an error: two genuinely different items can be one edit
apart, and blocking a task over a naming coincidence would be a check about
spelling rather than about truth.

```
waiver: open-item-typo docs/WORKLOG.md - retry-backoff and retry-backups are
different items; the first is about timing and the second about persistence.
```

## Subagent mode

Added by `--mode subagent`. They exist for one risk: reconstructed reasoning
presented as recorded reasoning. See
`skill/docbound/references/subagent-mode.md`.

### `handoff-present` (error)

The worklog entry has a `### Handoff` section with content from the coding
agent.

The handoff is the documentation agent's only source of stated reasoning.
Without it every recorded *why* is a reconstruction. A failure here is the
coding agent's bug and the fix is upstream. That is exactly why it is an error
rather than something the documenter can write around.

```
waiver: handoff-present - documenting a commit from before this repository
adopted docbound; every reason below is marked Inferred and queued for
confirmation.
```

### `adr-sourced` (error)

Every new decision record has a `## Sources` section, and one sourced only from
`inferred` carries Status `accepted (unconfirmed)`.

A source is `handoff`, a `path:symbol` where the reasoning is commented, a prior
record, or `inferred`. The decision exists in the code whether or not anyone
explains it, so an inferred-only record is still written. It is marked, and it
is carried under `Still open` until someone confirms it.

```
waiver: adr-sourced docs/decisions/0011-cache-ttl.md - sourced from the incident
review linked in Context, which is neither a handoff nor a file in this
repository.
```

### `inferred-open` (error)

Every `Inferred:` marker in a changed doc has a matching confirmation item under
`Still open` that names that doc.

An inference is a question. A question with nowhere to be answered becomes a
fact by attrition, which is the failure mode the whole mode is designed around.

```
waiver: inferred-open docs/ARCHITECTURE.md - the confirmation item names the
section rather than the file, because three separate inferences in it are
confirmed by one question to the author.
```

### `logic-touched` (warn)

Given the coder's final commit through `--since`: the documentation agent's diff, with comments and
docstrings stripped, changes nothing.

Naming is the coder's first mechanism of communication. A documenter that
renames is editing the thing it was sent to describe, and a rename it believes
in belongs under `Still open` as a proposal with the current name, the proposed
name, and the reason.

Documentation is removed by the span scanner, which distinguishes a comment
marker inside a string from a comment. An ordinary string literal is kept,
because changing one is a logic change. A language the scanner has no entry for
falls back to the line-based approximation.

```
waiver: logic-touched src/api/handlers.py - deleted a block of commented-out
code, which the subagent contract allows and this comparison cannot distinguish
from a logic edit.
```

## Where to go next

- `skill/docbound/SKILL.md`: the loop these checks close, and the summary table
- `docs/DEVELOP.md`: adding a check
- `docs/subagent.md`: wiring the documentation subagent
