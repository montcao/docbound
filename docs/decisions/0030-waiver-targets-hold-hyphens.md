# 0030. A waiver target is one token, and the separator needs its spaces

- Date: 2026-08-27
- Status: accepted
- Supersedes: none

## Context

<!-- docbound-ignore-start -->
The waiver grammar is `waiver: <check-id> [target] - <reason>`, and the pattern
matching it let the target end at the first hyphen inside it.
<!-- docbound-ignore-end -->

```
waiver: adr-immutable docs/decisions/0020-doc-local-directives.md - reason
```

parsed with a target of `docs/decisions/0020` and a reason beginning
`doc-local-directives.md`. `applyWaivers` compares a target against a finding's
path exactly or as a directory prefix, so that waiver matched nothing and
dismissed nothing.

It also said nothing. A waiver that parses and applies to no finding is
indistinguishable from one that was never written, and the audit reports the
finding it was meant to dismiss as though the line were absent.

Every decision record filename is hyphenated, so waiving `adr-immutable` against
a specific record had never worked. Neither had a waiver against any path with a
hyphen in it, which is a common shape.

The bug surfaced while writing a waiver for a real exception in this repository,
and the symptom was the finding staying in the output with the waiver sitting in
the entry above it.

## Options

### Escape or quote the target

`waiver: adr-immutable "docs/decisions/0020-...md" - reason`. Unambiguous, and it
changes the documented grammar, which agents write against in repositories this
project cannot see.

### Prefer the last separator rather than the first

Greedy rather than lazy matching. It fixes this case and breaks the opposite
one: a reason containing a hyphen would move the boundary again, and reasons
contain hyphens far more often than paths do.

### Make the separator require whitespace, and the target a single token

A path has no spaces in it, and the separator in every documented example has a
space on each side. Requiring both makes the boundary unambiguous without
changing anything anyone writes.

## Decision

`WAIVER_RE` in `skill/docbound/scripts/lib/worklog.mjs` becomes

```
/^\s*(?:[-*]\s*)?waiver:\s*([a-z-]+)(?:\s+(\S+))?\s+[—-]{1,2}\s+(.+)$/
```

The target is one whitespace-free token, and the separator carries whitespace on
both sides. Both a hyphen and an em dash are still accepted, as are one or two
of them, and a waiver written as a list item still parses.

This is a bug fix rather than a grammar change. Every form in `docs/checks.md`
and in the skill text parses the same way before and after; two forms that
silently produced the wrong target now produce the right one.

## Consequences

A waiver against a hyphenated path works. Since it silently did not before, any
repository carrying one has been running with a finding it believed was
dismissed, and that finding will now be dismissed. The change can only turn a
reported finding into a waived one, never the reverse.

A target containing a space cannot be waived. Paths with spaces exist and are
rare, and quoting would be the fix if one ever turns up.

`tests/fixtures/waiver/` now waives `adr-immutable` against a record path, which
is the case that could not be expressed. The assertion in `tests/audit.test.mjs`
names that path rather than counting findings, so a regression points at the
grammar rather than at a total.

## What would reverse this

If a repository needs to waive a path containing a space, the target needs
quoting, and that is a grammar change with a deprecation path rather than
another adjustment to this pattern.
