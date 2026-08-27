# 0015. Make a slug findable rather than memorable

- Date: 2026-08-27
- Status: accepted
- Supersedes: none

## Context

Records 0013 and 0014 gave an open item a slug so it could be carried across
entries without being retyped. That solved the duplication and introduced a
smaller problem in its place.

Creating a slug costs nothing: invent a short name. Reusing one costs
remembering an exact string. Type `retry-jiter` for `retry-jitter` and a second
item opens, tracking separately, looking like the first. Neither copy is wrong
on its face and nothing reports it.

The convention asked a reader to hold twenty-six strings in their head. Nothing
in the loop told them the list was one command away, so the design imposed a
memory burden it never needed to.

## Options

### Generate slugs instead of writing them

No string to remember, and no way to type one wrong. A generated identifier is
also meaningless to read, so `- [a7f2c1] the backoff has no jitter` tells a
reviewer nothing the sentence does not, and carrying it forward means copying an
opaque token, which is the original problem with worse ergonomics.

### Drop slugs, go back to prose

Nothing to remember at all, and the duplication that 0013 fixed returns.

### Keep the slug, remove the need to remember it

Three mechanisms, none of which is the convention itself. The loop points at the
list. A command validates the slug against that list. A check notices the case
the command cannot cover.

## Decision

The slug stays, readable and hand-written. Three things make it findable.

Step 5 of the loop says to run `summary --open` before writing a new item, so
the list is consulted rather than recalled.

`docbound close <a slug> "what happened"` refuses a slug that is not open and
prints the ones that are. A typo through the command is an error naming the
alternatives, and the closing line is written for you.

`open-item-typo` warns when two slugs are within two characters of each other,
which covers the case the command cannot: a file edited by hand. It compares
only slugs of six characters or more, and it warns rather than blocks, because
two genuinely different items can be one edit apart.

## Consequences

The memory burden moves from the person to the tool, which is the direction
every piece of bookkeeping in this project has moved.

`open-item-typo` reports zero findings on this repository's twenty-six slugs,
which is the evidence that its threshold is not obviously too loose. It says
nothing about whether the threshold is too tight, and a typo of three characters
still passes unnoticed.

`docbound close` writes to the newest entry, so closing something is recorded as
part of the task that closed it rather than backdated to the entry that opened
it. That is a deliberate loss of tidiness in exchange for a record that says
when the closing was noticed.

## What would reverse this

If typos survive all three mechanisms often enough to matter, the answer is not
a fourth: it is that hand-written slugs were the wrong shape, and generated ones
with a readable label beside them are worth their opacity.

If nobody ever runs `close` and every slug is still typed by hand, the loop
instruction is doing the work alone and the command is surface nobody asked for.
