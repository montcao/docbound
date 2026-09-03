# 0041. The historical set is every document that records the past

- Date: 2026-09-02
- Status: accepted
- Supersedes: none

## Context

Two checks exempt documents that describe what happened rather than what is
true now. `stale-marker` does not report changelog phrasing in them, and
`dead-ref` reports a path they name that has since been deleted as a warning
rather than an error. Both defined that set as the worklog plus the decision
records.

The set was incomplete in two ways, and each produced a finding with no correct
fix.

A changelog is the clearest historical document there is, and its vocabulary is
exactly what `stale-marker` matches: "previously", "no longer", "now uses". Any
repository following Keep a Changelog gets a finding on its first audit for
writing a changelog correctly. This project's own audit carried one.

The archives that `docbound prune` writes under `docs/worklog/` are worklog
entries that moved. Prune shipped and immediately created documents that the
checks treated as live, so archiving a worklog turned its history into blocking
findings — the command made the problem it exists to solve worse.

## Options

### Leave it, and let repositories exclude the changelog

`audit.exclude` works and costs the user their first audit, an investigation,
and a configuration edit to silence a check that was wrong. It also excludes the
file from every other check.

### Detect a historical document by its content

Look for dated version headings or entry structure. It is a guess about a
format, it varies by project, and getting it wrong in either direction is
silent.

### Name the set

The worklog, anything under its archive directory, the decision records, and a
`CHANGELOG.md`. All four are written once about a moment and are not rewritten
afterwards, which is the property the exemption is actually about.

## Decision

`isHistorical` in `skill/docbound/scripts/lib/paths.mjs` holds the set, and both
`skill/docbound/scripts/lib/checks/dead-ref.mjs` and
`skill/docbound/scripts/lib/checks/stale-marker.mjs` ask it rather than each
keeping their own copy. `tests/fixtures/historical-docs/` pins all three of the
added cases.

A changelog is matched on its basename anywhere in the tree, since projects put
it at the root and under `docs/` about equally.

## Consequences

A changelog can now carry a stale claim that nothing reports, which is the same
trade already accepted for the worklog and the records: a document about the
past is allowed to describe the past.

The archive path is a convention this project's own `prune` writes. A repository
that archives its worklog somewhere else gets no exemption and no way to ask for
one short of `audit.exclude`.

HISTORY.md, CHANGES.md, and NEWS are the same kind of document and are not
in the set. Adding names one at a time is how a list of guesses starts, and the
one name that matters is the one the format standard uses.

## What would reverse this

If repositories turn up keeping their changelog under another of those names and
reporting the finding, the answer is a config key naming the historical
documents rather than four more hard-coded basenames.
