# 0002. Node as the single runtime for skill scripts, hook, and CLI

- Date: 2026-08-26
- Status: accepted
- Supersedes: none

## Context

The skill shipped as two Python 3 scripts with no dependencies beyond the
standard library. The repository being built around them adds two more
executables that must run the same checks: a provider-native hook that fires
inside the agent loop after every edit and on stop, and an `npx docbound` CLI
that installs, updates, and runs the audit outside an agent.

Both of the new executables have a runtime forced on them. The CLI is
distributed through npm, so it is Node. Every provider hook mechanism in scope —
Claude Code `settings.json`, `.codex/hooks.json`, `.github/hooks/`,
`.cursor/hooks.json` — invokes a command on a path and is documented against
Node. A hook that shells out to `python3` inherits whatever interpreter the
developer's shell resolves, on a machine the skill author never sees. The
current one on this workstation is Python 3.9, which is older than most of the
standard library idioms in `skill/docbound/scripts/reference/audit.py`.

## Options

### Keep Python as the skill scripts; the Node CLI and hook shell out

No port, so no risk of behavioural drift, and the Python stays the single
implementation. Costs a second runtime on every user's machine, a version
detection path (`python3` versus `python` versus a virtualenv), and a hook that
fails at edit time on any machine whose `python3` is too old or absent. A skill
that installs cleanly and then fails on the first file edit is worse than one
that declines to install.

### Port to Node; keep the Python as the specification for one release

One runtime for hook, CLI, and skill scripts, matching every provider's hook
mechanism and the npm distribution channel. Node 20 or later is already a
prerequisite of `npx docbound`. The cost is the port itself: 946 lines of Python
whose behaviour is a public interface, including three change-detection cases
that were bugs once and were fixed.

## Decision

Port. `skill/docbound/scripts/audit.mjs` and `scaffold.mjs` are the
implementation; Node 20 or later, ESM, `node:` imports only, zero runtime
dependencies. The Python stays at `skill/docbound/scripts/reference/` for one
release as the specification the port is diffed against, and is deleted in the
release after this one.

The port is checked, not asserted: every check has a fixture under
`tests/fixtures/`, and `tests/audit.test.mjs` asserts the error and warning
check-ID sets match exactly rather than as a subset, so a check that fires where
the Python did not is a test failure.

## Consequences

Users need Node 20 or later and no longer need Python. Check IDs, levels,
messages, exit codes, and the waiver grammar are frozen by the fixtures, so a
reworded message is a test failure until `docs/checks.md` and the table in
`skill/docbound/SKILL.md` are updated with it. Two implementations exist for one
release, and the Python one is not maintained during it — it is a frozen
specification, and `skill/docbound/scripts/reference/README.md` says so.

## What would reverse this

If a provider adds a hook mechanism that cannot invoke Node, the hook entry
point for that provider is what changes, not the runtime. The runtime choice
reverses only if Node stops being the common denominator across provider hooks
and npm distribution — at which point the fixtures, not the Python, are what the
next port is diffed against.
