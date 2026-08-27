# 0024. A fixture of shapes distilled from real repositories, not vendored code

- Date: 2026-08-27
- Status: accepted
- Supersedes: none

## Context

Four blocking false positives were found in about five minutes of pointing
docbound at one repository it had not written. The suite had 154 tests and found
none of them.

The reason is structural. All 22 fixtures are shell scripts that build small
repositories, and the same hand wrote the fixtures and the checks, so every
fixture contains the constructs its check expects. The suite measures internal
consistency, which it does well: it caught every regression these changes
introduced. It had simply never met code this project did not write.

What the real repository supplied was not volume. It was four shapes:

<!-- docbound-ignore-start -->
- a gofmt-clean Go file whose raw string holds space-indented JSON
- a URL route written `/scan`, and `owner/repo` standing in for an argument
- a documented commit format whose `<type>` is not an unfilled placeholder
- a doc inside a package writing paths the way that package's tooling does
<!-- docbound-ignore-end -->
## Options

### Vendor real repositories

Highest fidelity, and it keeps finding things nobody predicted. It also puts
somebody else's licensed source in this tree, ties the suite to code that moves
underneath it, and adds megabytes to a repository whose whole shipped payload is
about 7,000 lines.

### Clone at test time

No licence question and no bulk. It needs a network, which makes the suite fail
for reasons unrelated to the code, and it makes a test run depend on somebody
else's branch. This project has no runtime and no development dependencies, and
a suite that reaches the network has one in every way that matters.

### Write down the shapes

A fixture containing the constructs, sourced from the real run and cited to it.
Licence-clean, deterministic, offline, and readable. It only ever contains what
somebody thought to put in it, which is the whole limitation.

## Decision

`tests/fixtures/real-world-shapes` holds the four shapes and asserts no error on
any of them. Its `tests/fixtures/real-world-shapes/setup.sh` says where they came from, because a fixture whose
provenance is unwritten looks invented and stops being maintained.

<!-- docbound-ignore-start -->
The one warning it does expect is `owner/repo`, which is the behaviour decided
<!-- docbound-ignore-end -->
in `docs/decisions/0023-ambiguous-path-claims-are-warnings.md` rather than an
accident being pinned.

## Consequences

The suite now fails if any of these four regress, which is what a fixture is
for.

It does not find the fifth shape. Nothing in this decision claims otherwise, and
the honest description of coverage is "the constructs somebody has already been
bitten by". The way to find more is to keep installing docbound into
repositories it has not seen and to read the first run, which is how these four
were found and costs about five minutes.

That is a manual step with no schedule attached, which is the weakest part of
this decision. It is recorded as an open item rather than pretended away.

## What would reverse this

If two consecutive rounds of pointing docbound at unfamiliar repositories turn
up shapes this fixture does not have, the distillation is not keeping up and the
suite needs real code in it, licence and bulk accepted.
