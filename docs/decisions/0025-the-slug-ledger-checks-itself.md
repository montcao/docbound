# 0025. The slug ledger reports on how it is being maintained

- Date: 2026-08-27
- Status: accepted
- Supersedes: none

## Context

Open items carry a slug so that carrying work forward costs nothing: declare it
once, and any later entry closes it with `- [slug] closed: ...`. Everything
about that depends on exact syntax, and getting the syntax wrong produces no
signal at all.

Both ways of getting it wrong happened in one real session, by an agent that had
read the skill.

An Outcome section ended with `Closes [nginx-python-default].` That reads like
closing the item. It is prose, the closing form is a bullet under `Still open`,
and nothing said so. The item stayed open, `docbound summary --open` kept
listing it under an entry that had already fixed it, and the audit passed.

The same session restated two slugs as fresh declarations in a second entry
rather than leaving them to carry forward. Restating is the duplication slugs
exist to remove. `summary --open` already reported those two as "restated 2
times", so the information needed to say something was sitting there unused.

## Options

### Accept prose as a closing form

Parse `Closes [slug]` wherever it appears. Forgiving, and it makes the ledger
depend on natural language: `we should probably close [slug] eventually` closes
it too. The state of the work then turns on a sentence's mood.

### Fail the audit

An unclosed item that a task actually finished is a wrong ledger, and this
project's position is that a wrong doc is worse than a missing one. It is also
a guess: prose naming a slug beside the word "closed" is usually an attempt to
close it and is sometimes a sentence about it.

### Report it as a warning, with the exact form to write

Says what happened and what to type instead. Costs a line of output and leaves
the decision with whoever is writing, which is right when the check is reading
intent from a sentence.

## Decision

`skill/docbound/scripts/lib/checks/open-item-form.mjs`, warn level, over the
newest entry only, since that is the one being written.

It reports a line that names a slug alongside a closing word without being a
canonical bullet, and only when that slug is open from an earlier entry and this
entry does not close it with the bullet. An entry that closes an item properly
may also name it in prose; "Closing this" is how an Intent starts. And it
reports a fresh declaration of a slug that was already open before this entry,
naming the date it opened.

Both messages carry the form to write instead. A check that says a thing is
wrong without saying what right looks like is a check people work around.

## Consequences

The ledger now says when it is being maintained by hand in a way that does not
take effect, which is the failure mode with no other symptom.

Warning rather than error means a wrong ledger can still be committed. That is
the trade for a check that reads intent out of a sentence: the alternative is
blocking on a guess about what somebody meant.

An entry discussing an item it is not closing, in a sentence carrying one of the
closing words, still gets a warning it does not deserve. That case survived the
narrowing above and the escape is to write the sentence without the brackets,
which is what prose about an item probably wants to look like anyway.

The check reads the whole worklog through `worklogEntries`, so it is the first
check whose cost grows with the length of the file rather than with the diff. On
this repository that file is the largest document by some way, and it is read
once.

## What would reverse this

If the prose case turns out to be rare and the restatement case common, the two
belong apart: the restatement half could be an error, since it is unambiguous,
while the prose half stays a warning.
