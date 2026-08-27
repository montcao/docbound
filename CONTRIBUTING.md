# Contributing

Thanks for looking. This is a small project with a strict shape, and most of the
rules below exist because breaking one of them silently broke something once.

## The short version

```
npm test                        # 170 tests, about ten seconds
node scripts/build.mjs          # skill/docbound/ into dist/ and plugin/
node scripts/check-dist-fresh.mjs
node cli/index.mjs audit        # the project's own gate
```

All four have to exit 0 before a change is done. CI runs the same four on Node
20, 22, and 24.

## This repository runs docbound on itself

Open a worklog entry in `docs/WORKLOG.md` before your first edit, either with
`node cli/index.mjs start "what you are about to do"` or by hand from
`skill/docbound/templates/WORKLOG-entry.md`. Close it with an outcome when the
audit passes.

That is not ceremony. A skill claiming a blocking audit defines done, shipped
from a repository that does not run that audit, is an untested claim.
`AGENTS.md` is the full contract and is worth reading once.

## Things that are easy to get wrong

`dist/` and `plugin/` are build output. `skill/docbound/` is the only place
skill content is edited, and editing a copy is reverted by the next build and
caught by the freshness check.

Check IDs, their levels, and the waiver grammar are a public interface. Agents
write waiver lines against those IDs in repositories nobody here can see, so
renaming one is a breaking change with a decision record and a deprecation path.

The fixtures assert an exact set of check IDs, not a subset. A check that fires
where a scenario does not call for it is a failure, and loosening an assertion
to make a change land removes the suite's whole value.

There are no dependencies, at runtime or for development, and adding one
contradicts the thing this project claims about itself.

`skill/docbound/SKILL.md` stays under 300 lines. New instruction goes into a
file under `skill/docbound/references/` and is linked.

## Adding a check

Four steps, documented in `docs/DEVELOP.md`: the module, a fixture, a row in the
table in `skill/docbound/SKILL.md`, and an entry in `docs/checks.md`. Then point
it at a repository nobody here wrote and read every finding, which is how four
blocking false positives were found in a suite of 154 passing tests.

## Adding an editor

`docs/providers.md` lists the candidates and the four questions each one needs
answered. An entry written from a guess fails silently: the files copy, the
install prints success, the editor reads a different path, and the skill never
loads. Evidence means the editor's own files, quoted, not a description of them.

## Decisions

If you choose between two plausible approaches, record it. A structural choice
is a file in `docs/decisions/` from `skill/docbound/templates/ADR.md`, including
a concrete condition that would reverse it. `node cli/index.mjs adr --title
"..."` creates the file with the next number.

An accepted record is an archive. Never edit the body. Supersede it, or append a
`## Corrections` section for a false statement of fact.

## Reporting a bug

The most useful report names the repository shape it happened on, the command
you ran, and the full audit output. If a check fired where it should not have,
the construct that triggered it is the whole bug and belongs in the issue.
