# docbound

Documentation is a work product of every task, not a byproduct of finishing one.

docbound is a skill for coding agents. It puts a worklog entry before the first
edit, records decisions at the moment they are made, moves docs in the same
change as the code, and ends every task with a deterministic audit that either
exits 0 or says exactly what is missing.

Agent-written code has a specific failure: the author does not persist. Every
session is a new engineer with no memory of why anything is shaped the way it
is. If the *why* is not written down in the moment it is decided, it is gone.

## Quickstart

```
cd your-repo
npx docbound install      # detects your harness, copies the skill, wires the hook
npx docbound audit        # see where you stand
```

On a repository with no docs yet, lay down the structure first:

```
npx docbound scaffold
```

The scaffold writes files full of placeholders, and the audit fails on them **on
purpose**. Structure is not documentation. Fill them in and the audit goes green.

That is the whole loop: your agent opens a worklog entry, does the work, updates
the docs that cover it, and cannot call the task done until `audit` exits 0.

## What your agent does differently

1. **Orient** — read the README, ARCHITECTURE, the last three worklog entries,
   and the module READMEs it expects to touch. Note what is already false.
2. **Declare** — open a worklog entry before the first edit. Intent written
   before you know how it turns out is what makes it worth reading later.
3. **Work** — the doc that covers a change moves in the same change as the code.
4. **Decide** — the instant you reject option B is the only time you fully know
   why. Structural decisions become a record; local ones become a table row.
5. **Reconcile** — delete what has stopped being true, then run the audit. When
   it exits 0, stop.

## The gate

The audit is the definition of done. Not "mostly passes", not "warnings only".

With hooks installed it runs inside the agent loop: four cheap checks after
every file edit, the full set when the agent tries to stop. A failing stop hook
exits 2, which every supported harness reads as *do not stop, and here is why* —
so the agent is handed the findings at the moment it believed it was finished.

A finding you disagree with becomes one line in the worklog entry:

```
waiver: doc-coverage src/generated/api_types.ts — emitted by the codegen step;
the contract lives in the schema, not in this file.
```

Waivers are honoured for the current entry only, and the human sees them. They
record a considered exception; they are not a way to skip work.

Turn blocking off per developer in the gitignored local override beside
`.docbound/config.json`, or install without the gate using `--no-hooks`.

## The checks

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

Errors block; warnings print and do not block, but leaving one is a choice made
on the record. Four more apply in subagent mode. `docs/checks.md` documents every
one of them, what is exempt, and a waiver a reviewer would accept.

## Supported tools

**Claude Code** and **Cursor**. Both were verified against the harness itself —
its own bundled files, not a description of them — and each entry in
`cli/providers.mjs` records what that evidence was.

Nothing else ships. A provider entry written from inference fails silently: the
payload lands where the harness never reads, the install reports success, and
the skill never loads. `docs/providers.md` lists the candidates, what is known
about each, and the four questions to answer before one can be added.

Any other tool can still use docbound — `dist/payload/` is the skill with no
path claim attached, ready to copy wherever that tool reads skills from. It is
plain Markdown plus Node scripts (Node 20 or later) with no dependencies, and
the audit degrades to a whole-tree scan without git.

## Other ways to install

**Claude Code plugin**:

```
/plugin marketplace add montcao/docbound
/plugin install docbound@montcao
```

**Submodule** — the skill stays a checkout you update with git:

```
git submodule add https://github.com/montcao/docbound .docbound-src
npx --prefix .docbound-src docbound link --source=.docbound-src
```

**Copy** — no toolchain at all:

```
cp -R dist/payload .claude/skills/docbound
```

Keep the per-developer override out of git with a marker block in `.gitignore`:

```
# docbound-ignore-start
.docbound/config.local.json
.docbound/cache/
# docbound-ignore-end
```

`.docbound/config.json` stays tracked — it is the policy the team shares.

## Subagent mode

When a documentation agent runs after a coding agent, it never had the moment
where the decision was made. So in subagent mode every reconstructed reason is
marked `Inferred:` and queued for confirmation, decision records cite their
source class, the documenter may edit docstrings and comments but never logic or
names, and a missing `### Handoff` section from the coder is an error the
documenter cannot fix — because the fix is upstream. `docs/subagent.md` has the
wiring.

## Status

0.1.0. The skill, the audit, the hooks, and the CLI are exercised by a test
suite that includes packing the real npm tarball and installing from it.
Supported-provider coverage is deliberately narrow; see `docs/providers.md`.

## Where to go next

- `docs/checks.md` — every check, what it detects, and a waiver example
- `docs/providers.md` — supported harnesses, and what a candidate still needs
- `docs/ARCHITECTURE.md` — how the pieces fit
- `docs/subagent.md` — wiring the documentation subagent
- `docs/DEVELOP.md` — building, testing, releasing, adding a check
- `docs/decisions/` — why things are shaped this way
- `skill/docbound/SKILL.md` — the skill itself

## License

Apache-2.0. See `LICENSE` and `NOTICE.md`.
