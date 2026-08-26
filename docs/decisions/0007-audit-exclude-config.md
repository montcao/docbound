# 0007. Exclude vendored skill payloads from the audit by configuration

- Date: 2026-08-26
- Status: accepted
- Supersedes: none

## Context

The audit already refuses to look at `.agents/` and `.claude/`, which is where a
consumer repository keeps its installed skill payload. That exclusion is not
about those two directory names; it is about a category. A skill payload is
Markdown, and it is not the repository's documentation. It quotes example paths
that belong to an imaginary service, and it documents a waiver grammar whose
angle-bracketed tokens are indistinguishable from unfilled template
placeholders.

This repository keeps its payload at `skill/docbound/` and its built copy at
`plugin/`, neither of which is a name the audit knows. Running the audit here
produced 126 `dead-ref` errors, 17 `template-residue` errors, 12
`duplicate-block` warnings, and 8 `stale-marker` warnings, essentially all of
them against the skill's own prose and the build's copy of it. The check set is
fixed for this pass, and waiving 163 findings would be exactly the "waive your
way through" the discipline exists to prevent.

A second finding came out of the same run. A repository whose working tree is
dirty *only* with excluded paths — the state `npx docbound install` leaves
behind — audited an empty change set, and an empty change set fails
`worklog-entry`. Installing a tool should not require a worklog entry, and the
reference implementation's comment on that branch says the intent plainly:
"sitting on the base branch with a clean tree: audit the last commit."

## Options

### Add the directory names to the audit's built-in exclusion list

No configuration surface, and it works for this repository. It also bakes one
project's layout into a tool every project uses, and the next repository that
vendors a payload under a different name is back where this one started.

### Exclude nothing and waive the findings

Keeps the audit's behaviour untouched. Puts 163 waiver lines in a worklog entry,
which trains every reader to skim the waiver section, which is the one section
that has to be read.

### A configured exclusion list, empty by default

`audit.exclude` in `.docbound/config.json` takes exact paths, directory
prefixes, and two glob forms. Empty by default, so a repository with no config
behaves exactly as it did before this record. The cost is a second place a
finding can disappear, and a config file that has to be reviewed as carefully as
the code.

## Decision

`audit.exclude`, empty by default, applied through the same `excluded()`
predicate the built-in list uses. This repository sets it to its skill payload
prose and its build output; `skill/docbound/scripts/`, `cli/`, `scripts/`,
`tests/`, and `docs/` stay audited, which is where this repository's own code
and documentation live.

`npx docbound install` seeds the list with the paths docbound itself writes into
a project, so installing the tool does not open a documentation task.

In the same change, the base-branch clean-tree test in
`skill/docbound/scripts/lib/changes.mjs` now asks whether anything the audit
would look at is dirty, rather than whether git reports anything at all. All
seventeen fixtures produce identical output before and after, because no fixture
has an excluded-only dirty tree.

## Consequences

A change to `skill/docbound/SKILL.md` or the reference files is invisible to
`doc-coverage` in this repository, so nothing forces a doc update when the skill
text changes. `docs/checks.md` and the check table inside the skill text are the
two places that go stale from that, and `docs/DEVELOP.md` lists them both as
steps.

A repository can now hide a real finding by adding a path to `audit.exclude`.
That is the same power a waiver has, with one difference that matters: a waiver
lives in the worklog entry and expires with it, and an exclusion is permanent
and tracked. Reviewing a change to `audit.exclude` is reviewing a change to what
the repository considers documented.

## What would reverse this

If the exclusion list in a repository grows past a handful of entries, or starts
naming directories that contain that repository's own documentation rather than
a vendored payload, the list has become a way to avoid the audit and the entries
belong in waivers where a reviewer sees a reason next to each one.
