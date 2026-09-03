# 0044. A skill directory is complete on its own

- Date: 2026-09-03
- Status: accepted
- Supersedes: none

## Context

`scripts/build.mjs` split the payload when it wrote the plugin: the agent
definitions were lifted out of `skills/docbound/` and written to `agents/` at
the plugin root, because that is where `.claude-plugin/plugin.json` points
Claude Code to look for them.

That was right for Claude Code and wrong for everything else that reads the
repository. Installing from the public repository with `npx skills add
montcao/docbound` copies the shallowest skills directory it finds, which is
`plugin/skills/docbound/`, and the copy that lands has SKILL.md,
`scripts/`, `references/`, and `templates/` but no `docbound-documenter.md`.
Verified by running it: 54 files installed, subagent absent.

A skill directory that only works because of a file beside it is a skill
directory that breaks whenever somebody copies just the directory. That is the
normal way skills move around.

## Options

### Leave it, and document the gap

Costs nothing to build and moves the problem to a reader of the README, who has
to know that one installation path silently omits a component.

### Add a third built tree at the repository root

A `skills/docbound/` directory holding the full payload, which the resolver
would find first. It fixes the ordering and adds a fourth committed copy of
every payload file to a repository that already carries three.

### Write the agents into both places

The plugin's skill directory carries the whole payload, and the plugin root
keeps its copy for Claude Code.

## Decision

`buildPlugin` writes the entire payload under `skills/docbound/`, agent
definitions included, and continues to write `agents/` at the plugin root.

The duplicated file is one Markdown document. Both copies come from the same
build in the same run, so they cannot drift, and `scripts/check-dist-fresh.mjs`
fails if either stops matching its source.

## Consequences

`npx skills add montcao/docbound` now delivers a working subagent along with
the skill.

Claude Code sees the definition twice on disk and registers it once, because
`plugin.json` names `./plugin/agents` as the agents directory and a nested
directory inside a skill is not scanned for agents.

The plugin grows by one file. `plugin/README.md` no longer describes its skills
directory as the payload minus the agent definitions, because it is now the
payload.

## What would reverse this

If a harness starts scanning skill directories for nested agent definitions and
registers this one twice, the duplicate has to go, and the fix is a root-level
`skills/` tree rather than a split payload.
