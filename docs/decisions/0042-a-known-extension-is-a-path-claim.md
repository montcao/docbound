# 0042. A known extension is a path claim, with or without a slash

- Date: 2026-09-02
- Status: accepted
- Supersedes: none

## Context

`dead-ref` reports at two levels: an unambiguous path claim blocks, an ambiguous
one warns (`docs/decisions/0023-ambiguous-path-claims-are-warnings.md`).
`docs/checks.md` states the rule as "a token that says what it is, by carrying a
known extension or a trailing slash, is an error when it does not resolve."

`isPathShaped` did not implement that. It tested for a slash first and returned
false without one, so a backticked file name with no directory in it could never
be an error however unambiguous its extension. Those tokens fell to the third
branch, whose message reads:

<!-- docbound-ignore-start -->
> references `README.npm.md`, which reads as a path and does not exist; write
> the extension or a trailing slash if it is one, and this becomes an error
<!-- docbound-ignore-end -->

The extension is already there. The advice cannot be followed, and it printed
thirteen times in this project's own output for one deleted file. Advice a
reader cannot act on is worse than silence: it teaches them the tool does not
understand its own output.

## Options

### Reword the message only

Keeps the levels exactly as they are and fixes the impossible instruction. It
also leaves `docs/checks.md` describing a rule the code does not implement, and
the underlying claim — this token names a file, and the file is not there —
stays reported at a level that says it might be prose.

### Drop the extension rule and warn on everything

Consistent and useless. The blocking half of `dead-ref` is what keeps docs
tethered to code, and a check that never blocks is a linter nobody reads.

### Test the extension first

A known extension says the token is a file wherever it sits. A trailing slash
says it is a directory. Neither needs a slash to be unambiguous.

## Decision

`isPathShaped` in `skill/docbound/scripts/lib/refs.mjs` checks the extension
first and returns true for any token carrying one from the known set, then falls
back to the trailing-slash rule. `owner/repo` and `read/write` are unaffected:
they carry no extension and no trailing slash, so they stay warnings.

`tests/fixtures/historical-docs/` covers the case: a live document naming
a file called legacy.py with no directory, which blocks, beside the same claim inside two
historical documents, which do not.

## Consequences

A finding that was a warning is now an error whenever a live document names a
file by its bare name and that file is nowhere in the tree. This is a level
change in the breaking direction, which normally needs a deprecation path
(`docs/DEVELOP.md`). It is taken here because the declared `level` of `dead-ref`
is unchanged, a waiver written against the ID still dismisses it, and the
behaviour now matches what `docs/checks.md` has documented all along — a
repository reading the reference would have expected this.

Prose that names a file in a sibling repository, or a file created at build
time, blocks where it used to warn. The waiver example in `docs/checks.md`
covers exactly that case and predates this change.

The resolution rule underneath is unchanged and forgiving: a bare file name is
satisfied by a file of that name anywhere in the tree, so this fires only when
nothing in the repository matches.

## What would reverse this

If the first audits of unfamiliar repositories start failing on prose that names
files belonging to other projects, the honest fix is to keep the error for a
token with a directory in it and warn for a bare name, and to correct
`docs/checks.md` to say so.
