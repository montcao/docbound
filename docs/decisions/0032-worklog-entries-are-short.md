# 0032. A worklog entry is two or three lines, and a check says so

- Date: 2026-08-31
- Status: accepted
- Supersedes: none

## Context

This repository's worklog reached 3,016 lines across 32 entries in two days. The
average entry carried 94 lines of prose. The skill asked for two to four
sentences throughout.

Nobody reads that. The premise the whole worklog rests on is that a future
engineer opens it and learns what happened, and a log growing at 1,500 lines a
day is one that gets skimmed at best. The tool's own dogfooding produced the
strongest available evidence against its own design.

The instruction was there and did not hold, including against the agent that
wrote the instruction.

## Options

### Say it more firmly

Already tried. Every entry above was written by an agent that had read the
sentence asking for two to four sentences.

### Prune old entries

The template mentions pruning after a quarter and nothing does it. Pruning
addresses the size of the file and not the size of an entry, so entries stay
unreadable individually.

### Bound it, and check

State one or two lines per section, remove the sections that invite prose, and
count what is left.

## Decision

`skill/docbound/templates/WORKLOG-entry.md` loses `Expected to touch` and
`Unknowns going in`. Both were plans, and the diff carries a plan better than a
prediction of one does. `Intent`, `Outcome`, and `Still open` remain, each asking
for one or two lines.

`skill/docbound/scripts/lib/checks/entry-length.mjs` counts prose lines in the
newest entry and warns above twelve. Headings, the agent line, blank lines, and
list items do not count: structure is not prose, and a task with eight open
items is not the failure this is about.

Reasoning goes in a decision record, which is linked from the entry and read
when somebody wants it. The entry is the index.

## Consequences

An entry stops being where reasoning lives, so the number of decision records
goes up or the reasoning goes unwritten. The first is the intent. The second is
a real risk and nothing prevents it.

Twelve lines is a number with no evidence behind it beyond being roughly four
times what the instruction asked for. It is a warning, so it argues rather than
blocks.

Every entry already in this repository fails the check. They are history and are
not rewritten, and the check reads only the newest entry, so they neither
trigger it nor get fixed.

Twenty-four checks now, in a project that keeps saying its complexity is a
problem. This one exists because the instruction it replaces demonstrably failed
against its own author.

## What would reverse this

If entries start hitting the limit by carrying necessary detail rather than
reasoning, the limit is wrong. Splitting the task is the first answer and raising
the number is the second.
