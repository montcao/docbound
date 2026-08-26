# Worklog

Newest entry first. One entry per task. Intent is written before the first
edit; Outcome and Still open are written after the audit passes.
Entries older than a quarter can be pruned once their content is reflected
in ARCHITECTURE, module READMEs, or Architecture Decision Records (ADRs).

## 2026-08-26 — Make the published package actually installable, and cut 0.1.0

Agent: claude · Branch: main

### Intent

Everything so far has been exercised from a git checkout. Nobody has run the
path a user will actually take: `npx docbound`, which downloads a tarball built
from the `files` whitelist in `package.json` and runs the CLI out of it.

That path is broken. Both files in `cli/` import the provider table from
`scripts/`, and `scripts/` is not in the whitelist, so the published package
would fail to resolve a module on its first command. The bug is not the missing
entry so much as the absence of anything that would have caught it: no test
opens the artifact that gets published.

This task fixes that, treats the current scope as the MVP, and cuts 0.1.0. No
features are added or removed. The work is the last mile: make the artifact
correct, prove it with a test that packs and installs it, and put the README in
front of someone who has five minutes.

### Expected to touch

- `cli/providers.mjs` — the provider table moves into the package that ships it
- `tests/package.test.mjs` — new: pack, unpack, install, assert
- `README.md` — reordered around a first run rather than around the design
- `docs/`, `CHANGELOG.md` — the paths that move, and the release notes
- `package.json` — version and the whitelist

### Unknowns going in

- Whether anything else in the whitelist is missing. The packaging test is
  written to answer that for every future change rather than this one.
- Whether the skill's frontmatter description, at 1006 characters against
  Cursor's 1024 limit, leaves enough room to survive an edit.

### Outcome

**The published package was broken, and two things were missing rather than
one.** Both files in `cli/` imported the provider table from `scripts/`, which
the npm `files` whitelist does not include, and `skills-lock.json` — read by
`install`, `update`, and `doctor` — was not in it either. Either one would have
made `npx docbound` fail on its first command with a module resolution error.

The table moved to `cli/providers.mjs`, because it is product data that ships;
`scripts/build.mjs` imports it now rather than owning it. `skills-lock.json`
joined the whitelist. The rule that came out of it — nothing under `cli/` may
import from `scripts/` — is in `cli/README.md` and in
`docs/decisions/0009-package-is-the-artifact.md`.

**A test that opens the artifact.** `tests/package.test.mjs` packs the real
tarball, unpacks it where no checkout is reachable, installs from it into a
fixture repository, and then runs the *installed* audit and the *installed* stop
hook out of that project. It also asserts the package carries no test suite, no
build scripts, and no frozen Python, so the whitelist is checked in both
directions. Six tests; the suite is 73.

This is the check that was missing. Seventy tests passed while the package was
unusable, because none of them opened it.

**`docbound --help` exited non-zero.** A flag in the command position was read
as a command, so the first thing anyone types printed usage to stderr and exited
2. Both it and `--version` are commands now.

**The README is reordered around a first run.** Quickstart is at the top —
three commands and what to expect from them — with the loop, the gate, and the
check table after it. Two install snippets were still naming a provider and a
distribution directory that were removed earlier today; an edit meant to fix
them had silently not applied, which is its own argument for the audit.

**Frontmatter headroom.** The skill's description is 1006 characters against
Cursor's 1024 limit. Valid, and eighteen characters from not being.

### Still open

- The skill's frontmatter description has eighteen characters of headroom before
  Cursor rejects it. Nothing checks that, and the next edit to it is likely to
  be the one that breaks a provider silently. A `frontmatter-limits` check is
  the strongest candidate for the next pass at the check set.
- Four candidate providers still need someone with the harness in front of them;
  `docs/providers.md` has the four questions each has to answer.
- `comment-sentence` reads the continuation lines of a wrapped sentence as
  fragments, and the warnings it leaves on this repository are the record of
  that. Unchanged for three entries now.
- The packaging test shells out to `npm`, so the suite now needs npm on the
  path. `docs/decisions/0009-package-is-the-artifact.md` says what would move it
  to a release-only step.

### Waivers

