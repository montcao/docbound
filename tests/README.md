# tests

Fixture-based. Every check has a scenario that produces it, and the assertion is
an exact match on the set of check IDs the audit reports. Not a subset, so a
check that fires where the scenario does not call for it is a failure.

## Start here

- `tests/harness.mjs`: builds a fixture into a temporary repository and runs
  the audit against it.
- `tests/fixtures/_base.sh`: the documented baseline most fixtures start from.
- `tests/audit.test.mjs`: the fixture table.

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
  `code-style-editorconfig`, and `author-on-subagent-tree` all do.
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

- `tests/fixtures/code-style/pricing.py.txt` is the deliberately bad sample
  file. Its extension keeps it out of the audit's source set, so its marker
  comment and long lines are not findings against *this* repository.
- Fixture dates come from `date +%F` so the worklog entries they write are
  always inside the audit's session window. A fixture cannot be pinned to a
  fixed date without `worklog-entry` failing on age.
- `tests/harness.mjs` puts the running node on `PATH` for the setup scripts,
  because `tests/fixtures/bare-scaffold/setup.sh` shells out to the scaffold.
