# Worklog

Newest entry first. One entry per task. Intent is written before the first
edit; Outcome and Still open are written after the audit passes.
Entries older than a quarter can be pruned once their content is reflected
in ARCHITECTURE, module READMEs, or Architecture Decision Records (ADRs).

## 2026-08-26 — Turn the canonical skill folder into a distributable repository

Agent: claude · Branch: main

### Intent

The docbound skill exists as a folder: `skill/docbound/SKILL.md`, four reference
files, five templates, and two Python scripts. It is usable by copying it into a
repository and nothing else. This task turns it into a repository that ships
the skill: one canonical source under `skill/docbound/`, a build that emits a
per-provider distribution under `dist/`, an `npx docbound` CLI, a Claude Code
plugin payload, provider-native hooks that run the audit inside the agent loop,
and a fixture-based test suite that pins the audit's behaviour.

The audit and scaffold scripts move from Python to Node so that one runtime
serves the hook, the CLI, and the skill scripts. The port is behaviour-first:
check IDs, levels, messages, exit codes, waiver grammar, and change-detection
semantics stay as the Python defines them, because agents in the wild write
waivers against those IDs.

The repository runs docbound on itself. `node cli/index.mjs audit` passing on
this tree is the last acceptance test, not a formality.

### Expected to touch

- `skill/docbound/` — the canonical skill; scripts ported to Node, `templates/`
  raised out of `references/`, an agent definition added
- `cli/` — new: install, update, link, audit, scaffold, adr, doctor
- `scripts/` — new: build, dist freshness check, release
- `tests/` — new: fixture repositories and four test files
- `dist/`, `plugin/`, `.claude-plugin/` — new: build output and plugin payload
- `docs/` — this worklog, ARCHITECTURE, ADRs, the check reference, the
  contributor guide, the subagent wiring guide

### Unknowns going in

- Whether the skill payload's own prose (SKILL.md, `references/`, `templates/`)
  can live inside an audited tree without tripping `template-residue` and
  `dead-ref`. In a consumer repository the payload sits under `.agents/` or
  `.claude/`, both of which the audit already excludes by name; here it does
  not, and the check set is fixed for this pass.
- Whether the Python's change detection has any behaviour the fixtures do not
  pin, which the port would silently drop.
- How much of the hook contract is stable across Claude Code, Codex, Copilot,
  and Cursor, versus per-provider.

### Outcome

**The skill.** Moved to `skill/docbound/`, its templates raised out of the
reference directory (`docs/decisions/0003-templates-location.md`), every mention
of the old path rewritten in `skill/docbound/SKILL.md` and
`skill/docbound/references/subagent-mode.md`. The Portability section now
describes a Node runtime. Added `skill/docbound/references/hooks.md` and
`skill/docbound/agents/docbound-documenter.md`. SKILL.md is 202 lines.

**The port.** `skill/docbound/scripts/audit.mjs` and
`skill/docbound/scripts/scaffold.mjs`, with twenty-one check modules under
`skill/docbound/scripts/lib/checks/` and shared machinery beside them
(`docs/decisions/0002-node-runtime.md`,
`docs/decisions/0006-check-plugin-architecture.md`). Both implementations were
run against every fixture and their JSON compared; the only intended difference
is the `new-dir-readme` message naming the template's new path. The Python is at
`skill/docbound/scripts/reference/` for one release with a README saying it is a
frozen specification.

**The gate.** `skill/docbound/scripts/hook.mjs`: a four-check subset after every
edit, the full audit on stop, exit 2 with findings on stderr
(`docs/decisions/0005-hook-blocking-default.md`). Configuration in
`.docbound/config.json`, with a gitignored per-developer override.

**Distribution.** `scripts/build.mjs` emits seven provider distributions and the
plugin payload from one source; `scripts/check-dist-fresh.mjs` and
`skills-lock.json` make drift a red build
(`docs/decisions/0004-dist-committed.md`).
`scripts/providers.mjs` is the single place a provider's conventions appear.
`cli/` is `npx docbound`, and `.claude-plugin/` plus `plugin/` are the plugin.
`scripts/release.mjs` cuts a release.

**Tests.** Seventeen fixtures under `tests/fixtures/`, each asserting exact
check-ID counts, plus `tests/build.test.mjs`, `tests/cli.test.mjs`, and
`tests/scaffold.test.mjs`. 66 tests, all green.

**Three bugs the tests found, not the reading.** The entry-point guard in every
script compared `import.meta.url` against an unresolved `process.argv[1]`, so no
script ran when its path crossed a symlink — every macOS temp directory, and
every linked install. `skillRefs` in the scaffold had the same fault and
reported an in-repository skill as outside. `copyDist` wrote a provider's hook
manifest over whatever was there instead of merging into it. All three are
fixed, and `skill/docbound/scripts/lib/entry.mjs` is now the one owner of that
comparison.

**Documentation.** `docs/ARCHITECTURE.md`, `docs/checks.md`, `docs/subagent.md`,
`docs/DEVELOP.md`, seven decision records, module READMEs for `skill/`, `cli/`,
`scripts/`, `tests/`, and `skill/docbound/scripts/reference/`, a generated one
for `plugin/`, plus `README.md`, `README.npm.md`, `AGENTS.md`, `CLAUDE.md`,
`CHANGELOG.md`, `NOTICE.md`, and `LICENSE`.

**What the audit caught in this task's own documentation.** 163 findings on the
first run, of which 126 were the skill payload's prose being read as this
repository's documentation — the Unknown recorded above, resolved by
`docs/decisions/0007-audit-exclude-config.md` rather than by waivers. The
remaining 37 were real defects in records written earlier the same day: bare
filenames in backticks where the writing standard asks for a path from the
repository root, and paths quoted before the file existed. Every one was fixed
rather than waived. Zero waivers stand.

### Still open

- `comment-sentence` reads the continuation lines of a wrapped sentence as
  fragments, because it compares line by line. It fires on `scripts/build.mjs`
  and `scripts/release.mjs`, whose file headers are wrapped prose, and the two
  warnings are left on the record rather than answered by writing worse
  comments. A refinement — treat a run of comment lines as one unit — is a
  candidate for the next pass at the check set.
- The provider paths and hook event names in `scripts/providers.mjs` are taken
  from each harness's documentation and verified against none of them. A wrong
  path installs a skill where its harness will not look, silently. Verifying
  them needs each harness present, and `docs/ARCHITECTURE.md` lists this as a
  known gap.
- Nothing checks automatically that the Node audit and the frozen Python still
  agree; the diff was run by hand for every fixture in this task. The Python is
  deleted next release, at which point `tests/fixtures/` is the only
  specification, so this closes itself.
- Other check candidates noted and deliberately not added in this pass: a check
  that a module README's `Must not` section is non-empty, and a check that a
  `Supersedes` line names a record that exists.
- The Claude Code hook is not wired in this repository, so contributors' local
  sessions are not gated; CI is. `docs/ARCHITECTURE.md` records the reasoning
  and the condition that would reverse it.
- `skills-lock.json` records a payload hash per provider, and every one of them
  is the same value, because the payload is identical by construction. The
  per-provider entries are redundant until a provider needs a transformed
  payload.
