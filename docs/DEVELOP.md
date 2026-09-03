# Developing docbound

Node 20 or later. There are no dependencies to install, including for
development.

```
npm test
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
definition of done. `docs/decisions/0001-adopt-docbound.md` says why it applies
here in particular.

The audit does not read the skill payload's prose in this repository
(`docs/decisions/0007-audit-exclude-config.md`). It does read
`skill/docbound/scripts/`, `cli/`, `scripts/`, `tests/`, and `docs/`, which is
where this repository's own code and documentation live.

`audit.exclude` in `.docbound/config.json` also names three individual files.
`docs/providers.md` is a reference to paths inside other people's repositories,
so none of them exist here by construction; two decision records name paths that
a later decision removed, and an accepted record is an archive rather than
something to edit into agreement with the present. Adding a file to that list is
a change to what this repository considers documented, and is reviewed as one.

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
`ref`, `mode`, `since`, `baseline`, `excludes`, `topEntry`, `waivers`, `docs()`,
`allDocs()`, and `beforeVersion(path)` (a file's content at the reference
commit, or null).

`docs()` is the docs this change is answerable for and is what a check reports
on. `allDocs()` is every doc in the repository and is a corpus, for a check that
cannot answer without one: `orphan-doc` needs it to see that an older doc links
to a newer one, and `duplicate-block` needs it to find the paragraph's first
owner. Under a baseline the two differ; without one they are the same list
(`docs/decisions/0019-adoption-baseline.md`). Anything a check needs that is not there goes on
the context, which is a shared surface on purpose. See
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
case is already covered by every other fixture. The near-miss is not, and the
near-miss is where a check goes wrong.

Then point the check at a repository nobody here wrote. Install docbound into a
clone of something real, run the audit, and read every finding: four blocking
false positives shipped in 0.1.0 and all four were found this way in about five
minutes, by a suite of 154 passing tests that had never met unfamiliar code.
A construct that turns up goes into `tests/fixtures/real-world-shapes/`
(`docs/decisions/0024-a-fixture-of-real-world-shapes.md`).

**3. Add a row to the check table** in `skill/docbound/SKILL.md`. That table is
what an agent reads; a check missing from it is a check nobody knows how to
satisfy.

**4. Add an entry to `docs/checks.md`.** what it detects, why, what is exempt,
and a waiver example a reviewer would accept.

**5. Add a row to the check table in `README.md`.** A test asserts that every
module under `skill/docbound/scripts/lib/checks/` appears there and that some
fixture's `expected.json` produces its ID, so a check that skips step 2 or this
one fails the suite rather than shipping unpinned
(`docs/decisions/0037-the-readme-counts-itself.md`).

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

A check may report an individual finding at a level below its declared one, and
`dead-ref` does: it blocks on an unambiguous path claim and warns on an
ambiguous one (`docs/decisions/0023-ambiguous-path-claims-are-warnings.md`). The
declared `level` stays what it was, so a waiver written against the ID still
dismisses every finding from it. Raising a finding's level is the breaking
direction and needs the same treatment as changing the declared one.

## Adding or correcting a provider

`cli/providers.mjs` is the only place a provider's conventions appear. It sits
in `cli/` rather than `scripts/` because the published package imports it, and
anything the package imports must be inside the npm `files` whitelist. An
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

**An entry needs evidence, not inference.** Answer all four questions from the
harness itself, from its bundled documentation, the skills it ships, or its
files on disk. Record what you used in the entry's `verified` field:

1. Where does it read a **project-level** skill from?
2. What file holds its hook manifest, and what is that file's schema?
3. What are its event names for a file edit and for the agent stopping?
4. What does a hook do to block a stop? The gate depends on a specific answer.

A wrong entry fails silently: the payload lands where the harness never reads,
the install reports success, and the skill never loads. `docs/providers.md`
holds the candidates that do not ship and what each still needs; promoting one
means moving it from there to here with its evidence, then deleting its section.

Then run `node scripts/build.mjs` and commit `dist/` and `skills-lock.json` with
the change. The install matrix in `tests/cli.test.mjs` iterates the table, so a
new entry is covered without editing the test. Correcting an entry
against better evidence is welcome and needs no decision record.

## Changing the skill's prose

`skill/docbound/` is the only place it is edited. `dist/` and `plugin/` are
copies; editing one is reverted by the next build and caught by the freshness
check.

Keep `skill/docbound/SKILL.md` under 300 lines. New instruction goes in a file
under `skill/docbound/references/` and is linked from SKILL.md. The skill's own
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
git push --follow-tags
```

