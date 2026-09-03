# 0045. A decision record says what to do about it

- Date: 2026-09-03
- Status: accepted
- Supersedes: none

## What to do

Write a `## What to do` section in every new record, above Context. One or two
lines, addressed to somebody who is not reading for the reasoning. "Nothing, it
is already in the build" is a complete answer. `docs/decisions/README.md` is the
index of what every record here means for a reader.

## Context

This project has 45 decision records over 3,700 lines, averaging 83 lines each.
Every one of them is written for a reader evaluating whether the decision was
right: Context, Options, Decision, Consequences, and the reversal condition.

That is not the reader most records get. The common one arrives mid-task, having
been pointed at a record by a comment in the code, and wants to know one thing:
does this change what I am about to do. Answering that today means reading
eighty lines and inferring it.

There is no index either. `docbound summary` lists every record with its title
and reversal condition, which is the machine's view of the set. A person opening
`docs/decisions/` sees forty-five numbered filenames.

The records themselves cannot be fixed. They are archives, and `adr-immutable`
enforces it: the only edits an accepted record accepts are its `Status` line and
an appended `## Corrections` section.

## Options

### Shorten the template

Fewer sections, less to read. It trades away the reasoning, which is the thing a
record exists to preserve and the thing that cannot be reconstructed later.

### Add a summary section, and check for it

Lead with the action and keep everything under it. Costs one line per record and
changes nothing about what a record preserves.

### Write an index and leave the template alone

Solves it for this repository's readers and for nobody else's, and the index
drifts the moment a record is added.

## Decision

Both, because they answer different readers.

`skill/docbound/templates/ADR.md` gains a `## What to do` section directly under
the metadata, before Context, so the action is the first thing on the page.
`skill/docbound/scripts/lib/checks/adr-actionable.mjs` reports a new record that
has no such section, at warn level.

`docs/decisions/README.md` is the index: one row per record, saying what it
means for somebody working here. `tests/build.test.mjs` asserts every record
appears in it and that it names none that does not exist, which is how the check
table and the README's counts are already held true
(`docs/decisions/0037-the-readme-counts-itself.md`).

The check reads only records the change set added. An accepted record cannot
gain the section without an edit `adr-immutable` forbids, and a repository
adopting docbound with records already in it would otherwise open on a finding
per record. A section present but still holding its placeholder is a scaffolded
record that `template-residue` already reports, and stays silent here
(`docs/decisions/0022-report-each-finding-once.md`).

## Consequences

Warn rather than error, because a record missing a summary is still a record,
and blocking a task over the shape of one is a check about formatting rather
than about whether the reasoning was written down.

Twenty-six checks now, in a project that keeps saying its count is a problem.
This one is a warning that argues for a line of writing.

The forty-four records written before this have no such section and never will.
The index is what covers them, and it is prose about archives rather than a
change to them.

`docs/decisions/README.md` is an index rather than a record, so `isAdr` no
longer counts it: it is a live document that is rewritten whenever a record is
added, and the checks that guard archives would have demanded a Context section
from it and then forbidden the edit.

A summary can be written and then be wrong, in a way the reasoning underneath it
is not, because nothing checks that the line matches the decision.

## What would reverse this

If the sections start reading as restatements of the title — "adopt X" under a
record titled "Adopt X" — the prompt is wrong and should ask for the action
rather than a summary, or be dropped.
