# 0018. Claim the mechanism, never the saving

- Date: 2026-08-27
- Status: accepted
- Supersedes: 0017

## Context

Record 0012 put a cost footer at the end of every summary, reasoning that a
claim about token economics nobody can check is marketing. Record 0017 moved it
behind a flag, having noticed it answered a question nobody asked.

Both treated the symptom. Searching for the pattern rather than the instance
finds it in four places: the ratio in `README.md`, a claim in
`skill/docbound/SKILL.md` about the difference between a few thousand tokens and
re-reading the tree, the `--cost` output, and the function computing it.

Every one rests on the same counterfactual: what reading the source *would have*
cost. Nobody measured that. It is a number this project invented about a thing
it did not do, and it exists to make a comparison come out well. Putting it
behind a flag makes it opt-in advertising.

The history here is its own argument. Build output was once counted into the
source total, which inflated the ratio, and was removed for that reason. The
footer was then suppressed on repositories where the ratio was unflattering.
Twice the measurement was shaped by what it would make the project look like,
and both times it was caught by reading rather than by any check.

Meanwhile the claim actually worth making was never a number. The summary reads
documentation and never source. That is checkable, and `tests/summary.test.mjs`
checks it by planting a marker in a source file and requiring the output never
to contain it.

## Options

### Keep the flag

One line to leave alone. Keeps a counterfactual in the product and leaves the
next person to wonder why a documentation tool reports its own efficiency.

### Keep the measurement, drop the comparison

Report the size of the output and stop. Useful to someone deciding whether to
put it in a context window, and it is also `wc -c`, which they already have.

### Remove all of it, and claim the mechanism instead

The output describes the project. The README says what the summary reads and
points at the test that proves it. Anyone wanting a ratio measures it on their
own repository, where the answer is true rather than borrowed.

## Decision

Remove all of it. `--cost` goes, the `cost` function goes, the ratio in
`README.md` goes, and the claim in `skill/docbound/SKILL.md` goes.

What replaces them is the mechanism, stated plainly and backed by a test: the
summary reads documentation and never source. How much that saves depends on the
repository, and the reader has one.

The same pass makes the empty case explicit rather than apologetic. A repository
with no documentation is told there is nothing to summarise, given the list of
files that were looked for, and pointed at `scaffold`. A repository with some of
them gets the list of what is missing. Someone trying this tool for the first
time most likely has an undocumented repository, so that is the first
impression rather than the edge case.

The rule this generalises to: **a metric this project reports about itself must
be something a reader could measure without it.** Sizes, counts, and findings
qualify. A comparison against work that was never done does not.

## Consequences

The project can no longer put a number on the thing it is best at, which is a
real loss in a README that has to persuade someone in five minutes. The
mechanism claim is weaker rhetorically and stronger factually, and the second is
worth more in a tool whose subject is documentation being true.

Three records now describe this command, and the chain is legible: 0012 built
it, 0017 hid the footer, 0018 removed it. Reading any of the first two alone
would mislead, which is why each Status line points forward.

Nothing checks for a self-serving metric. Both instances were found by reading,
and a check that could find the third would have to know what a counterfactual
is, which is not a thing a deterministic audit can do.

## What would reverse this

If a number is measured rather than invented, reporting it is not this pattern.
A count of documents read is a fact about what happened. A comparison against
what did not happen is not, whatever flag it sits behind.
