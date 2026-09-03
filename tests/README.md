# tests

How this project proves the audit does what it says. Every check has a small
repository built for it, and the test asserts the exact set of check IDs the
audit reports against that repository.

The assertion is an exact match rather than a subset, so a check that fires
where the scenario does not call for it fails the suite.

## Start here

- `tests/harness.mjs`: builds a fixture into a temporary repository and runs
  the audit against it.
- `tests/fixtures/_base.sh`: the documented baseline most fixtures start from.
- `tests/audit.test.mjs`: the fixture table.
- `tests/fixtures/real-world-shapes/setup.sh`: constructs collected from a real
  repository, each of which was once reported as a defect
  (`docs/decisions/0024-a-fixture-of-real-world-shapes.md`).
- `tests/hook.test.mjs`: the hook, which is the part that can stop a session.

## Contract

A fixture is a directory holding two files. The setup script builds a git
repository in `$FIXTURE_DIR`; the expected-findings file records the check IDs
and their counts for each level, plus the expected exit code and whether git was
detected. `tests/fixtures/filled-baseline/setup.sh` and
`tests/fixtures/filled-baseline/expected.json` are the smallest pair.

A setup script receives four variables: `FIXTURE_DIR` (an empty directory to
build in), `FIXTURE_META` (a directory outside the repository, for extra audit
flags written to a file named `args`), `FIXTURE_LIB` (the path to
`tests/fixtures/_base.sh`), and `SKILL_DIR`.

Extra flags go in `$FIXTURE_META/args`, never in the repository: an untracked
file inside the fixture would join the change set and move the findings.

## Must not

- Must not assert a subset of the findings. The exact-match assertion is the
  whole value of the suite; loosened, it stops noticing the checks that widen.
- Must not write outside `$FIXTURE_DIR` and `$FIXTURE_META`.
- Must not depend on the order fixtures run in, or on a fixture built by another
  test. A fixture that reuses another runs that fixture's setup script
  explicitly, which `documented-change`, `waiver`,
  and `author-on-subagent-tree` all do.
- Must not need a test framework. `node --test` and `node:assert` only.

## Use

```
npm test
```

`docs/DEVELOP.md` covers adding a fixture for a new check.

## Depends on

`skill/docbound/scripts/`, `cli/`, and `scripts/`. The suite runs the real
executables rather than importing pieces of them, except in
`tests/build.test.mjs`, where the build's functions are called directly so a
comparison can be made against a tree that was never written to disk.

## Gotchas

- `tests/fixtures/restating-comments/pricing.py.txt` and
  `tests/fixtures/real-world-shapes/prompt.go.txt` are deliberately bad sample
  files. The extension keeps them out of the audit's source set, so their marker
  comments are not findings against *this* repository.
- The suite has met code this project did not write exactly once, through
  `tests/fixtures/real-world-shapes/`. Everything else is written here, by the
  same hand as the checks, which is why four blocking false positives shipped in
  0.1.0. Pointing docbound at an unfamiliar repository and reading the first run
  costs about five minutes and is the only thing that has ever found them.
- Fixture dates come from `date +%F` so the worklog entries they write are
  always inside the audit's session window. A fixture cannot be pinned to a
  fixed date without `worklog-entry` failing on age.
- `tests/harness.mjs` puts the running node on `PATH` for the setup scripts,
  because `tests/fixtures/bare-scaffold/setup.sh` shells out to the scaffold.
