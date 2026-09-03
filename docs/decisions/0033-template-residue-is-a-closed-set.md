# 0033. Template residue is a closed set, not a shape

- Date: 2026-08-31
- Status: accepted
- Supersedes: none

## Context

`template-residue` matched any angle-bracketed token that looked like a
placeholder, minus an allowlist of HTML tag names. Pointed at a repository that
had never run scaffold, it blocked on ordinary prose: a TypeScript return type
written into a README, an HTML element named in a style guide, a shell usage
line naming its own argument.

A blocking check that fires on prose in a repository that never used the
templates is the worst case for adoption. The first audit is the one that
decides whether the tool stays installed, and this one produced errors that had
no correct fix beyond rewording sentences that were already right.

The shape was never the signal. What the check is actually looking for is one of
a few dozen exact strings that `skill/docbound/templates/` ships.

## Options

### Extend the allowlist

Add TypeScript generics, more HTML elements, shell usage conventions. The
allowlist has to grow once per language and once per convention, and every
repository that hits a gap hits it as a blocking error.

### Read the templates at run time

Parse `skill/docbound/templates/` for placeholder tokens on each audit. Exact by
construction, and it follows a template a project has edited. It also costs file
reads per run, and it fails open in an installation where the templates were not
copied, which is the one place a wrong answer is silent.

### Match the vocabulary the templates ship

Hard-code the set of placeholder strings, and have a test assert the set still
matches the templates.

## Decision

`skill/docbound/scripts/lib/checks/template-residue.mjs` holds `PLACEHOLDERS`,
the exact strings the templates ship, and reports a token only when it is in
that set. `tests/scaffold.test.mjs` extracts the placeholders from
`skill/docbound/templates/` and asserts the two agree, so a placeholder added to
a template cannot silently stop being checked.

The generic angle pattern stays only as the cheap first pass that finds
candidates to compare against the set.

## Consequences

A doc carrying a placeholder from somebody else's template is no longer caught.
That was never a promise this check could keep, and pretending otherwise is what
made it fire on prose.

The set and the templates are two files that have to agree, which is a
duplication. The test is what makes it a duplication with a gate on it rather
than a drift waiting to happen.

Editing a template now means editing the check, and an agent that does the first
without the second gets a failing suite naming the missing string.

## What would reverse this

If projects start editing their copy of the templates and reporting that
`template-residue` misses their placeholders, the set should be read from the
templates at run time instead, with the hard-coded list kept as the fallback for
an installation that has no templates beside it.
