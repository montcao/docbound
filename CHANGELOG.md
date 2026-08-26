# Changelog

Releases only. Task history is `docs/WORKLOG.md`, and the two do not overlap.

This project follows semantic versioning. Check IDs, check levels, the waiver
grammar, the audit's JSON shape, and its exit codes are the public interface; a
breaking change to any of them is a major version and carries a decision record.

## Unreleased

Nothing has been published yet. This section describes the first release.

### Added

- The skill: `skill/docbound/SKILL.md`, five reference files, five templates,
  and a documentation subagent definition.
- `skill/docbound/scripts/audit.mjs` — twenty-one checks, seventeen in author
  mode and four more in subagent mode, with a waiver grammar honoured for the
  current worklog entry.
- `skill/docbound/scripts/scaffold.mjs` — bootstraps the doc structure from
  templates, never overwriting.
- `skill/docbound/scripts/hook.mjs` — a fast subset after every edit, the full
  audit on stop, exiting 2 with the findings so the agent is told why it is not
  done.
- `npx docbound` — install, update, link, audit, scaffold, adr, doctor,
  detect-providers.
- Distributions for Claude Code and Cursor, plus `dist/payload/` for vendoring
  by hand, built from one canonical source and committed so the submodule, copy,
  and plugin installs need no toolchain.
- A Claude Code plugin payload and marketplace manifest.
- Seventeen fixtures asserting exact check-ID sets.

### Supported providers

Claude Code and Cursor, each verified against the harness itself and each
recording that evidence in `scripts/providers.mjs`.

Codex, Gemini CLI, GitHub Copilot, opencode, and the generic Agent Skills layout
are **not** supported. Entries for them existed during development and were
written from inference; checking them against harnesses that were available
showed the inference was wrong every time it could be tested. A wrong entry
installs the payload where the harness never reads, reports success, and loads
nothing, so none of them ship. `docs/providers.md` records what each candidate
still needs, and `docs/decisions/0008-verified-providers-only.md` records the
policy.

### Security

Three findings from a pre-release review, each fixed with a regression test:

- The configuration merge assigned keys straight from parsed JSON, so a
  repository carrying a crafted `.docbound/config.json` could reach
  `Object.prototype` through a hook that runs after every file edit. Unsafe keys
  are refused, and an object with a reassigned prototype is no longer recursed
  into.
- Installing treated a harness configuration that would not parse as an absent
  one and replaced it — a trailing comma was enough to lose a settings file. It
  now refuses, names the file, and leaves it untouched.
- The hook was documented as never emitting file contents. Two checks quote a
  truncated line inside their own message; the documentation now says which
  ones and what the limits are.

Nothing in docbound makes a network request, and it has no dependencies at
runtime or for development.

### Notes for anyone reading the commit history

The repository was built in one sitting and its history shows the corrections as
they happened, including provider entries that shipped wrong before being
removed. `docs/WORKLOG.md` carries the reasoning for each.
