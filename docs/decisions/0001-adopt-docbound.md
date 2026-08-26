# 0001. Adopt docbound as this repository's documentation discipline

- Date: 2026-08-26
- Status: accepted
- Supersedes: none

## Context

This repository ships docbound. Its own documentation is therefore both
documentation and evidence: a skill that claims a blocking audit defines done,
distributed from a repository that does not run that audit on itself, is an
untested claim. The skill's own failure mode — agent-written code whose author
does not persist between sessions — applies to this repository more than to
most, because most of its code was written by an agent.

## Options

### Document conventionally and test the skill only through fixtures

Fixtures pin check behaviour precisely and cost nothing to maintain. They
exercise the checks against synthetic repositories, which is exactly what makes
them precise: no fixture ever discovers that the discipline is unusable on a
real tree, because no fixture is one.

### Run docbound on this repository as well as testing it with fixtures

Every task here opens a worklog entry, records decisions when they are made, and
closes on a green audit. Costs a few minutes per task and forces the audit to
work on a tree that has a skill payload, build output, and a plugin bundle in
it — a shape that surfaced one real gap (see `docs/decisions/0007-audit-exclude-config.md`).

## Decision

Both. Fixtures pin behaviour (`tests/fixtures/`); the repository itself is the
integration test. `.github/workflows/ci.yml` runs `node cli/index.mjs audit` on
this tree and fails the build when it does not exit 0.

## Consequences

Contributors cannot land a change without a worklog entry and a covering doc.
`docs/WORKLOG.md` grows and needs pruning once entries older than a quarter are
reflected in ARCHITECTURE or in an ADR. A check that is wrong about this
repository blocks this repository, which is the point: the maintainer feels the
false-positive rate before users do.

## What would reverse this

If the audit blocks routine maintenance changes here more than once a quarter
without finding a real documentation gap, the check set is mistuned. Retune the
checks; do not stop running them.
