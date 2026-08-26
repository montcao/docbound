# Developing docbound

Node 20 or later. No dependencies to install — there are none, including for
development.

```
node --test tests/audit.test.mjs tests/build.test.mjs tests/cli.test.mjs tests/scaffold.test.mjs
node scripts/build.mjs
node scripts/check-dist-fresh.mjs
node cli/index.mjs audit
```

Those four commands are what CI runs, in that order. All four are green before a
change lands.

## This repository runs docbound on itself

Open a worklog entry in `docs/WORKLOG.md` before the first edit. Record
structural decisions in `docs/decisions/` when you make them. Close the entry
with what actually changed, by path, and what is still open. The audit is the
definition of done — `docs/decisions/0001-adopt-docbound.md` says why it applies
here in particular.

The audit does not read the skill payload's prose in this repository
(`docs/decisions/0007-audit-exclude-config.md`). It does read
`skill/docbound/scripts/`, `cli/`, `scripts/`, `tests/`, and `docs/`, which is
where this repository's own code and documentation live.

## Where things are

| Path | What it is |
|---|---|
| `skill/docbound/` | The canonical skill. The only place skill content is edited |
| `dist/` | Build output, committed. Seven provider distributions |
| `plugin/` | Build output, committed. The Claude Code plugin payload |
| `cli/` | `npx docbound` |
| `scripts/` | Build, freshness check, release, provider table |
| `tests/` | Fixtures and four test files |

Each of those directories has a README with its contract and its must-not list.

## Adding a check

Four steps, one commit. The audit refuses to pass on this repository until they
are all done, which is the point.

**1. Write the module.** A file in `skill/docbound/scripts/lib/checks/` named
for the check ID:

```js
// One or two sentences on what this catches and why it is worth catching.

import { isSource } from "../paths.mjs";

export const id = "your-check-id";
export const level = "error"; // or "warn"

export function run(ctx) {
  for (const file of [...ctx.changed].sort()) {
    if (!isSource(file, ctx.excludes)) continue;
    ctx.add(id, level, file, "what is wrong, and what to do about it");
  }
}
```

The context object carries `root`, `changed`, `added`, `addedDirs`, `git`,
`ref`, `mode`, `since`, `excludes`, `topEntry`, `waivers`, `docs()` (the
memoised list of Markdown files), and `beforeVersion(path)` (a file's content at
the reference commit, or null). Anything a check needs that is not there goes on
the context, which is a shared surface on purpose — see
`docs/decisions/0006-check-plugin-architecture.md`.

Register it in the `AUTHOR_CHECKS` or `SUBAGENT_CHECKS` list in
`skill/docbound/scripts/audit.mjs`. The list order is the order findings are
reported in.

**2. Add a fixture.** A directory under `tests/fixtures/` holding a setup script
and an expected-findings file. `tests/README.md` has the contract; most fixtures start from
`db_build_baseline` in `tests/fixtures/_base.sh` and introduce exactly one
defect.

Then add a second fixture, or extend an existing one, for the case where the
check must **not** fire. The suite asserts exact check-ID sets, so the negative
case is already covered by every other fixture — but the near-miss is not, and
the near-miss is where a check goes wrong.

**3. Add a row to the check table** in `skill/docbound/SKILL.md`. That table is
what an agent reads; a check missing from it is a check nobody knows how to
satisfy.

**4. Add an entry to `docs/checks.md`** — what it detects, why, what is exempt,
and a waiver example a reviewer would accept.

Then rebuild, because the skill text changed:

```
node scripts/build.mjs
node scripts/check-dist-fresh.mjs
```

### What you may not change

Check IDs, levels, and the waiver grammar. Agents write waiver lines against
those IDs in repositories this project cannot see, so a rename silently breaks
them. Changing one needs a decision record and a deprecation path, not a commit.

Messages may be reworded, and `docs/checks.md` and the SKILL.md table are
updated in the same change when they are.

## Adding or correcting a provider

`scripts/providers.mjs` is the only place a provider's conventions appear. An
entry names where the payload lands, which directories imply that harness is in
use, and what its hook manifest looks like:

```js
{
  name: "someharness",
  label: "Some Harness",
  payload: ".someharness/skills/docbound",
  detect: [".someharness"],
  hookFile: ".someharness/hooks.json",
  hookManifest: (payload) => genericHooks(payload, "someharness"),
}
```

Omit `hookFile` and `hookManifest` for a harness with no file-edit hook; the
skill installs and the audit becomes something the agent has to remember to run.

Then `node scripts/build.mjs`, add the name to the install matrix in
`tests/cli.test.mjs`, and commit `dist/` and `skills-lock.json` with the change.

This is the file most likely to be out of date, because it tracks seven other
projects' conventions rather than this one's. A correction here is welcome and
needs no decision record.

## Changing the skill's prose

`skill/docbound/` is the only place it is edited. `dist/` and `plugin/` are
copies; editing one is reverted by the next build and caught by the freshness
check.

Keep `skill/docbound/SKILL.md` under 300 lines. New instruction goes in a file
under `skill/docbound/references/` and is linked from SKILL.md — the skill's own
rule against duplication applies to itself.

## The Python reference

`skill/docbound/scripts/reference/` holds the implementation the Node audit was
ported from. It is a frozen specification, it is not shipped, and it is deleted
one release from now
(`docs/decisions/0002-node-runtime.md`). While it is here, a change to
change-detection semantics is worth diffing against it:

```
python3 skill/docbound/scripts/reference/audit.py --root /some/repo --json
node   skill/docbound/scripts/audit.mjs          --root /some/repo --json
```

## Releasing

```
node scripts/release.mjs --version 0.2.0
```

It refuses to run on a dirty tree, sets the version in `package.json`,
`.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`, rebuilds,
runs the freshness check and the tests, moves the `Unreleased` section of
`CHANGELOG.md` under the new version, commits, and tags. Pushing the tag is left
to you.

`CHANGELOG.md` records releases. Task history is `docs/WORKLOG.md`, and the two
do not overlap.

## Style

`.editorconfig` sets 100 columns. There is no linter and no formatter, and
`scripts/README.md` records why. Comments explain why rather than what; the
audit's own `comment-sentence` and `restating-comments` checks run over this
repository's source, so the standard the skill describes is one it is held to.

## Where to go next

- `docs/ARCHITECTURE.md` — how the pieces fit and what crosses between them
- `docs/checks.md` — the check reference
- `docs/subagent.md` — wiring the documentation subagent
