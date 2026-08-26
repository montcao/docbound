# 0013. Give an open item a slug so it is declared once

- Date: 2026-08-26
- Status: superseded by 0014
- Supersedes: none

## Context

Six bullets across five worklog entries described one unfinished piece of work.
Every one was correct: an entry reports what was open when it was written, and
that item was open each time. Every one was also retyped from scratch, so the
six were worded differently.

`docbound summary` concatenated the history and printed it under a heading that
reads as a status. A repository with roughly twenty loose ends looked like one
with thirty-five, and the largest apparent problem was an artifact of counting
the same problem repeatedly.

Deduplicating the prose was the first attempt. Normalise whitespace, lowercase,
compare the first ninety characters. It matched three of the six and missed the
three that buried the item behind a different opening clause, which is what a
heuristic over free text does.

The cause is upstream of the display. An open item has no identity, so carrying
it forward means writing it again, and writing it again means writing it
differently. That is a bookkeeping cost paid in judgement, every task, by an
agent that has better uses for both.

A log and a status are different things. Append-only history records state
repeatedly, once per task; a status names each thing once. Concatenating the
first does not produce the second, in the same way that a commit log is not
`git status`.

## Options

### Keep deduplicating prose, more cleverly

No convention for anyone to learn, and it works on repositories that already
exist. Every improvement is a better guess about whether two sentences mean the
same thing, and it fails silently in both directions: a missed match repeats an
item, and a false match hides one.

### A separate file of open items

Exact, queryable, and easy to render. It is also a second source of truth that
has to be kept in step with the worklog, and a synchronisation problem is the
thing an append-only log exists to avoid. It would need its own check.

### A slug on the bullet, in the worklog

`- [check-set] comment-sentence reads wrapped sentences as fragments`, closed
later by `- [check-set] closed: …` in any subsequent entry. Aggregation becomes
exact matching. The log stays the only state. The cost is a convention to learn
and an item that is worse off if someone mistypes a slug.

## Decision

The slug, optional.

An item carrying one is declared once and stays open until a later entry closes
it. The summary reports it a single time, with the date it was opened and how
many entries have mentioned it. An agent carrying work forward writes nothing:
the item is already open.

An untagged bullet keeps working, because a note is the normal way to write down
something that will not outlive the task, and refusing it would push people into
tagging things that do not deserve an identity. It cannot be followed across
entries, so it is shown while its entry is still in view and counted after that,
rather than restated as a fresh item forever.

Closing is `closed:`, `done:`, or `resolved:` after the slug. Three spellings
because the cost of accepting all three is one regular expression and the cost of
rejecting two is an item that silently stays open.

## Consequences

The worklog becomes its own state machine, and the state is derived rather than
stored. Nothing has to be kept in step with anything.

A mistyped slug opens a second item rather than continuing the first, and
nothing catches that. It is the same failure a mistyped check ID has in a waiver
line, and it is visible in `summary --open`, where two nearly identical entries
sit next to each other.

This repository's own history stays untagged. Retagging closed entries would be
editing the record of what was written when, and the convention is worth less
than that record. Older notes fade from the default view as their entries fall
out of range, which is the behaviour the untagged path is designed for.

The convention is not enforced. A check that required a slug would be a check
about form rather than truth, and the check set has stayed on one side of that
line deliberately.

## What would reverse this

If mistyped slugs turn out to be common, the answer is a check that lists slugs
appearing exactly once and asks whether each was meant to continue an existing
item. That is a warning about a likely typo, not a rule about form.

If open items grow past what a worklog can hold sensibly, several hundred, the
right structure is an issue tracker and docbound should link to one rather than
grow into a worse copy of it.
