# 0037. The README's counts are asserted by the test suite

- Date: 2026-08-31
- Status: accepted
- Supersedes: none

## Context

The README has a section headed "Evidence, rather than claims". It carried two
numbers: a test count and a count of decision records. Both drifted within five
days, in a project whose entire thesis is that documentation drifts unless
something checks it.

A wrong number in the section arguing that the numbers are the argument is worse
than no number. It is also the exact failure the tool exists to catch, arriving
in the tool's own front door, where none of its checks look: `dead-ref` reads
paths, `stale-marker` reads phrasing, and nothing counts anything.

A second gap surfaced beside it. `restating-comments` had shipped with no
fixture producing it, so the suite's promise that every check is pinned by a
repository built for it was not true either.

## Options

### Delete the numbers

Honest, free, and it gives up the section's whole argument. A reader deciding
whether to adopt a tool is owed something countable.

### Count them in CI, outside the suite

A script that regenerates the section. It makes the README generated output,
which nobody edits by hand afterwards, and it hides the drift rather than
reporting it.

### Assert them in the suite

The claims that can be counted are counted, and a README that overstates fails
the build like anything else.

## Decision

`tests/build.test.mjs` asserts three things about `README.md`: that the claimed
number of decision records matches `docs/decisions/`, that every check module in
`skill/docbound/scripts/lib/checks/` appears in the README's check table, and
that every check module has a fixture whose `expected.json` produces its ID.

The test count is gone from the README. Asserting it needs the suite to count
itself, and the property that number stood in for is the third assertion above,
which says the same thing without recursing: no check ships unpinned.

`tests/fixtures/restating-comments/` is the first thing the third assertion
found.

## Consequences

Editing the README can now fail the test suite. That is the intent, and it means
a prose change that rewords "32 decision records" into another shape breaks a
regular expression rather than a fact.

The claims that cannot be counted — zero dependencies, the CI matrix, what
happened when the tool was pointed at three unfamiliar repositories — stay
unchecked. They are checkable by other means or not at all, and this record does
not pretend otherwise.

Adding a check is now three files and not one: the module, a fixture, and a row
in the README table.

## What would reverse this

If the assertions start failing on correct prose — a rewritten sentence that
still states a true count — the parse is too tight for a document that has to
stay readable, and the numbers should be deleted from the README instead.