waiver: dead-ref docs/providers.md — this file's subject is where other tools
read skills from, so by construction none of the paths it names exist in this
repository. Removing the backticks would leave a reference document about paths
unable to typeset a path.

waiver: dead-ref docs/decisions — records 0002 and 0007 name provider paths that
existed when they were written and were removed by
`docs/decisions/0008-verified-providers-only.md`. An accepted record is an
archive; editing it to match the present is what `adr-immutable` exists to stop.

## 2026-08-26 — Ship only verified providers, and close three security findings

Agent: claude · Branch: main

### Intent

This repository is about to be public. Two classes of problem make that unsafe
in its current state.

The first is provider entries that were written from assumption rather than from
evidence. Correcting the Cursor entry earlier today showed the method — read
what the harness itself ships — and applying that method to the rest shows the
table is largely fiction. Codex's own skill-creator places skills under its own
home directory and describes no project-level location, so the path and the
hook schema in the Codex entry are both wrong. No project puts
skills under the GitHub directory; that holds Copilot instructions, workflows,
and issue templates, so the GitHub entry was invented, and it is the one entry
that writes into a directory people treat as security-critical. Gemini and
opencode have no evidence behind them at all. A supported-providers list whose
entries silently do nothing is the first thing a reader will test and the first
thing they will report.

The second is three findings from reading the code as an attacker would. The
configuration merge assigns keys straight from parsed JSON, so a repository
carrying a crafted config file can reach `Object.prototype` through a hook that
runs automatically after every file edit. Merging a hook manifest
treats an unparseable existing file as an empty one, which silently replaces a
developer's entire harness settings with docbound's two hooks. And the hook is
documented as never emitting file contents, which is false: two checks quote a
truncated line from the file they are about.

### Expected to touch

- `cli/providers.mjs` — remove every entry not verified against a harness
- `skill/docbound/scripts/lib/config.mjs` — prototype-safe merge
- `cli/install.mjs` — refuse to overwrite a config or a manifest that will not
  parse
- `skill/docbound/scripts/hook.mjs` and the hooks reference — an accurate
  claim about what hook output can contain
- `docs/providers.md` — new: what each candidate needs before it can ship
- `dist/`, `plugin/`, and this repository's own harness directories — rebuilt
  and pruned
- `README.md`, `docs/`, `CHANGELOG.md` — the supported list, honestly

### Unknowns going in

- Whether removing the generic Agent Skills layout costs more than it gains. It
  is the layout the skill's own text recommends, but the one independent project
  on this machine uses that directory for plugin metadata and puts its skills
  elsewhere, so it is a claim I cannot check either.
- Whether a prototype-pollution guard is enough, or whether the config merge
  should reject unknown keys outright.

### Outcome

**Five provider entries removed; two ship.** `cli/providers.mjs` now holds
Claude Code and Cursor, each carrying the evidence it was verified against.
Codex, Gemini CLI, GitHub Copilot, opencode, and the generic Agent Skills layout
are documented as candidates in `docs/providers.md` with the four questions each
still has to answer. The policy is recorded in
`docs/decisions/0008-verified-providers-only.md`.

Two of the five were demonstrably wrong rather than merely unconfirmed. Codex's
own skill-creator describes a location under the user's home directory and no
project-level one, and the removed entry's hook manifest used another harness's
event vocabulary. The GitHub entry was invented: no project examined puts skills
or hooks under that directory, which holds instructions files, workflows, and
access configuration — and writing there on a guess is the part of this that was
worst.

`install` with nothing detected now refuses and names the options instead of
falling back to an unverified path, exiting 1 rather than 2, because the flags
were fine. `dist/payload/` is the skill with no directory wrapped around it, for
vendoring by hand where nobody has checked what the path should be. The build
removes its whole output tree first, so a dropped entry stops shipping instead
of lingering in the package: the GitHub distribution was still on disk after the
table lost its entry.

**Three security findings, all fixed and all with a regression test.**

The configuration merge assigned keys straight from parsed JSON, so a cloned
repository carrying a crafted config could reach `Object.prototype` through a
hook that runs automatically after every file edit. Unsafe keys are refused, and
an object whose prototype has been reassigned is no longer treated as plain and
recursed into.

