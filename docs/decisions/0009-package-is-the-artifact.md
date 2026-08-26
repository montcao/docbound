# 0009. Treat the published package as the artifact under test

- Date: 2026-08-26
- Status: accepted
- Supersedes: none

## Context

Every test in the suite ran against the git checkout, where every file exists.
What users receive is different: npm builds a tarball from the `files` whitelist
in `package.json`, and only what that whitelist names is present when the CLI
runs.

The first version of the whitelist omitted two things the CLI reads at runtime —
the provider table, imported by both entry points, and `skills-lock.json`, read
by `install`, `update`, and `doctor`. A published package would have failed to
resolve a module on its first command. Seventy-odd tests passed while that was
true, because none of them opened the artifact.

The whitelist is a boundary like any other interface, and it had no owner and no
check. Being an inclusion list rather than an exclusion list makes it the kind
that fails closed and silently: forgetting an entry does not error anywhere
except in a user's terminal.

## Options

### Widen the whitelist and move on

One line, fixes the two known omissions. Leaves the next import from an
unpublished directory to be discovered by whoever installs after the release,
and leaves `cli/` importing from `scripts/`, which is a trap rather than a bug.

### Make the package the thing under test

A test packs the real tarball, unpacks it where no checkout is reachable, and
installs from it. Costs a slower test — it shells out to `npm pack` — and buys a
check that covers every future omission rather than these two. The provider
table also moves from `scripts/` to `cli/`, so the published package stops
importing across a boundary that does not ship.

## Decision

Both halves. `tests/package.test.mjs` packs, unpacks, and installs from the
tarball, then runs the installed audit and the installed stop hook out of the
user's project. The provider table lives at `cli/providers.mjs`, because it is
product data that ships; `scripts/build.mjs` imports it rather than owning it.

The rule that follows: nothing under `cli/` may import from `scripts/`.
`scripts/` is repository tooling and is not published. `cli/README.md` states it
and the packaging test enforces it.

The same test asserts the package carries no test suite, no build scripts, and
no frozen Python reference, so the whitelist is checked in both directions.

## Consequences

The test suite now depends on `npm` being on the path and takes a second or two
longer. That is the price of the only test that can fail for a packaging reason,
and packaging is the one failure a user meets before anything else.

A new runtime dependency on a file outside the whitelist fails in CI rather than
after publication. A contributor adding one will see the packaging test fail
with a module resolution error, which names the file.

`scripts/` and `cli/` now have a direction: `scripts/` may import from `cli/`
and `skill/`, and neither may import from `scripts/`.

## What would reverse this

If `npm pack` becomes slow enough to dominate the suite, the packaging test
moves to a release-only step in `scripts/release.mjs` and CI, and stops running
on every local test invocation. It does not stop running before a publish; the
release script already refuses on a red suite.
