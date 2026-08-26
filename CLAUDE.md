# Claude Code notes for this repository

Read `AGENTS.md` first. It is the contract for any agent working here: worklog
entry before the first edit, decisions recorded when made, and a green audit
before reporting done. This file adds only what is specific to Claude Code.

## The skill is installed here as a symlink

`.claude/skills/docbound` points at `dist/claude-code/.claude/skills/docbound`,
which is build output. Reading it is reading the built copy of
`skill/docbound/`. Edit the source, never the link's target — the next
`node scripts/build.mjs` overwrites it.

`.cursor/skills/docbound` is the same arrangement for the other shipped
provider. Both are excluded from this repository's own audit, in
`.docbound/config.json`.

## The hooks are deliberately not wired here

This repository has no Claude Code settings file. Gating a contributor's
session with tooling they did not ask for is not this project's call to make;
`.github/workflows/ci.yml` is the gate instead, and it runs the same audit.

To run the gate locally while you work:

```
node cli/index.mjs install --providers=claude-code --scope=project
```

That writes an untracked settings file under `.claude/`. Remove it when you are
done, or leave it — it affects nobody else.

To run the hook once by hand, without installing anything:

```
node skill/docbound/scripts/hook.mjs --event stop --provider claude-code
```

It exits 2 with the findings on stderr when the audit fails, which is what
Claude Code reads as "do not stop, and here is why".

## Running things

Use the repository scripts rather than remembering flags:

```
npm test          # every test file; package.json owns the list
npm run build     # skill/docbound/ into dist/ and plugin/
npm run check-dist
npm run audit
```

`npm test` runs an explicit list of test files rather than a directory, because
directory discovery behaves differently across the Node versions in `engines`.
That list lives only in `package.json`; CI and `scripts/release.mjs` both call
`npm test` rather than restating it.

`tests/package.test.mjs` shells out to `npm pack`, so it is the one test that
needs npm on the path and the one that takes a second or two.

## The documenter subagent

`skill/docbound/agents/docbound-documenter.md` is a subagent definition, and it
is available in this repository through the symlinked payload. Use it the way
`docs/subagent.md` describes: give it the base ref and the coder's final commit,
and take its audit result verbatim rather than summarising it.

## What the fixtures need

`tests/harness.mjs` puts the running node on `PATH` for fixture scripts, so a
fixture that shells out to `node` gets the same one the tests run under. If you
add a fixture that calls anything else, it needs the same treatment.

Fixtures write their repositories into temporary directories and clean up in an
`after` hook. A test that fails part-way leaves one behind; they are harmless
and the OS clears them.