Installing treated a harness configuration that would not parse as an absent
one and replaced it — a trailing comma in a settings file was enough to lose all
of it. Install now refuses, says which file and why, and leaves it untouched.
The CLI catches that refusal and prints one line instead of a stack trace.

The hook was documented in four places as never emitting file contents. That was
false: `todo-shape` quotes up to seventy characters of the line holding the
marker and `stale-marker` up to eighty of the line it matched, and those
messages pass through hook output. The claim is now precise about which checks
and what limits, rather than weakened or quietly dropped. Redacting instead was
considered and rejected: the agent reading the output already has the file open,
so redaction would cost the findings their usefulness to prevent nothing.

The frozen Python reference no longer travels in the npm package either. It
stays in the repository for one release as the specification
(`docs/decisions/0002-node-runtime.md`) and is nobody's business to download.

**This repository's own harness directories.** The symlinks and hook manifests
for removed providers are deleted, so nothing here writes into the GitHub
directory but CI. Cursor is dogfooded alongside Claude Code, and both payload
paths are excluded from this repository's audit in `.docbound/config.json`.

### Still open

- The two waivers below are the only ones standing, and both are about docs
  whose subject is paths outside this repository. If `dead-ref` ever learns to
  tell a path claim from a path mention, both can go.
- Four candidate providers remain undocumented in the harness sense — someone
  with Codex, Gemini CLI, Copilot, or opencode in front of them can answer the
  four questions in `docs/providers.md` and promote one.
- The check candidate stands from two entries ago: `comment-sentence` reads the
  continuation lines of a wrapped sentence as fragments.

### Waivers

waiver: dead-ref docs/providers.md — this file's subject is where other tools
read skills from, so by construction none of the paths it names exist in this
repository. Removing the backticks would make a reference document about paths
unable to typeset a path.

waiver: dead-ref docs/decisions — records 0002 and 0007 name provider paths that
existed when they were written and were removed by
`docs/decisions/0008-verified-providers-only.md`. An accepted record is an
archive; editing it to match the present is the thing `adr-immutable` exists to
prevent.

## 2026-08-26 — Correct the Cursor provider entry and cut dead surface

Agent: claude · Branch: main

### Intent

A user working in Cursor questioned a claim in the previous task's report that
`doctor` had called Cursor installed when it was not. Checking it turned up a
real defect underneath: the Cursor entry in `cli/providers.mjs` places the
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

- `cli/providers.mjs` — the Cursor entry, its hook manifest, and detection
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
skills from its own directory, and the entry in `cli/providers.mjs` named
the generic agent-skills one, so `install --providers=cursor` had been writing
the payload where Cursor never looks. Corrected, along with two faults in the same
entry: its hook manifest now carries `version: 1`, which that format requires,
and drops a key the format does not define. `cursorHooks` in
`cli/providers.mjs` is separate from `genericHooks` for that reason. The
event names and the exit-code-2 blocking contract the stop gate depends on were
already right.

The correction is sourced from the harness's own bundled documentation rather
than from a third-party summary, so Claude Code, Codex, and Cursor are now
verified entries and the remaining four are not. `docs/ARCHITECTURE.md` carries
that split, and `cli/providers.mjs` says it per entry.

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
  `dead-ref`. In a consumer repository the payload sits under a harness
  directory the audit already excludes by name; here it does
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
`cli/providers.mjs` is the single place a provider's conventions appear.
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
providers read the same generic skills path; it now reports one line
per payload and the hook state per provider, which is what actually differs
between them. And `--providers` rejected `claude`, which is the name the
documented install command uses; `cli/providers.mjs` now carries a small
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
  `scripts/release.mjs`, `cli/providers.mjs`, `cli/index.mjs`, and
  `cli/install.mjs` among them. The warnings are left on the record rather than
  answered by writing worse comments. A refinement — treat a run of comment
  lines as one unit before judging it a sentence — is a candidate for the next
  pass at the check set, and it is the single most useful change to the check
  set this task found.
- The provider paths and hook event names in `cli/providers.mjs` are taken
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
