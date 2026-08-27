# 0021. line-length enforces a limit the repository set, and nothing otherwise

- Date: 2026-08-27
- Status: superseded by 0026
- Supersedes: none

## Context

`line-length` read the repository's formatter configuration and fell back to 80
columns when it found none. Pointed at a TypeScript repository that had never
configured a width, it reported 24 files, including 45 long lines in one
component and 41 in another. Every one of those lines was the repository writing
the way that repository writes.

The check's own first line said "convention beats preference". A repository with
no formatter config has stated no convention, and 80 is then not the
repository's convention but this project's preference, wearing the check's
authority. Its own comment named the mistake and the code did it anyway.

80 is also the wrong guess for the case where it fires most. It is the Prettier
default and reasonable for prose-shaped code; JSX is not prose-shaped, and a
repository writing JSX without a config has not agreed to it.

## Options

### Keep 80

Fires on most repositories, which reads as thorough. It is a warning, so it does
not block. It also trains the reader to skim past `line-length`, and a check
nobody reads is a check that is not there when it has something to say.

### A different default per language

Replaces one invented number with several. Each still has to be defended against
a repository that disagrees, and none of them is the repository's own answer.

### Infer the limit from the file

Take the width the repository already keeps and flag the outliers. Self-tuning,
and it means the same file reports differently as it grows, for no reason
anybody changed.

### Say nothing without a convention

The check enforces what the repository chose and is silent when it chose
nothing. Every finding it makes is then a finding the repository agreed to in
advance.

## Decision

`configuredLineLength` in
`skill/docbound/scripts/lib/checks/line-length.mjs` returns null when no
configuration is found, and the check skips the file. It still reads
<!-- docbound-ignore-start -->
`.editorconfig`, `printWidth`, `pyproject.toml`, `setup.cfg`, `.flake8`,
`tox.ini`, and `rustfmt.toml`.
<!-- docbound-ignore-end -->

`tests/fixtures/code-style` is now the repository with no width, and asserts
silence. `tests/fixtures/code-style-editorconfig` sets 60 and asserts the
finding.

## Consequences

`line-length` is quiet on most repositories, which is the point: when it does
speak, it is quoting the repository back to itself.

A repository with no formatter config gets no width discipline from docbound.
That is correct. Adopting a formatter is the fix for that, and it is a better
fix than a warning.

The message changed, from "repo limit or default 80" to naming the configured
number. Text, not an ID, so no waiver written against this check breaks.

## What would reverse this

If repositories that configure a width turn out to be the minority and the check
effectively never runs, it is not earning its place in the check set and should
be removed rather than given a default back.
