# 0014. Tag the open items already in the history, and open entries by command

- Date: 2026-08-26
- Status: accepted
- Supersedes: 0013

## Context

Record 0013 introduced the slug on an open item and ruled that this repository's
own history would stay untagged, on the grounds that annotating a closed entry
is editing the record of what was written when.

That reasoning does not survive contact with the thing it was protecting. A slug
placed in front of an existing bullet changes no word of it. The entry still
says exactly what it said. What changes is that six bullets describing one piece
of unfinished work can be read as one item mentioned six times, which is a more
accurate account of the history than six separate items, not a less accurate one.

The cost of the ruling was immediate. Thirty-five untagged bullets sat across
eleven entries. Behind them were twenty-six distinct items, three of which had
been finished in later work and never marked, and three notes that say some
version of "nothing is open". `summary --open` was a list nobody would act on,
which is the state 0013 existed to fix and did not, because the convention
applied only to entries written after it.

A second piece of clerical work remained in the loop. An agent hand-writes the
entry heading, the date, the agent line, and the section headers before writing
anything worth reading. That is structure, and hand-writing structure is why one
heading in this worklog carries an em dash where every other carries a hyphen,
which the summary parser then had to tolerate.

## Options

### Leave the history alone and tag only new entries

Honours 0013 and needs no work. Leaves a backlog that cannot be read, and leaves
the convention unproven on the only repository using it. Untagged items age out
of the default view, which hides the problem rather than resolving it.

### Rewrite the old bullets properly, merging the six into one

Produces the cleanest record and destroys the actual one. What each entry said
at the time is the part of a worklog worth keeping, and a summary that reads
well is not worth trading it for.

### Add a slug in front, change nothing else

The wording of every entry survives exactly. The aggregation works retroactively
because it keys on the slug, not the sentence. The judgement being recorded is
which bullets refer to the same work, which is a claim about the history rather
than a change to it.

## Decision

Add the slug, change no word.

Every bullet that names still-open work carries the slug of the item it belongs
to, and bullets that restate an item carry the same slug as its first
appearance. Three items finished in later work are closed in the current entry
rather than backdated, because the record should say when they were noticed as
done, not pretend they were marked at the time.

The three notes reading "nothing from this" stay untagged. They are honest prose
and they will fade from the default view as their entries fall out of range.

`docbound start "Add rate limiting"` writes the entry skeleton. Sections come from
`skill/docbound/templates/WORKLOG-entry.md` so the template remains the one
place deciding what an entry contains, and it refuses when the newest entry has
no Outcome, since that entry is a task nobody closed.

Everything else in 0013 stands: the slug is optional, an untagged bullet is a
note attached to its task, closing is `closed:`, `done:`, or `resolved:`, and
nothing enforces any of it.

## Consequences

The claim in the history is now about identity rather than wording, and it can
be wrong. Two bullets given the same slug that meant different things merge into
one item, and nothing catches that. It is the same class of error as a mistyped
slug, and it is visible in the same place.

`summary --open` is worth reading, which was the point. Twenty-six items with
the number of times each was restated says more about where the work went than
thirty-five bullets did.

Opening an entry stops being something an agent composes. What it composes is
the Intent, which is the only part that needed a mind.

Records 0013 and 0014 both stay in the repository. Reading 0013 alone gives the
convention and a ruling that no longer holds, which is why its Status line
points here. That is the first supersession in this project, and it is the
mechanism working rather than a mistake being covered up.

## What would reverse this

If retroactive tagging turns out to have merged items that were genuinely
different, the answer is to split them in a new entry with new slugs and say so,
not to strip the slugs and go back to prose.

If a future maintainer finds the annotated history harder to trust than an
unannotated one, this record is the argument to weigh, and 0013 is the argument
against it, still readable and still stating its case.
