# 0031. A comment-only edit needs no covering doc

- Date: 2026-08-31
- Status: accepted
- Supersedes: none

## Context

`doc-coverage` fires on any changed source file. Appending one comment line to a
file in a real repository produced a blocking error, with no contract change to
document.

The README calls this check the one that "produces most of the value and most of
the friction". That framing hid the problem. Friction that buys nothing is not a
trade, and a gate that blocks a typo fix is a gate people switch off, after
which none of the other checks run either.

The information needed to tell the two apart already existed.
`logic-touched` compares two revisions with comments and docstrings masked, so
it can say whether an edit touched anything else. It has done that in subagent
mode since it was written, and `doc-coverage` never asked.

## Options

### Exempt files under a line threshold

`TRIVIAL_LINES` already does this for small files. It does not help: the files
people fix comments in are normal-sized.

### Ask what changed

Compare the file against the reference commit with documentation masked. Equal
means the edit was comments and docstrings, and there is nothing to cover.

## Decision

`logicOf` moves from `skill/docbound/scripts/lib/checks/logic-touched.mjs` into
`skill/docbound/scripts/lib/scan.mjs`, beside the masking it wraps, and
`skill/docbound/scripts/lib/checks/doc-coverage.mjs` skips a file whose masked
content is unchanged.

Not knowing counts as not exempt. A new file, an untracked tree, and a language
the scanner has no table entry for all keep the check demanding a doc.

## Consequences

A comment fix, a docstring reword, and a licence header edit stop blocking. A
signature change, a new function, and a deleted branch still block.

The check now reads the file's previous revision, so it costs a `git show` per
changed source file. That cost was already paid by `logic-touched` in subagent
mode and is cached per path on the context.

An edit that changes a comment and nothing else, where the comment was the only
documentation of a behaviour, is now uncovered and unreported. That is the
trade: the check reads what the code does, and a comment is not that.

## What would reverse this

If repositories start hiding real changes in files the scanner cannot read, the
fallback for an unknown language should be to demand a doc rather than to fall
back to a line-based strip.
