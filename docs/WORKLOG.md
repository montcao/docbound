# Worklog

Newest entry first. One entry per task. Intent is written before the first
edit; Outcome and Still open are written after the audit passes.
Entries older than a quarter can be pruned once their content is reflected
in ARCHITECTURE, module READMEs, or Architecture Decision Records (ADRs).

## 2026-08-26 — Correct the Cursor provider entry and cut dead surface

Agent: claude · Branch: main

### Intent

A user working in Cursor questioned a claim in the previous task's report that
`doctor` had called Cursor installed when it was not. Checking it turned up a
real defect underneath: the Cursor entry in `scripts/providers.mjs` places the
skill in the generic agent-skills directory, and Cursor reads project skills
from its own. Installing for Cursor has been putting the payload where
Cursor never looks, silently — the exact failure the previous task recorded as a
known gap and could not verify without the harness present. The harness is now
present, and its own bundled documentation is the source.

Two smaller faults come with it. The Cursor hook manifest omits the schema
version its format requires, and carries a key that format does not define.
Provider detection reads only the project directory, so a Cursor user whose
repository has no Cursor directory yet gets no detection at all.

The second half of the task is removal. The previous task left duplicated and
unreachable surface: the default configuration is written out in three places,
`cli/install.mjs` imports and re-exports a function nothing imports from it,
`copyDist` takes an option it no longer reads, several modules export helpers
that only they use, and `skills-lock.json` records the same payload hash eight
times.

### Expected to touch

- `scripts/providers.mjs` — the Cursor entry, its hook manifest, and detection
- `cli/install.mjs`, `cli/index.mjs` — dead imports, dead option, lock shape
- `skill/docbound/scripts/lib/` — un-export helpers with one internal caller
- `scripts/build.mjs`, `scripts/check-dist-fresh.mjs` — one owner for the
  default config, and a lock that records each hash once
- `dist/`, `skills-lock.json` — rebuilt
- `docs/` — this entry, ARCHITECTURE's known gaps, module README decisions

### Unknowns going in

- Whether Cursor reads the generic agent-skills directory as well as its own.
  If it does, the current entry was merely redundant rather than broken.
  Nothing the harness ships mentions the generic one.
- Whether the other six provider entries have the same class of error. Only
  Claude Code, Codex, and Cursor are present on this machine to check against.

### Outcome

**The Cursor entry was wrong, and worse than reported.** Cursor reads project
skills from its own directory, and the entry in `scripts/providers.mjs` named
the generic agent-skills one, so `install --providers=cursor` had been writing
the payload where Cursor never looks. Corrected, along with two faults in the same
entry: its hook manifest now carries `version: 1`, which that format requires,
and drops a key the format does not define. `cursorHooks` in
`scripts/providers.mjs` is separate from `genericHooks` for that reason. The
event names and the exit-code-2 blocking contract the stop gate depends on were
already right.

The correction is sourced from the harness's own bundled documentation rather
than from a third-party summary, so Claude Code, Codex, and Cursor are now
verified entries and the remaining four are not. `docs/ARCHITECTURE.md` carries
that split, and `scripts/providers.mjs` says it per entry.

**Detection read only the project directory.** A harness writes its project
directory only once it has something to keep there, so working in Cursor on a
repository with no Cursor directory was detected as no harness at all, and fell
back to the generic layout Cursor does not read. `detectProviders` in `cli/install.mjs`
now reads the home directory too.

**A second bug the new test found.** Merging a hook manifest built its result
from the existing file's top-level keys only, so every key the incoming manifest
declared was discarded — including the schema version Cursor requires. Fixed in
`mergeHooks`; the project's own keys still win over docbound's.

**Removed.** The default configuration was written out three times; the copy in
`skill/docbound/scripts/lib/config.mjs` is now the only one, imported by
`scripts/build.mjs` and `cli/install.mjs`. `skills-lock.json` recorded one
payload hash per provider, all eight identical by construction, and now records
it once. Deleted a re-export in `cli/install.mjs` that nothing imported, an
option `copyDist` had stopped reading, and five exports whose only caller was
the module that defined them.

**A third bug, from piping the verification output.** Running
`node cli/index.mjs doctor | head` crashed with an unhandled EPIPE and a stack
trace where the output should have been, because `head` closes stdout while the
command is still writing. Every command here is one someone will pipe.
`ignoreEpipe` in `skill/docbound/scripts/lib/entry.mjs` is called by
`cli/index.mjs`, `skill/docbound/scripts/audit.mjs`, and
`skill/docbound/scripts/scaffold.mjs` when each is run directly.

**Tests.** The install matrix now runs over the provider table itself rather
than a hand-written list, and asserts the payload lands at each provider's
declared path and that its hook command points there. That is the strongest
assertion available from inside the repository: it catches a payload written to
the wrong place, and cannot catch a declared path that is wrong about the world.
A regression test pipes `doctor` into `head` and fails on an EPIPE in stderr.
Four tests added, 70 passing.

### Still open

- Four provider entries remain unverified against a running harness: gemini,
  github, opencode, and the generic layout. Each needs the harness present, and
  the same method that fixed Cursor — read what the harness itself ships —
  applies to each.
- The check candidate from the previous entry stands: `comment-sentence` reads
  the continuation lines of a wrapped sentence as fragments. Unchanged here.

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

**Two reporting defects found while verifying the acceptance steps.** `doctor`
called Cursor and universal installed whenever Codex was, because three
providers read the same `.agents/skills/docbound` path; it now reports one line
per payload and the hook state per provider, which is what actually differs
between them. And `--providers` rejected `claude`, which is the name the
documented install command uses; `scripts/providers.mjs` now carries a small
alias table.

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
rather than waived.

One waiver stands, and it is an artifact of this task's shape rather than of the
code: the decision records were opened with their Context in the first commit
and completed later, which `adr-immutable` reads as editing an archive when all
seven commits are audited as a single diff. The per-commit audit that CI and the
hook run does not see it.

### Still open

- `comment-sentence` reads the continuation lines of a wrapped sentence as
  fragments, because it compares line by line. Every file in this repository
  whose header is a wrapped paragraph trips it — `scripts/build.mjs`,
  `scripts/release.mjs`, `scripts/providers.mjs`, `cli/index.mjs`, and
  `cli/install.mjs` among them. The warnings are left on the record rather than
  answered by writing worse comments. A refinement — treat a run of comment
  lines as one unit before judging it a sentence — is a candidate for the next
  pass at the check set, and it is the single most useful change to the check
  set this task found.
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
- Opening a decision record with only its Context, as this task was asked to do,
  collides with `adr-immutable` as soon as the record is completed in a later
  commit and both commits land in one diff. Either the check learns that a
  record with an empty Decision section is not yet an archive, or the guidance
  says to write the record whole at the moment the decision is made. The second
  is closer to what the skill already says, and neither is a change to make
  without a decision record of its own.
- `todo-shape` and `comment-sentence` both fire on prose *about* themselves —
  the header of `skill/docbound/scripts/lib/checks/todo-shape.mjs` names the
  markers it looks for, and is read as containing one. Warnings, and harmless
  here, but a repository whose subject matter is documentation vocabulary will
  meet them constantly.

### Waivers

waiver: adr-immutable docs/decisions — records 0002, 0003, 0005, and 0006 were
opened with their Context in this task's first commit, as the task required, and
completed in a later commit of the same task. The edits repaired quoted paths
and completed sections that were deliberately left empty; no reasoning recorded
earlier was changed. Nothing had been released, so no reader had seen the
earlier version. Applies only to auditing this task's seven commits as one diff.
