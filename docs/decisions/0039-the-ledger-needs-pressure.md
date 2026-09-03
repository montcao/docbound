# 0039. The ledger needs pressure: a cap on what is open, and a command that prunes

- Date: 2026-08-31
- Status: accepted
- Supersedes: none

## Context

This repository's worklog reached 69 open items against 8 closed in five days,
and 3,000 lines across 40 entries in the same span. Open items grew at roughly
fourteen a day.

Both numbers break a promise the design rests on. `summary --open` tells a
returning reader what is still open, and a list of 69 items is not read. The
worklog is the story of the code, and a file growing at 600 lines a day is
skimmed at best.

The template already advised pruning entries after a quarter. Nothing did it, no
command existed to do it, and no reader was going to do it by hand. Advice with
no mechanism behind it is how the first 3,000 lines happened.

## Options

### Cap items per entry

Blocks the entry that opens the eleventh item. It punishes the honest entry: a
task that genuinely found ten things should say so, and the debt is the total,
not the entry.

### Expire items automatically

An item untouched for a quarter closes itself. Silent, and it turns a record of
unfinished work into a record of unfinished work that quietly disappeared.

### Report the size, and give pruning a command

Warn when the open list stops being readable, and ship a command that archives
old entries so the file stays one.

## Decision

`skill/docbound/scripts/lib/checks/open-item-debt.mjs` warns above 25 open
items. One condition only: the size of the list. An earlier version also
reported an entry that opened items and closed none, which fired on most of this
project's own fixtures, because discovering something while finishing a task is
the normal case rather than a defect.

`skill/docbound/scripts/prune.mjs`, exposed as `docbound prune`, moves entries
older than the newest ten into `docs/worklog/<year>-Q<n>.md` and links the
archive from the top of the worklog. Nothing is deleted. An entry holding a slug
that is still open stays in the live file however old it is, because the ledger
checks and `summary --open` read that file and archiving an open item would hide
it.

## Consequences

This repository trips its own new check on the day it lands, at 69 open against
a cap of 25. The check is a warning, so it argues rather than blocks, and it
will keep arguing on every entry until the list is triaged. Recording that here
is preferable to tuning the number until the project passes.

Twenty-five has no evidence behind it beyond being roughly the length of a list
somebody scans rather than reads.

An open item that nobody ever closes now pins its entry in the live file
forever. That is the intended pressure and it is also a way for the worklog to
stay long: the way out is closing the item, which is the behaviour the check
exists to provoke.

Archived entries move to a new path, so a link into the worklog from elsewhere
in the docs can break. `dead-ref` reports that, and the archive is one link from
the top of the file it left.

## What would reverse this

If ledgers routinely sit above 25 with every item live and being worked, the cap
is measuring activity rather than debt. Count only items older than a quarter
instead, which is the thing the number was reaching for.
