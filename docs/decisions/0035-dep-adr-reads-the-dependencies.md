# 0035. `dep-adr` reads the dependencies, not the filename

- Date: 2026-08-31
- Status: accepted
- Supersedes: none

## Context

`dep-adr` fired whenever a file in its manifest set changed, and the manifest set
held no lockfiles. Both halves of that were wrong.

A manifest carries scripts, metadata, and tool configuration beside its
dependencies. Renaming an npm script is a manifest change and not a dependency
change, and it blocked with a message asking for a decision record about a
dependency nobody had touched.

A lockfile is where an automated bump actually lands. `npm audit fix` and every
bot that raises a patch version touch the lockfile and nothing else, so the one
case the check exists for was the case it could not see.

## Options

### Keep matching on the filename

Cheap and wrong in both directions, which is where this started.

### Parse every manifest format

Correct for each format someone writes a parser for, and a promise to keep
parsers for Cargo, Poetry, Bundler, Composer, and the rest current. That is a
larger commitment than a documentation check needs to make.

### Compare the dependency-bearing part

Parse JSON manifests, narrow to the blocks that declare a dependency, and
compare that against the reference commit. Treat every other manifest format as
dependency-bearing in full, since those files are mostly dependency
declarations already. Treat any change to a lockfile as a dependency change,
because it is one.

## Decision

`dependencyPart` in `skill/docbound/scripts/lib/checks/dep-adr.mjs` narrows a
JSON manifest to `dependencies`, `devDependencies`, `peerDependencies`,
`optionalDependencies`, `bundledDependencies`, `overrides`, and `resolutions`,
and compares that against the file's previous revision. A non-JSON manifest is
compared whole. `isLockfile` in `skill/docbound/scripts/lib/paths.mjs` names the
fifteen lockfiles this recognises, and any change to one counts.

Not knowing counts as a change. A new manifest, an unparseable one, and one with
no previous revision to compare against all still ask for a record.

## Consequences

An automated lockfile bump now blocks until somebody writes down why the version
moved. That is the intent and it is also the noisiest thing this change does; a
repository that takes bot bumps daily will reach for `audit.exclude` or a
standing waiver.

A pyproject or Cargo manifest edit that touches only metadata still fires,
because those are compared whole. The JSON narrowing could be extended per
format later, one format at a time, and each one is a new parser to keep.

The check now reads the previous revision of each changed manifest, which is one
`git show` per file. `doc-coverage` already pays that cost per source file.

## What would reverse this

If lockfile findings become the majority of what this check reports and are
waived rather than acted on, the waiving is the measurement: drop lockfiles back
out of the set, or report them at warning level and keep the error for a
manifest whose declared dependencies moved.
