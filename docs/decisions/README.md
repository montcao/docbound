# Decisions

Forty-five records, each one decision and the alternatives it beat. This page is
the index: what each one means for somebody working here, in a line. Open the
record itself for the reasoning, the costs, and the condition that would reverse
it.

A record is an archive. Once accepted, only its `Status` line changes; a
decision that stops being right is superseded by a new record rather than
edited. Records written from 0045 onward open with a `## What to do` section,
so the action is the first thing on the page
(`docs/decisions/0045-a-record-says-what-to-do-about-it.md`).

`tests/build.test.mjs` asserts this table lists every record in this directory
and names none that is not here.

## If you are about to

**Add a check.** 0006 (one module per check), 0037 (a row in the README table
and a fixture, both asserted), 0026 (checks document; they do not recommend
logic), 0023 (an ambiguous claim warns, an unambiguous one blocks).

**Change a check's behaviour.** 0022 (report each finding once), 0007 (what a
repository can exclude), 0020 (what a document can tell a check), and the record
for the check itself, below.

**Write documentation here.** 0011 (which register applies where), 0027 (the
reader is a junior engineer), 0028 (sentence-level patterns), 0032 (a worklog
entry is two or three lines), 0018 (claim the mechanism, never the saving).

**Cut a release.** 0004 (`dist/` is committed), 0009 (the package is the
artifact under test), 0043 (actions pinned by commit, release token scoped).

**Adopt docbound on an existing repository.** 0019 (`docbound baseline`), 0038
(install says so), 0044 (every install route carries the whole payload).

## Every record

