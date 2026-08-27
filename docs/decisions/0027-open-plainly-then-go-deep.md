# 0027. The reader is a junior engineer, and the depth is what trains them

- Date: 2026-08-27
- Status: accepted
- Supersedes: none

## Context

`skill/docbound/SKILL.md` named the reader every document is written for: a
strong engineer joining in six months. Every instruction downstream followed
from that line, including a writing standard whose word for the target register
was "dry".

The result is accurate and closed. A module README this skill produced on an
unfamiliar Go repository opened by naming a function, its return type, and the
vocabulary two other packages key off. True, useful to a senior, and impossible
to enter for anyone else, because nothing before it said what the package was
for. It passed every check in the audit.

The brief that prompted this was different: documentation a junior engineer can
read, which trains them to think the way a senior does.

Those two goals turn out not to be in tension, which is the whole reason this
decision is cheap. The senior thinking is already in these documents. A
`Must not` list is a boundary. An invariant is what has to hold no matter what.
A decision record's reversal condition is a principal engineer stating in
advance what would change their mind. A junior who reads a hundred of those
learns to look for them.

The problem was never the depth. It was that nobody who needed the lesson could
get to it.

## Options

### Write simpler documents

Lower the register throughout: shorter sentences, fewer terms, less structure.
It would make the documents enterable and would delete the thing worth reading.
A junior who is only ever handed simple documents learns that documents are
simple, which is the opposite of the training.

### State the reader and hope

Change the line in `SKILL.md`, add a rule to the writing standard, add nothing
that holds it. This is what the file already did: it has said "write for humans
first" from the beginning and produced the opening above anyway. An unenforced
documentation rule decays, which is the argument this whole project rests on.

### Open plainly, then go deep, and check the opening

Require one sentence at the top that a reader can enter, with no identifier in
it, and leave everything after it exactly as demanding as it was. Check the
thing that is a fact about the text rather than the thing that is a judgement.

## Decision

The reader in `skill/docbound/SKILL.md` is now a junior engineer six months
from now, with two needs stated: act correctly today, and learn to think like a
senior by reading a year of these documents. The section says outright that the
failure mode is not writing too little, it is writing something correct that a
junior cannot get into.

`plain-opening`, warn level, reads the first paragraph after the title of a root
README or `docs/ARCHITECTURE.md` and asks for one sentence of five words or more
with no backticks in it. Badges, HTML comments, and a `Status:` line are skipped.
A document opening straight into a heading, a list, or a table is reported for
the same reason.

The templates say who the opening sentence is for.
`skill/docbound/references/style.md` carries the worked example, before and
after, because the failure is easy to write and hard to notice.

Two habits went into the writing standard alongside it: say an unfamiliar word
once, in a clause, the first time it appears, and put the constraint before the
feature, which is both the clearer order and the one that teaches.

## Consequences

The check measures a proxy. A paragraph can satisfy it and still be
impenetrable, and a genuinely clear opening that happens to name a file is
reported when it should not be. That is the trade for checking a fact instead of
a judgement, and the direction of the error is the safe one: it warns, and it
says what to add rather than what to remove.

Twenty-three checks, in a repository that was told a week ago its complexity was
the problem. This one earns the slot because without it the rule is the same
kind of advice the file has carried unheeded since the first commit.

Two of this repository's own module READMEs were reported and rewritten rather
than waived. Both opened with a two-word fragment and went straight into paths.

Nothing about the depth changed. `Must not` lists, invariants, boundary tables,
and reversal conditions are all still required, and the skill now says plainly
that they are the part doing the teaching.

## What would reverse this

If repositories start satisfying the check with a sentence of filler above an
unchanged opening, it is measuring the wrong thing and buying nothing, and the
rule belongs in the skill text alone with the check removed.
