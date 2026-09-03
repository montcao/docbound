# 0040. Line numbers are looked up, not counted

- Date: 2026-09-02
- Status: accepted
- Supersedes: none

## Context

`SECURITY.md` makes three claims about the hook, and the second is that no input
may hang it: the scanner advances on every iteration, runs no backtracking
pattern, and declines a file over two megabytes. All three are true of
`skill/docbound/scripts/lib/scan.mjs:scan`, which handled 1.9 MB in 58
milliseconds.

They were not true of the function the checks actually call. `comments` asked
for a line number per comment span, and each answer counted newlines from
position zero, so the work grew with the file multiplied by the number of spans.
`definitions` had the same shape.

Measured on JavaScript files of pure line comments, every one of them under the
two-megabyte cap and therefore not declined:

| Input | `scan` | `comments` |
|---|---|---|
| 100 KB | 6 ms | 90 ms |
| 500 KB | 8 ms | 2,308 ms |
| 1,000 KB | 4 ms | 9,048 ms |

Through the audit rather than the library, a repository with one 900 KB
vendored-style file took 38 seconds. The stop hook ships blocking by default, so
that is an agent frozen for 38 seconds, and again on the next stop. A bundled
asset, a generated client, or a vendored library in the change set is enough.

The size cap was doing the work of a performance bound and could not: the files
that hurt are the ones underneath it.

## Options

### Lower the size cap

Turns a slow answer into no answer for files that are legitimately large, and
leaves the quadratic shape in place for whatever the new cap admits.

### Return offsets and let each caller resolve lines

Moves the same cost outward to callers that all want line numbers, and spreads
one problem across four checks.

### Count the line while the scanner emits spans

Free for `comments`, which consumes spans in order. It does nothing for
`definitions`, which resolves arbitrary regular-expression match offsets in
masked text rather than spans, so the lookup has to exist anyway.

### Index the line starts once, then search

One pass to record where each line begins, then a binary search per offset.

## Decision

`lineIndex` in `skill/docbound/scripts/lib/scan.mjs` builds the array of line
start offsets for a text and returns a function that binary-searches it.
`comments` builds one per call and `definitions` builds one over its masked
copy. The private `lineOf` that counted from zero is gone, so there is no slow
path left to reach for.

`tests/scan.test.mjs` pins it with a comment-dense file over a megabyte, inside
the group of inputs that must not hang a hook. The same 1 MB input now takes 27
milliseconds.

## Consequences

Peak memory grows by one offset per line, held for the length of the call. The
size cap bounds the worst case: a two-megabyte file of nothing but newlines
indexes two million offsets, which is transient and an order of magnitude
smaller than the string it describes.

`SECURITY.md` now says what makes the claim true rather than asserting it, since
the previous wording was accurate about the scanner and wrong about the hook.

The wall-clock assertion is a timing test, and timing tests are flaky on loaded
machines. It uses the group's existing four-second budget against an operation
that takes tens of milliseconds, so it fails on a regression of two orders of
magnitude and not on a slow CI runner.

## What would reverse this

If a repository turns up where indexing the line starts is the memory problem —
a generated file near the cap with no reuse of the index — accumulate the line
number inside `scan` for the span path and give `definitions` a counter that
advances with its own match offsets, which are monotonic within a pattern.