| # | Decision | What it means for you |
|---|---|---|
| [0001](0001-adopt-docbound.md) | Adopt docbound here | The repository runs its own audit in CI. A task is not done until it exits 0. |
| [0002](0002-node-runtime.md) | Node is the only runtime | Scripts are Node 20+, ESM, `node:` imports. No Python, no shell, in anything that ships. |
| [0003](0003-templates-location.md) | `templates/` sits beside `references/` | A new template goes in `skill/docbound/templates/`, and scaffold picks it up from there. |
| [0004](0004-dist-committed.md) | `dist/` is committed, not built on install | Run `node scripts/build.mjs` and commit the result whenever you touch `skill/docbound/`. CI fails otherwise. |
| [0005](0005-hook-blocking-default.md) | The stop hook blocks by default | Installing wires a gate that stops a session. Turn it off per developer with `hook.blockOnStop`. |
| [0006](0006-check-plugin-architecture.md) | One module per check | A new check is one file named for its ID, exporting `{ id, level, run(ctx) }`. Nothing else registers it. |
| [0007](0007-audit-exclude-config.md) | Exclusions live in tracked config | Ignore a directory by adding it to `audit.exclude` in `.docbound/config.json`, where review can see it. |
| [0008](0008-verified-providers-only.md) | A provider ships only when verified | Adding an editor means answering four questions from the harness itself. A guess does not ship. |
| [0009](0009-package-is-the-artifact.md) | The tarball is what is tested | `tests/package.test.mjs` packs and installs the real package. Anything the CLI imports must be in the `files` whitelist. |
| [0010](0010-mermaid-architecture-diagram.md) | Diagrams are Mermaid, and checked | Write paths in diagram labels with an extension or a trailing slash; `diagram-refs` blocks on ones that do not exist. |
| [0011](0011-two-registers.md) | Two writing registers, split by reader | `README.md` argues a case. Everything else — `docs/`, module READMEs, records, the worklog — is dry and declarative. |
| [0012](0012-summary-from-docs.md) | `summary` reads docs, never source | If the summary is thin, the documentation is thin. That is the report, not a bug. |
| [0013](0013-tagged-open-items.md) | An open item gets a slug | Write `- [retry-jitter] …` under `Still open` so the item carries forward instead of being retyped. |
| [0014](0014-retroactive-slugs.md) | Existing open work got slugs | Old entries carry slugs added retroactively; the wording was not touched. |
| [0015](0015-slugs-must-be-findable.md) | A slug is findable, not memorable | Run `docbound summary --open` before opening an item, so you reuse the slug rather than inventing a second one. |
| [0016](0016-span-scanner-not-a-parser.md) | A span scanner, not a parser | Source checks know what kind of span a character sits in and nothing more. Do not ask them for structure. |
| [0017](0017-summary-describes-the-project.md) | The summary describes the project | It says nothing about itself or about what it saved you. |
| [0018](0018-no-self-serving-metrics.md) | Claim the mechanism, never the saving | Do not write a number this project cannot measure. Say what the tool does; let the reader measure the benefit. |
| [0019](0019-adoption-baseline.md) | Adoption is recorded as a commit | On a repository with history, run `docbound baseline` once, or the first audit asks about the whole branch. |
| [0020](0020-doc-local-directives.md) | Two directives a document can carry | `docbound-root:` re-anchors relative paths; `docbound-ignore` exempts a region `dead-ref` or `template-residue` reads wrongly. |
| [0021](0021-line-length-needs-a-convention.md) | Line length came from the repository | Superseded in practice by 0026: the check is gone. Formatting is a formatter's job. |
| [0022](0022-report-each-finding-once.md) | Each finding is reported once | The edit hook remembers what it said. A finding that goes away and returns is reported again. |
| [0023](0023-ambiguous-path-claims-are-warnings.md) | Unambiguous path claims block | Write a path with its extension or a trailing slash and `dead-ref` blocks on it. A bare `owner/repo` only warns. |
| [0024](0024-a-fixture-of-real-world-shapes.md) | A fixture of real-world shapes | A construct that caused a false positive goes into `tests/fixtures/real-world-shapes/`, not into a new fixture. |
| [0025](0025-the-slug-ledger-checks-itself.md) | The ledger checks its own upkeep | Close an item with the bullet form `- [slug] closed: …`. Prose that reads like closing it does not close it. |
| [0026](0026-docbound-does-not-recommend-logic.md) | docbound documents, never recommends logic | A check may not have an opinion on naming, formatting, or structure. If it does, it does not belong here. |
| [0027](0027-open-plainly-then-go-deep.md) | The reader is a junior engineer | Open a document so somebody new can enter it, then go as deep as the subject needs. |
| [0028](0028-write-it-do-not-perform-it.md) | Sentence patterns are in the standard | Six patterns in `skill/docbound/references/anti-patterns.md` that no check enforces. Read them before writing prose that ships. |
| [0029](0029-unix-timestamps-for-elapsed-time.md) | Unix seconds on every entry | Put `t=` on a worklog entry. Never write "months ago" — subtract the timestamps instead. |
| [0030](0030-waiver-targets-hold-hyphens.md) | A waiver target is one token | Write `waiver: check-id path/to/file - reason`, with spaces around the separator. |
| [0031](0031-comment-edits-need-no-doc.md) | A comment-only edit needs no doc | Fixing a typo in a comment no longer blocks. Changing a signature still does. |
| [0032](0032-worklog-entries-are-short.md) | An entry is two or three lines | Put reasoning in a record and link it. `entry-length` argues above twelve lines of prose. |
| [0033](0033-template-residue-is-a-closed-set.md) | Placeholders are an exact list | `template-residue` matches only the strings the templates ship, so `Promise<void>` in a doc is safe. Edit a template, edit the list. |
| [0034](0034-ask-git-for-the-default-branch.md) | The default branch comes from git | The audit prints the ref it compared against. If that ref is wrong, pass `--base`. |
| [0035](0035-dep-adr-reads-the-dependencies.md) | `dep-adr` reads dependencies, not names | A lockfile bump needs a record. Renaming an npm script does not. |
| [0036](0036-route-directories-are-not-modules.md) | Route directories are not modules | A directory holding only framework-named files needs no README. One holding a route file beside anything else does. |
| [0037](0037-the-readme-counts-itself.md) | The README's counts are asserted | Adding a check means a fixture and a README row, or the suite fails. Numbers in the README are tested. |
| [0038](0038-install-points-at-baseline.md) | Install points at `baseline` | Installing into a repository with history prints what to run next. It does not run it for you. |
| [0039](0039-the-ledger-needs-pressure.md) | The ledger has a cap and a broom | Above 25 open items the audit says so. `docbound prune` archives old entries and never touches one holding open work. |
| [0040](0040-line-numbers-are-looked-up-not-counted.md) | Line numbers are looked up | Nothing above the scanner may walk the file per result. A 1 MB file of comments went from nine seconds to 27 ms. |
| [0041](0041-the-historical-set-is-every-record-of-the-past.md) | History is exempt from two checks | The worklog, its archives, the records, and `CHANGELOG.md` may name deleted files and use changelog phrasing. |
| [0042](0042-a-known-extension-is-a-path-claim.md) | An extension is a path claim | A backticked file name that is nowhere in the tree blocks, directory in front of it or not. |
| [0043](0043-actions-are-pinned-by-commit.md) | Actions are pinned by commit | Upgrade a workflow action by merging Dependabot's pull request, not by editing a tag. |
| [0044](0044-the-skill-directory-is-self-contained.md) | A skill directory is complete alone | The subagent travels inside the payload, so `npx skills add` delivers a working one. |
| [0045](0045-a-record-says-what-to-do-about-it.md) | A record says what to do about it | Open every new record with `## What to do`, and add its row to this table. |
