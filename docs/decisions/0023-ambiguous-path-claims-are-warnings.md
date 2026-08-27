# 0023. An unambiguous path claim is an error; an ambiguous one is a warning

- Date: 2026-08-27
- Status: accepted
- Supersedes: none

## Context

`dead-ref` reports, at error level, any backticked token that reads as a path
and does not resolve. Two of the nine it reported on a real repository were not
paths at all:
<!-- docbound-ignore-start -->

- ``` `/scan` ```, a URL route in a table of endpoints
- ``` `owner/repo` ```, standing in for a command argument in a numbered list

The first was a defect in `pathClaim`
(`skill/docbound/scripts/lib/refs.mjs`), which tested for a bare word before
stripping a leading slash, so `/scan` passed the gate that exists to stop
exactly that. Fixed by normalising first.

The second is not a defect. `owner/repo` and `docs/decisions` have the same
shape, and only the filesystem tells them apart. `isPathShaped` sits in the same
file with a comment naming this failure and is used by `diagram-refs` and not by
<!-- docbound-ignore-end -->
`dead-ref`, which is the check that blocks.

The file's own header states the trade: "Missing a real dead path costs a stale
reference nobody caught; inventing one costs a blocking error on text that was
never a path, which is how a check gets switched off." The strict reader was
written for it and never wired in.

## Options

### Use the strict reader everywhere

One line. It also silences every reference to a directory written without a
trailing slash, and a five-segment path under that repository's ai package was a
genuine dead reference to a renamed directory. Trading a
false block for a real miss is not obviously better.

### Resolve the ambiguity by asking the filesystem

If it does not resolve, treat it as prose. That is a check that cannot fail:
every finding it would make is the case it now suppresses.

### Two levels

A token that says what it is, by carrying an extension or a trailing slash, is
an error when it does not resolve. A slash between two bare words is a warning.
Nothing is lost from the record and nothing blocks on English.

## Decision

`skill/docbound/scripts/lib/checks/dead-ref.mjs` reports at `level` when
`isPathShaped` is true and at `warn` otherwise. The warning says how to promote
it: write the extension or the trailing slash.

The check ID does not change, and `export const level` still reads `error`, so
a waiver written against `dead-ref` dismisses both.

## Consequences

`dead-ref` no longer blocks on prose, which was its only failure mode in the
wild.

A repository referring to real directories without trailing slashes gets
warnings where it used to get errors, and could let a real dead reference sit on
the record. The warning says what to write to get the error back.

This is the first check in the set that reports at two levels. `docs/checks.md`
now has to describe a level per finding rather than per check, and the table in
`skill/docbound/SKILL.md` gives the blocking level.

## What would reverse this

If the warning tier fills with real dead references that nobody promotes, the
tier is a place findings go to be ignored, and the answer is to require the
unambiguous form in docs rather than to accept both.
