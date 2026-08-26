# 0005. Block on stop by default

- Date: 2026-08-26
- Status: accepted
- Supersedes: none

## Context

The skill's thesis is one sentence: a task is not done until the audit exits 0.
Written as an instruction in `skill/docbound/SKILL.md`, that sentence competes
with every other instruction in the agent's context and loses whenever the
agent's own sense of completion arrives first. The failure is not that the agent
disagrees; it is that the agent finishes, reports, and never runs the check.

Provider hooks make the sentence enforceable. A `Stop` hook that exits non-zero
prevents the agent from ending the turn and hands it the findings, so the agent
sees why it is not done at the moment it believed it was.

## Options

### Advisory hook: run the audit, print findings, never block

Nothing a developer does is interrupted, and a mistuned check costs a line of
output rather than a wedged session. It also restores the exact failure the hook
exists to fix — the agent sees the findings in a stream of other output, decides
they are informational, and stops anyway.

### Blocking hook on stop, findings on stderr, exit 2

The audit becomes the definition of done in mechanism, not just in prose. Costs
a wedged session whenever a check is wrong and the agent cannot work out how to
satisfy it, which is worst on the first task in a repository whose docs are in
bad shape.

## Decision

`blockOnStop` defaults to true. `PostToolUse` runs a fast subset
(`worklog-entry`, `dead-ref`, `template-residue`, `adr-immutable`) and returns
findings as context without blocking; `Stop` runs the full audit and exits 2
with the findings on stderr when it fails.

Three escapes, each cheaper than the last: a waiver line in the worklog entry,
which is the skill's own mechanism and leaves the exception on the record;
`hook.blockOnStop: false` in the gitignored per-developer override beside
`.docbound/config.json`; and `npx docbound install --no-hooks`, which installs
the skill with no gate at all.

## Consequences

An agent that cannot satisfy a check writes a waiver and explains itself, which
is the intended outcome. A developer who disagrees with the gate turns it off in
a file nobody reviews. A repository adopting docbound with a large stale-doc
backlog should run the triage pass described in `skill/docbound/SKILL.md` before
enabling the hook, because triage is what the backlog needs and a blocked stop
does not help it happen.

## What would reverse this

If waivers appear in more than one in five worklog entries, the gate is
manufacturing exceptions rather than documentation, and the default flips to
advisory while the checks are retuned. That is the same threshold the adoption
ADR that `scaffold` writes into a new repository sets for the discipline itself.
