# 0004. Commit `dist/` rather than building on install

- Date: 2026-08-26
- Status: accepted
- Supersedes: none

## Context

The skill has one canonical source (`skill/docbound/`) and seven provider
distributions that differ only in where the payload sits and which hook manifest
sits beside it. Three of the four supported install paths never run a build
step: a git submodule pointed at this repository, a `curl` or copy of one
directory out of it, and the Claude Code plugin marketplace, which reads
`plugin/` straight from a checkout. Only `npx docbound install` runs code, and
it runs it in the user's project, not here.

## Options

### Build on install

`dist/` is derived state, and derived state in git produces merge conflicts and
review noise on every skill edit. Requires a build step on every install path,
which means the submodule and copy installs stop working and the plugin
marketplace has nothing to read.

### Commit the build output

Every install path works against a checkout with no toolchain. Costs a
committed directory that must not drift from `skill/`, and review diffs that
show each skill edit seven extra times.

## Decision

Commit `dist/`. `scripts/build.mjs` is a pure function of `skill/docbound/` —
same input, byte-identical output, no timestamps or machine paths in any emitted
file. `scripts/check-dist-fresh.mjs` rebuilds into a temporary directory and
compares, and CI fails when `skill/` moved and `dist/` did not, so drift is a
red build rather than a silent one.

`skills-lock.json` records the content hash of each provider's payload so
`npx docbound update` can tell an installed copy from a current one without
re-reading every file.

## Consequences

A skill edit is a two-file-tree commit: `skill/` and its rebuilt `dist/`. The
build is the only writer of `dist/`; hand-editing it is reverted by the next
build and caught by the freshness check. Reviewers read `skill/` and skim
`dist/`, and `docs/DEVELOP.md` says so.

## What would reverse this

If provider count grows past the point where a skill edit's diff is unreadable —
roughly a dozen distributions, or any provider that needs a transformed payload
rather than a copy — publish the built payloads as npm artifacts and keep only
`plugin/` in git, since the plugin marketplace is the one consumer that cannot
run a build.
