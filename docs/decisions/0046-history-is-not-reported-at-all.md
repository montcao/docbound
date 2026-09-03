# 0046. A finding that says it is not a defect is not reported

- Date: 2026-09-03
- Status: accepted
- Supersedes: none

## What to do

Nothing. `dead-ref` no longer reads the worklog, its archives, the decision
records, or the changelog, so a path they name that has since been deleted
produces no finding. A live document naming a missing path still blocks.

## Context

`dead-ref` reported a dead path in a historical document as a warning, with this
message:

<!-- docbound-ignore-start -->
> references `README.npm.md` which no longer exists; this document records what
> happened and is not rewritten, so it is history rather than a defect
<!-- docbound-ignore-end -->

A finding whose own text says it is not a defect is noise, and the volume is not
incidental: one per mention, of every file the project ever deleted, forever.
This repository carried thirty-six of them against fifty-four warnings total, so
two thirds of the audit's output was the tool telling its author about work that
cannot be done. A document that is not rewritten cannot be fixed, and the only
way to clear one of these is to falsify a record.

The cost compounds. Warnings are where a reader looks for the things worth
attending to, and a list that is two thirds noise trains people to skip it —
including the real ones underneath.

## Options

### Leave it

The record is complete and nobody reads it. This is where the project already
was, and the warning count grows with every file ever deleted.

### Report it once per file rather than per mention

Cuts the volume and keeps a finding that still says it is not a defect. Less
noise, same category error.

### Do not read historical documents

`stale-marker` already exempts exactly this set. `dead-ref` treated it as a
lesser finding rather than as out of scope.

## Decision

`skill/docbound/scripts/lib/checks/dead-ref.mjs` skips a document
`isHistorical` returns true for: `docs/WORKLOG.md`, anything under
`docs/worklog/`, the decision records, and `CHANGELOG.md`
(`docs/decisions/0041-the-historical-set-is-every-record-of-the-past.md`).

The two-level rule that remains applies to live documents only: a token carrying
a known extension or a trailing slash blocks, and an ambiguous one warns
(`docs/decisions/0023-ambiguous-path-claims-are-warnings.md`).

## Consequences

A rename that lands without updating the docs is still caught, because the
documents that describe the current system are still read. What is no longer
caught is a rename that only history mentions, which was never actionable.

Thirty-six warnings leave this project's audit, and eleven more with them: the
ambiguous tokens inside historical documents — an action named `owner/name`, a
record referred to by its number — were the same noise wearing the other
message.

A repository whose worklog is its main documentation gets less from `dead-ref`
than it did. That repository has a larger problem, and this check was not going
to be the one that told it.

## What would reverse this

If a deleted path reaches production because the only place naming it was the
worklog and nothing said so, the finding belongs back — reported once per file
rather than once per mention.
