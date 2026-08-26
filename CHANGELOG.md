# Changelog

Releases only. Task history is `docs/WORKLOG.md`, and the two do not overlap.

This project follows semantic versioning. Check IDs, check levels, the waiver
grammar, the audit's JSON shape, and its exit codes are the public interface; a
breaking change to any of them is a major version and carries a decision record.

## Unreleased

### Fixed

- Cursor installs went to the generic agent-skills directory, which Cursor does
  not read. The payload lands in Cursor's own project skills directory, and the
  hook manifest carries the schema version that format requires. Verified
  against the harness rather than against a summary of it.
- Merging a hook manifest discarded every top-level key the incoming manifest
  declared, so a format with a required version field lost it.
- Provider detection read only the project directory, so a user working in a
  harness whose project directory did not exist yet was detected as nothing.
  It now reads the home directory as well.

### Removed

- The default configuration was written out in three places; `DEFAULT_CONFIG` in
  the skill's config module is now the only copy.
- `skills-lock.json` recorded the same payload hash eight times.
- A dead re-export in `cli/install.mjs`, an unread option on `copyDist`, and
  five exports whose only caller was the module that defined them.

## 0.1.0 — 2026-08-26

First release.

### Added

- The skill: `skill/docbound/SKILL.md`, four reference files, five templates,
  and a documentation subagent definition.
- `skill/docbound/scripts/audit.mjs` — twenty-one checks, seventeen in author mode and four more in
  subagent mode, with a waiver grammar honoured for the current worklog entry.
- `skill/docbound/scripts/scaffold.mjs` — bootstraps the doc structure from
  templates, never overwriting.
- `skill/docbound/scripts/hook.mjs` — a fast subset after every edit, the full audit on stop, exiting 2
  with the findings so the agent is told why it is not done.
- `npx docbound` — install, update, link, audit, scaffold, adr, doctor,
  detect-providers.
- Seven provider distributions under `dist/`, built from one canonical source
  and committed so the submodule, copy, and plugin installs need no toolchain.
- A Claude Code plugin payload and marketplace manifest.
- Seventeen fixtures asserting exact check-ID sets.

### Changed

- The audit and scaffold moved from Python to Node
  (`docs/decisions/0002-node-runtime.md`). The Python implementation stays under
  `skill/docbound/scripts/reference/` for one release as the specification the
  port was diffed against, and is removed in the next.
- Templates moved up out of the reference directory
  (`docs/decisions/0003-templates-location.md`). The `new-dir-readme` message
  names the new path.
- Added `audit.exclude` in `.docbound/config.json`, empty by default
  (`docs/decisions/0007-audit-exclude-config.md`).
- The base-branch clean-tree test asks whether anything the audit would look at
  is dirty, rather than whether git reports anything at all.
