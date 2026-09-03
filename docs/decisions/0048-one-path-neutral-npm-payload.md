# 0048. One path-neutral npm payload

- Date: 2026-09-03
- Status: accepted
- Supersedes: none

## What to do

Put skill content only in `dist/payload/`. Add a provider by teaching the CLI
its destination and hook manifest; do not add a copy of the payload to the npm
tarball.

## Context

`scripts/build.mjs` wrote one identical payload tree per provider under
`dist/`, even though `cli/install.mjs` already owns provider placement and
merges each provider's hook manifest into the target repository. The copies
made the package larger and expanded every distribution freshness comparison
without changing what users installed.

## Options

### Keep a complete tree for each provider

Continue building an install-ready tree for every provider. This makes a
provider directory directly copyable, but it keeps payload duplication in the
published tarball and makes adding a provider multiply generated output.

### Ship one path-neutral payload

Build `dist/payload/` once, then let `cli/install.mjs` copy it to the selected
provider path and generate the provider-specific hook manifest at install time.
Hand-vendoring remains possible from the same payload directory.

## Decision

Ship one path-neutral payload. `scripts/build.mjs` builds `dist/payload/`, and
the published CLI runs and installs from that tree. `cli/install.mjs` supplies
each selected provider's destination and hook manifest when it installs.

## Consequences

The tarball and committed distribution have one canonical skill copy instead
of one per provider. Provider support remains narrow and verified, but its
placement data no longer affects build output.

Directly copying a provider-specific distribution is no longer a route because
there is no provider-specific directory. Users who hand-vendor copy
`dist/payload/`; users who want hooks use `npx docbound install`.

## What would reverse this

Restore provider-specific build output only when a verified provider requires a
transformed skill payload that cannot be expressed as a destination path plus a
generated hook manifest.
