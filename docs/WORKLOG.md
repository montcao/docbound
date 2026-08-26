# Worklog

Newest entry first. One entry per task. Intent is written before the first
edit; Outcome and Still open are written after the audit passes.
Entries older than a quarter can be pruned once their content is reflected
in ARCHITECTURE, module READMEs, or Architecture Decision Records (ADRs).

## 2026-08-26 — Turn the canonical skill folder into a distributable repository

Agent: claude · Branch: main

### Intent

The docbound skill exists as a folder: `skill/docbound/SKILL.md`, four reference
files, five templates, and two Python scripts. It is usable by copying it into a repository
and nothing else. This task turns it into a repository that ships the skill:
one canonical source under `skill/docbound/`, a build that emits a per-provider
distribution under `dist/`, an `npx docbound` CLI, a Claude Code plugin payload,
provider-native hooks that run the audit inside the agent loop, and a
fixture-based test suite that pins the audit's behaviour.

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

### Still open