The script sets the version everywhere it appears, rebuilds, verifies on a clean
tree, moves the changelog's Unreleased section under the new number, writes its
own worklog entry, commits, and tags. It refuses to start on a dirty tree and
refuses to finish on a red one. `--dry-run` writes nothing.

Pushing is the whole of publishing. `.github/workflows/publish.yml` runs on
every push to main, asks the registry whether the version in `package.json` is
already there, and stops quietly when it is. When it is not, it runs the same
three gates CI runs, prints what would go into the tarball, and publishes with
provenance. Nothing is published by hand.

A registry version is immutable, which is why the guard exists: without it,
every push that does not change the version fails with E403, and most pushes do
not change the version. With it, a re-run, a revert, and a merge that leaves the
version alone all skip rather than fail, and the tag is a marker rather than a
trigger.

The version lives in four files plus `skills-lock.json`, which is why setting it
by hand is four chances to leave one behind.

### What runs in the workflows

Both workflows pin the checkout and setup-node actions to commit SHAs,
with the tag and the resolution date in a trailing comment. A tag is mutable and
the publish job holds an identity npm trusts, so a moved tag is somebody else's
code publishing under this name. `.github/dependabot.yml` proposes the moves
weekly, which is what keeps a pin from going stale
(`docs/decisions/0043-actions-are-pinned-by-commit.md`).

Upgrading an action means merging that pull request, not editing a version
number. Take the SHA from the bot rather than resolving it by hand:

```
gh api repos/actions/checkout/git/refs/tags/v4 --jq .object.sha
```

`id-token: write` is declared on the publish job rather than the workflow, and
neither checkout keeps its credentials on disk.

### What has to exist on the GitHub side

The publish job names an environment called `npm`. GitHub creates it implicitly
on first use with no rules, so the workflow runs either way, and it blocks
nothing until required reviewers are configured on it in the repository
settings. A push to main that carries a new version publishes without review
until they are.

Branch protection on main is the other half. Without it, a direct push from
anyone with write access reaches the registry, and a published version cannot be
removed after seventy-two hours.

If a token is used rather than trusted publishing, scope `NPM_TOKEN` to that
environment rather than to the repository, so no other workflow can read it.

### The npm side, once

Trusted publishing has to be configured on npmjs.com against this repository and
`publish.yml`, which requires the package to exist. So either publish `0.1.0`
from a maintainer's machine and configure it afterwards, or set an `NPM_TOKEN`
repository secret and let the workflow publish the first version too. The
workflow supports both and needs no edit either way. With trusted publishing
configured, no long-lived secret lives in this repository at all.

npm ignores the `readme` field in `package.json` and always renders the
`README.md` at the tarball root, whatever `files` says. A second README written
for the registry is shipped and shown to nobody, which is why this project ships
a single README.


## Style

Two registers, and which one applies depends on who is reading. The full
reasoning is `docs/decisions/0011-two-registers.md`.

`README.md` is the adoption register. Its reader has committed to nothing and is
deciding whether to spend attention, so it addresses the reader directly, opens
on output rather than prose, uses worked examples, and answers the objection
before it is raised.

Everything else follows the standard in
`skill/docbound/references/style.md`: declarative, present tense, dry, no second
person. That includes `docs/`, the module READMEs, the decision records, and the
worklog. Their reader is already here and wants a true answer quickly.

Editing the front door and editing a module README are different jobs. Check
which file you are in first.

`.editorconfig` sets 100 columns. There is no linter and no formatter, and
`scripts/README.md` records why. Comments explain why rather than what; the
audit's own `comment-sentence` and `restating-comments` checks run over this
repository's source, so the standard the skill describes is one it is held to.

## Where to go next

- `docs/ARCHITECTURE.md`: how the pieces fit and what crosses between them
- `docs/checks.md`: the check reference
- `docs/subagent.md`: wiring the documentation subagent
