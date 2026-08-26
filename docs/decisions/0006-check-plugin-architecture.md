# 0006. One module per check

- Date: 2026-08-26
- Status: accepted
- Supersedes: none

## Context

The Python reference holds twenty-one checks and their shared helpers in one
946-line file. Two things about the check set make its shape an interface rather
than an implementation detail. Adding a check is the most common change this
repository will take, and each check must be exercised by a fixture whose
expected output names it — so a check, its registration, its documentation row,
and its fixture are one unit of work, and a contributor has to be able to find
all four.

The check set is also fixed for this pass. Whatever shape it takes has to make
the next check obvious to add without making the current twenty-one harder to
diff against the Python they came from.

## Options

### One module, mirroring the Python

The port is a transcription, so diffing it against the specification is
mechanical. Leaves a single file that every contributor edits, and no signature
that says what a check is — the contract stays a convention observed by reading
the other twenty.

### One module per check under a checks directory

Each file exports `{ id, level, run(ctx) }`, and the shape of the contract is
visible from any one of them. The list at the top of the audit entry point is
the registry, so registration is one line and forgetting it is a fixture
failure. Costs
twenty-one files where the Python had sections, and a shared context object that
has to carry everything any check needs.

## Decision

One module per check. Each file in `skill/docbound/scripts/lib/checks/` is named
for its check ID and exports `{ id, level, run(ctx) }`;
`skill/docbound/scripts/audit.mjs` imports the list, runs each in order, applies
waivers, and reports. Shared machinery that more than one check needs lives in
`skill/docbound/scripts/lib/` beside them: git, path vocabulary, change
detection, the worklog parse, configuration, and the report.

The file name is the check ID. That is what makes a finding navigable: an agent
reading a `dead-ref` finding can open
`skill/docbound/scripts/lib/checks/dead-ref.mjs` without searching for it.

## Consequences

Adding a check is four steps in one commit, and `docs/DEVELOP.md` lists them:
write the module, add a fixture whose expected output names the ID, add a row to
the check table in the skill text, and add an entry to `docs/checks.md`. A
check that needs data no other check needs has to put it on the context object,
which is a shared surface — the pressure that keeps checks from accumulating
private state.

## What would reverse this

If checks start needing to run in dependent order or to read each other's
findings, the flat registry stops describing what happens and the set becomes a
pipeline with explicit stages. The trigger is the second check that has to run
after a specific other one. The `adr-shape` and `adr-immutable` checks are
close to it already, and stay independent only because each re-derives whether
the record is new.
