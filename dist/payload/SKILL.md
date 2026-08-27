---
name: docbound
description: Continuous documentation discipline for any coding task in a repository, built on established industry and academic documentation practice (minimum viable docs, update docs with code, delete dead docs, docs as the story of the code, no duplication) and code-communication standards (clear code before comments; naming, structure, context, then comments; the repo's existing convention wins). Vendor-agnostic. Use whenever writing, modifying, refactoring, or reviewing code, not only when asked to "document". Covers reading docs before touching code, a worklog entry before the first edit, recording decisions when made (inline, or as an Architecture Decision Record), keeping README / ARCHITECTURE / module READMEs / API docstrings current in the same change as the code, actionable comments and TODOs, trimming dead docs, and a blocking doc audit that defines done. Also use to bootstrap docs in a bare repo, to audit, triage, or refresh stale docs, or as a subagent documenting code another agent wrote.
---

# docbound

Documentation is a work product of every task, not a byproduct of finishing one.

Terms used throughout: **ADR** — Architecture Decision Record, a short file recording one decision and its rejected alternatives (`docs/decisions/`). **Worklog** — `docs/WORKLOG.md`, one entry per task, intent written before the code and outcome after. **Audit** — `scripts/audit.mjs`, the deterministic check that defines done.

This skill exists because agent-written code has a specific failure: the author does not persist. Every session is a new engineer with no memory of why anything is shaped the way it is. If the *why* is not written down in the moment it is decided, it is gone.

The reader: a strong engineer who joins in six months with no chat history and no access to you. Every doc you touch should let that person act correctly without asking anyone.

## Foundation

Six principles, distilled from published engineering documentation guides used across industry and from academic technical-communication practice. They are not tied to any vendor, language, or toolchain. Each maps to a mechanism in this skill. When a situation is not covered below, resolve it by these.

**1. Minimum viable documentation.** A small set of fresh, accurate docs beats a large assembly in various states of disrepair. Docs are a bonsai: alive, frequently trimmed. → Fixed taxonomy so agents update rather than sprawl; a trim pass in every task; length is a cost, not a virtue.

**2. Update docs with code.** The doc changes in the same change as the code. It is also where you explain to the reviewer what you did. → The `doc-coverage` check: a changed source file with no covering doc in the same diff fails the audit.

**3. Delete dead documentation.** Dead docs misinform, slow people down, and set a precedent for leaving messes. Delete what you are certain is wrong; ignore what is unclear; default to delete. → Stale docs you encounter are in scope for your task. `dead-ref` and `orphan-doc` checks. A triage mode for repos in bad shape.

**4. Prefer the good over the perfect.** There is no perfect document. → The audit defines done. When it passes, stop. Do not polish past it.

**5. Documentation is the story of the code.** Write for humans first, computers second. There is a spectrum from meaningful names, through inline comments and API docstrings, to READMEs, docs directories, and design docs — and design docs become archives once the code exists. → The taxonomy below follows that spectrum exactly. ADRs are immutable after acceptance; the `adr-immutable` check enforces it.

**6. Duplication is evil.** Do not write your own copy of something that exists; link to it. Take ownership of the canonical location instead. → One owner per fact. The `duplicate-block` check flags copied paragraphs.

Beneath these, for the code itself, the code-communication standard in `references/code-style.md`, drawn from academic scientific-software guidance and the major language style guides: **write clear code before adding comments**. Four mechanisms communicate logic — naming, structure, context, comments — and they are tried in that order. Style is a convention, so where the repository already has one, it wins over this skill. → The Orient step identifies the repo's convention; the Work step tries a rename and a restructure before a comment; the `todo-shape`, `comment-sentence`, `line-length`, and `mixed-indent` checks put drift on the record.

## What "done" means

A task is not done until `scripts/audit.mjs` exits 0. Not "mostly passes," not "warnings only," not "I'll note it for the human." If the audit fails, the task is open. Fix the docs, re-run, then report.

If you believe the audit is wrong about a specific finding, say so with a waiver line in the worklog entry (`waiver: <check-id> [target] — <reason>`). The audit honors waivers for the current entry only, and the human sees them. Waivers document a considered exception; they are not a way to skip work.

Per principle 4: when the audit passes, you are done. Do not keep improving docs the audit did not ask about unless the task was documentation.

## Two modes

**Author mode** (default): you are writing the code. Run the loop below; decisions are recorded as you make them.

**Subagent mode**: you were invoked to document code another agent wrote, in this session or a prior one. Read `references/subagent-mode.md` before anything else. The loop is the same, with three differences: the coding agent's `### Handoff` section in the worklog is your only source of real *why*; every reason you reconstruct from the diff is marked `Inferred:` and queued for confirmation under `Still open`; and you edit docstrings and comments in code but never logic, names, or tests. Run the audit with `--mode subagent`.

When in doubt, you are in subagent mode.

If you are the coding agent and a documentation subagent will run after you, write the `### Handoff` section of your worklog entry as you work — what you chose over what, what you were unsure of, what you deliberately left out. Without it, the subagent has nothing but inference, and the audit will say so.

## The spectrum — where each kind of information lives

Terse to prose. Each tier has one job. Information in the wrong tier is either lost or duplicated.

| Tier | Carries | Lives in | Rule |
|---|---|---|---|
| Names | What a thing is | Identifiers, files, directories | Nouns for things, verbs for actions; length proportional to scope; the repo's casing convention. Before writing a comment, try renaming. |
| Inline comments | *Why* the code is there; what naming, structure, and context cannot say | Next to the code | Complete sentences. Never *what*. TODOs name the problem, the action, and an owner. Maintained with the code. |
| Method API docs | The contract: arguments, returns, errors, restrictions, gotchas | Docstring / header of public functions and methods | Every behavior documented here should have a test. Private helpers need none unless surprising. |
| Class / module API docs | Overview of what the module does; simplest usage first | Module docstring or module `README.md` | Examples earn their place when there is more than one way to use it. |
| `README.md` | Orientation: what this directory holds, which files to read first, who owns it, status, how to use, where to learn more | Top of every package directory. Never inside `docs/`. | Short. Points outward. |
| `docs/` | How to get started, run tests, debug, release; system shape; decisions; worklog | `docs/ARCHITECTURE.md`, `docs/decisions/`, `docs/WORKLOG.md` | Present tense. Describes the system, not the history — history is the worklog. |
| Design docs / Architecture Decision Records (ADRs) | Why a decision was made, what was rejected, what would reverse it | `docs/decisions/NNNN-slug.md` | An archive. Immutable after acceptance; supersede, never edit. |
| External docs | Anything maintained elsewhere (wiki, Drive, Notion) | Elsewhere | Link to it from the root README. Never copy it in. |

## The loop

Run this on every task, in order. Steps 1 and 2 happen before the first code edit.

### 1. Orient — read before you write

Run `node scripts/summary.mjs`. It assembles what the repository already says about itself from the docs alone, reading no source: purpose, shape, each module's contract and must-not list, every decision with its reversal condition, recent worklog entries, and what is still open. Where the docs are missing it names what it looked for.

Without it, read in this order whatever exists: root `README.md`; `docs/ARCHITECTURE.md`; the three most recent entries in `docs/WORKLOG.md`; `README.md` in every directory you expect to touch; any ADR in `docs/decisions/` whose title touches your area.

If none of these exist, run `node scripts/scaffold.mjs` from the repo root first. It creates the structure from templates without overwriting anything.

Also identify the repository's code style convention before writing code: linter and formatter config, `.editorconfig`, a CONTRIBUTING or style doc, and the existing code itself. That convention wins over `references/code-style.md` wherever they differ. If there is no convention, `code-style.md` decides.

While reading, note anything already false. Stale docs you encounter are in scope for your task (principle 3): fix or delete them, and say so in the worklog entry. Leaving a known-false claim in place because "it wasn't my task" is how docs die.

### 2. Declare — open the worklog entry before the first edit

Run `node scripts/start.mjs "Add rate limiting"`, or prepend an entry to `docs/WORKLOG.md` from `templates/WORKLOG-entry.md` by hand. It records intent *before* you know how it turns out: what you are trying to do, which modules you expect to touch, what you do not yet know. Its value is that it is written before the code.

Leave `Outcome` and `Still open` empty until step 5.

### 3. Work — the doc moves in the same change as the code

The core rule (principle 2): **a change that alters behavior, a contract, a boundary, or a dependency is incomplete until the doc that covers it is updated in the same change.** Not batched to the end. End-of-task documentation is a summary of a diff; in-step documentation is an explanation of a system.

Which doc, by kind of change:

| Change | Update in the same step |
|---|---|
| Public function/method signature, return, errors, restrictions | Its API docstring — the contract — and the test that verifies the documented behavior |
| Entry point, setup, test/debug/release commands, top-level layout, status, ownership | Root `README.md` |
| Anything crossing a module boundary, data flow, invariant, external interface | `docs/ARCHITECTURE.md`, including its diagram if the boundary is drawn there |
| New directory or package | New `README.md` in it, from `templates/MODULE.md` |
| A module's purpose, contract, or "must never do" list | That module's `README.md` |
| A choice with a plausible alternative | A decision record — step 4 |
| Code that would surprise a competent reader | First a better name, then a clearer structure, then context. Only if all three fail, an inline comment explaining *why* — a complete sentence |
| Any TODO or FIXME left in code | The problem, the action, and an owner in the comment; the same item under `Still open` in the worklog |

When you update a doc, update it as the owner. Rewrite the paragraph so it is true now. Do not append "Update: as of task X…" — that is a changelog, and the worklog already is one. Do not copy a paragraph from another doc; link to it (principle 6).

### 4. Decide — capture decisions when they are made

The moment you choose between alternatives, record it. The instant you reject option B is the only time you fully know why.

Two tiers. Pick by consequence, not by how much you feel like writing.

**Structural — write an Architecture Decision Record (ADR).** An ADR is a short file that captures one decision: the situation, the options considered, what was chosen, why, and what would reverse it. Write one (`docs/decisions/NNNN-slug.md`, from `templates/ADR.md`) when the decision adds, removes, or replaces a dependency; changes a schema, data model, storage format, or wire format; defines or changes an interface another module or system depends on; crosses or creates a module boundary; would be expensive or risky to reverse; or trades off security, correctness, or performance against something else.

**Small — one row in the `Decisions` table** of the nearest module `README.md` (or `docs/ARCHITECTURE.md` if no module fits) when the decision is local, cheap to reverse, and affects only the implementation inside one module. What was chosen, what was rejected, why, reverse if.

If unsure which tier, it is structural. An unnecessary ADR costs two minutes. A missing one costs a future engineer re-deriving your reasoning, wrongly.

ADRs are archives (principle 5). Once accepted, never edit the body. If the decision changes, write a new ADR that names the old one in `Supersedes`, and change only the old one's `Status` line to `superseded by NNNN`. The audit rejects any other edit to an existing ADR. `scripts/audit.mjs --next-adr` prints the next number.

### 5. Reconcile — trim, then audit

**Trim first** (principle 1 and 3). For every doc you touched, and every doc you read in step 1 that was wrong: delete what is no longer true, delete what is redundant with another doc (link instead), delete sections that say nothing. A shorter true doc is the goal; do not add to compensate.

Then re-read every comment adjacent to code you changed. Comments are maintained exactly like code; fix or delete any that no longer hold. Delete commented-out code. Confirm every TODO you left has a `Still open` counterpart.

Then, from the repo root:

```
node scripts/audit.mjs
```

Read every finding. Fix it, or add a waiver line with a reason a reviewer would accept. Then complete the worklog entry: `Outcome` with what actually changed by path — including what was deleted — and `Still open` with what is unfinished, unknown, or deferred.

Before writing a new item, run `node scripts/summary.mjs --open` to see what is already open and under which slug. An item in `Still open` that will outlive this task gets a slug: `- [retry-jitter] the backoff has no jitter…`. Declare it once. It stays open until some later entry writes `- [retry-jitter] closed: …`, so carrying it forward costs nothing and never means retyping it in different words. Restating an untracked item is how one piece of work becomes five. "Tests pass" is not an outcome; "replaced the in-memory queue with the Redis-backed one in `worker/queue.py`; retry policy unchanged; deleted the stale durability caveat from `worker/README.md`" is.

Re-run until it exits 0. Then stop (principle 4).

### 6. Hand off — report doc deltas, not just code deltas

Your final message lists what changed in the documentation alongside the code: docs updated, docs or sections deleted, ADRs written or superseded, stale claims removed, waivers. A code summary with no doc summary signals that step 3 was skipped.

## Audit checks

IDs are what you reference in waivers. Errors block; warnings print and do not block, but leaving them is a choice made on the record.

| ID | Level | Check |
|---|---|---|
| `worklog-entry` | error | `docs/WORKLOG.md` was modified in this change set and its top entry is dated within the session window |
| `worklog-closed` | error | That entry has non-empty `Outcome` and `Still open` sections |
| `doc-coverage` | error | Every changed source file is covered in the same diff: its own or an ancestor module README was touched, or a system doc (root README, ARCHITECTURE, an ADR) was touched *and names the file or its directory*. Tests and trivially small files are exempt |
| `new-dir-readme` | error | Every new directory containing source has a `README.md` |
| `dead-ref` | error | No doc references a file path that does not exist. A token carrying an extension or a trailing slash is unambiguous and blocks; a slash between two bare words is reported as a warning |
| `diagram-refs` | error | No Mermaid diagram names a path that does not exist. A file is written with its extension, a directory with a trailing slash; anything else in a label is prose |
| `dep-adr` | error | A changed dependency manifest has a new or superseding ADR in the same diff |
| `adr-shape` | error | Every new ADR has Context, Decision, and "What would reverse this" sections with content |
| `adr-immutable` | error | An existing ADR was not edited except its `Status` line |
| `template-residue` | error | No unfilled template placeholders in any doc |
| `orphan-doc` | warn | Every doc under `docs/` (other than ARCHITECTURE, WORKLOG, decisions) is linked from at least one other doc |
| `duplicate-block` | warn | No paragraph of substance appears verbatim in two docs |
| `stale-marker` | warn | Docs do not contain changelog-style phrasing ("previously", "now uses", "as of 2025", "TBD") |
| `restating-comments` | warn | Changed source files do not have mostly comments that restate the adjacent code |
| `todo-shape` | warn | Every TODO/FIXME in changed source states a problem and an action (six or more words) and names an owner, ticket, or reference |
| `comment-sentence` | warn | Full-line comments in changed source are complete sentences (capitalized, terminated); commented-out code is flagged |
| `line-length` | warn | Changed source respects the line length the repo configures (`.editorconfig`, `pyproject`, `.prettierrc`, `setup.cfg`). A repo that configures none has stated no convention, and the check says nothing |
| `mixed-indent` | warn | No changed source file indents with both tabs and spaces |
| `open-item-typo` | warn | No two `Still open` slugs are within two characters of each other, which is how one item silently becomes two |

Subagent mode (`--mode subagent`) adds:

| ID | Level | Check |
|---|---|---|
| `handoff-present` | error | The worklog entry has a `### Handoff` section with content from the coding agent |
| `adr-sourced` | error | Every new ADR has a `## Sources` section; an ADR sourced only from `inferred` has Status `accepted (unconfirmed)` |
| `inferred-open` | error | Every `Inferred:` marker in a changed doc has a matching confirmation item under `Still open` |
| `logic-touched` | warn | With `--since <coder-commit>`: the subagent's diff, with comments and docstrings stripped, changes nothing |

## Writing standard

Read `references/style.md` before writing any doc. Essentials:

- Clear code before comments: naming, then structure, then context, then comments — in that order. If the reader needs a comment to know what a thing is, rename the thing.
- Contract docstrings on the public surface: arguments, returns, errors, restrictions, gotchas. Tested. Nothing on private helpers unless they surprise.
- Inline comments explain *why*, in complete sentences. Never restate the code. TODOs carry problem, action, owner.
- Docs lead with constraints and invariants. What must be true, what must never happen. Features are visible in the code; constraints are not.
- Declarative, present tense, dry. No "simply," no "just," no praise, no narrative.
- Every non-obvious claim points at a path: `see worker/queue.py:retry()`. No line numbers.
- Link, never copy. One owner per fact.
- Delete before you add.

`references/code-style.md` is the standard for the code itself — naming, structure, context, comments — and the rule that the repo's own convention comes first. `references/anti-patterns.md` lists what to refuse to write, with the tell for each.

## Adopting this in a repo that already has history

Run `npx docbound baseline` once, or write the current commit into
`audit.baseline` in `.docbound/config.json`. Everything before that commit is
out of scope until a change touches it, and the audit asks only about what
happens next. Without it, adoption on a branch that is a hundred files from main
means owing documentation for a hundred files on the first run, which is not a
finding anyone can act on.

Two HTML comments handle the cases no check can decide from the text. A doc
whose relative paths are written against a package rather than the repository
root says so once at the top with `<!-- docbound-root: path/to/package -->`. A
region a check will read wrongly, such as a documented commit format whose
angle-bracket fields are not unfilled placeholders, sits between
`<!-- docbound-ignore-start -->` and `<!-- docbound-ignore-end -->`, or after a
single `<!-- docbound-ignore -->` for one line. Reach for either only when a
check is wrong.

## Bootstrapping a repo with no docs

Run `node scripts/scaffold.mjs` from the repo root. It creates `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKLOG.md`, `docs/decisions/0001-adopt-docbound.md`, and a `README.md` in each top-level source directory, from templates, skipping anything that exists. Then read the code and fill the templates with true statements. Delete every section that does not apply — a scaffolded doc left with placeholders fails `template-residue` on purpose, and a section left with filler fails the reader.

## Triaging a repo whose docs are in bad shape

Principle 3, applied at scale. Do not try to fix everything. Open a worklog entry titled as a triage. Scan every doc and make one decision per doc or section: keep, or delete. Delete what you are certain is wrong. Leave what is unclear and list it under `Still open`. Default to delete; stragglers can be recovered from history. Run the audit, close the entry. Iterate in later tasks. Doc health is a gradual accumulation.

## When asked only to audit or refresh docs

Same loop. The "code change" is the doc change. Open a worklog entry, fix what is false, delete what is dead, run the audit, close the entry.

## Portability

Plain Markdown plus Node scripts (Node 20 or later) with no runtime dependencies. Runs identically under Claude Code, Codex, Gemini CLI, Copilot, Cursor, and any agent that reads the Agent Skills format. Install at `.agents/skills/docbound/` in the repo; agents that look in `.claude/skills/` can use a symlink or copy. The scripts assume `git` on the path but degrade to a whole-tree scan without it. Providers that support hooks can run the audit automatically; see `references/hooks.md`.
