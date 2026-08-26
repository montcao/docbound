# Agents working on this repository

This repository ships docbound, and it runs docbound on itself. That is not
ceremony: a skill claiming a blocking audit defines done, distributed from a
repository that does not run that audit, is an untested claim.

## Before your first edit

Open a worklog entry in `docs/WORKLOG.md`, from
`skill/docbound/templates/WORKLOG-entry.md`. Intent is written before you know
how the task turns out, and that is what makes it worth reading later.

Read first: this file, `README.md`, `docs/ARCHITECTURE.md`, the last three
worklog entries, and the README of every directory you expect to touch. Every
top-level directory has one, and each carries a `Must not` list that is the
fastest way to find out what you are not allowed to do.

## Before you report done

Both of these exit 0:

```
npm test
node cli/index.mjs audit
```

If you touched `skill/docbound/`, two more:

```
node scripts/build.mjs
node scripts/check-dist-fresh.mjs
```

A failing audit means the task is open. Fix the docs. If a finding is genuinely
wrong, write a waiver line in the worklog entry with a reason a reviewer would
accept. Never to get past a check you did not understand.

## What is easy to get wrong here

- **`dist/` and `plugin/` are build output.** `skill/docbound/` is the only
  place skill content is edited. Editing a copy is reverted by the next build
  and caught by the freshness check.
- **Check IDs, levels, and the waiver grammar are frozen.** Agents write waivers
  against those IDs in repositories nobody here can see. Renaming one is a
  breaking change with a decision record and a deprecation path, not a commit.
- **The fixtures assert exact check-ID sets.** A check that fires where a
  scenario does not call for it is a failure. Do not loosen an assertion to make
  a change land; the exactness is the suite's whole value.
- **The Python under `skill/docbound/scripts/reference/` is a frozen
  specification.** Do not edit it. Behaviour changes go into the Node
  implementation and into a fixture.
- **`skill/docbound/SKILL.md` stays under 300 lines.** New instruction goes into
  a file under `skill/docbound/references/` and is linked.
- **No dependencies.** Runtime or development. `package.json` has neither key,
  and adding one contradicts the thing this project claims about itself.

## Decisions

The moment you choose between alternatives, record it. A structural decision
(a dependency, a schema, an interface, a module boundary, anything expensive to
reverse) is a file in `docs/decisions/`, from
`skill/docbound/templates/ADR.md`, including a concrete reversal condition.
Local and cheap is one row in the `Decisions` table of the nearest module
README. When unsure, it is structural.

`node cli/index.mjs adr --title "..."` prints the next number and creates the
file.

An accepted record is an archive. Never edit the body; supersede it and change
the old one's Status line.

## Reporting

Your final message lists doc deltas alongside code deltas: docs written or
rewritten, sections deleted, decision records added or superseded, stale claims
removed, waivers, and what is under `Still open`. A code summary with no doc
summary means step 3 of the loop was skipped.

## Where to go next

- `docs/DEVELOP.md`: build, test, release, and how to add a check
- `docs/checks.md`: every check and what satisfies it
- `docs/ARCHITECTURE.md`: the components and what crosses between them
