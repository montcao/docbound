# docbound

Documentation is a work product of every task, not a byproduct of finishing one.
docbound is a skill for coding agents that makes that structural: a worklog
entry before the first edit, decisions recorded at the moment they are made,
docs moved in the same change as the code, and a deterministic audit that
defines done.

Agent-written code has a specific failure. The author does not persist. Every
session is a new engineer with no memory of why anything is shaped the way it
is, and if the *why* is not written down in the moment it is decided, it is
gone.

## The loop

1. **Orient** — read the README, ARCHITECTURE, the last three worklog entries,
   and the module READMEs you expect to touch. Note what is already false.
2. **Declare** — open a worklog entry before the first edit. Intent is written
   before you know how it turns out; that is what makes it worth reading.
3. **Work** — the doc that covers a change moves in the same change as the code.
4. **Decide** — the instant you reject option B is the only time you fully know
   why. Structural decisions become a record; local ones become a table row.
5. **Reconcile** — delete what has stopped being true, then run the audit. When
   it exits 0, stop.

## Install

**npx** — detects your harness, copies the skill, merges the hooks:

```
npx docbound install
npx docbound install --providers=claude-code,codex --scope=project
npx docbound install --no-hooks
```

**Submodule** — the skill stays a checkout you can update with git:

```
git submodule add https://github.com/montcao/docbound .docbound-src
npx --prefix .docbound-src docbound link --source=.docbound-src
```

**Claude Code plugin**:

```
/plugin marketplace add montcao/docbound
/plugin install docbound@montcao
```

**Copy** — no toolchain at all. Take one directory out of `dist/`:

```
cp -R dist/universal/.agents .
```

Then, in a repository with no docs, bootstrap the structure:

```
npx docbound scaffold
```

The scaffold creates files full of placeholders and the audit fails on them, on
purpose. Structure is not documentation.

## The audit

The audit is the definition of done. Not "mostly passes", not "warnings only".

```
npx docbound audit
```

Errors block; warnings print and do not block, but leaving one is a choice made
on the record.

| ID | Level | Catches |
|---|---|---|
| `worklog-entry` | error | A task that began without an intent written first |
| `worklog-closed` | error | An entry with no Outcome or no Still open |
| `doc-coverage` | error | A changed source file with no covering doc in the same diff |
| `new-dir-readme` | error | A new package with no README |
| `dead-ref` | error | A doc pointing at a path that does not exist |
| `dep-adr` | error | A dependency change with no decision record |
| `adr-shape` | error | A decision record with no reversal condition |
| `adr-immutable` | error | An accepted record edited below its Status line |
| `template-residue` | error | An unfilled placeholder in a doc |
| `orphan-doc` | warn | A doc nothing links to |
| `duplicate-block` | warn | A paragraph with two owners |
| `stale-marker` | warn | Changelog phrasing where current truth belongs |
| `restating-comments` | warn | Comments that say what the code already says |
| `todo-shape` | warn | A TODO with no problem, no action, or no owner |
| `comment-sentence` | warn | Commented-out code, and comments that are notes to self |
| `line-length` | warn | Lines past the limit the repository sets |
| `mixed-indent` | warn | Tabs and spaces in one file |

Four more apply in subagent mode. `docs/checks.md` documents every one with a
waiver example.

A finding you disagree with becomes a waiver line in the worklog entry:

```
waiver: doc-coverage src/generated/api_types.ts — emitted by the codegen step;
the contract lives in the schema, not in this file.
```

Waivers are honoured for the current entry only, and the human sees them. They
record a considered exception; they are not a way to skip work.

## Hooks

Installed by default. `PostToolUse` runs four cheap checks after every edit and
surfaces findings without blocking. `Stop` runs the full audit and exits 2 with
the findings on stderr, so an agent that believes it is finished is handed the
reason it is not.

Turn blocking off per developer in the gitignored local override beside
`.docbound/config.json`, or install without the gate using `--no-hooks`. The defaults are argued in
`docs/decisions/0005-hook-blocking-default.md`.

## Subagent mode

When a documentation agent runs after a coding agent, it never had the moment
where the decision was made. So in subagent mode every reconstructed reason is
marked `Inferred:` and queued for confirmation, decision records cite their
source class, the documenter may edit docstrings and comments but never logic or
names, and a missing `### Handoff` section from the coder is an error the
documenter cannot fix — because the fix is upstream. `docs/subagent.md` has the
wiring.

## Keeping `.docbound/` out of git

`.docbound/config.json` is tracked: it is the policy the team shares. The
per-developer override and the hook caches are not. Add this to `.gitignore`:

```
# docbound-ignore-start
.docbound/config.local.json
.docbound/cache/
# docbound-ignore-end
```

## Supported tools

Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, opencode, and any agent
that reads the Agent Skills format. The skill is plain Markdown plus Node
scripts with no runtime dependencies, and it degrades to a whole-tree scan
without git.

Provider placement and hook manifests live in one file,
`scripts/providers.mjs`. It is the part of this repository most likely to be out
of date; corrections are welcome and need no ceremony.

## Where to go next

- `docs/checks.md` — every check, what it detects, and a waiver example
- `docs/ARCHITECTURE.md` — how the pieces fit
- `docs/subagent.md` — wiring the documentation subagent
- `docs/DEVELOP.md` — building, testing, releasing, adding a check
- `docs/decisions/` — why things are shaped this way
- `skill/docbound/SKILL.md` — the skill itself

## License

Apache-2.0. See `LICENSE` and `NOTICE.md`.
