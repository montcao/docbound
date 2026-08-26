# skill

The canonical skill. `skill/docbound/` is the only place skill content is
edited; everything under `dist/` and `plugin/` is a copy of it produced by
`scripts/build.mjs`.

## Start here

- `skill/docbound/SKILL.md`: the skill itself, and the check table agents read.
- `skill/docbound/scripts/audit.mjs`: the audit; the definition of done.
- `skill/docbound/scripts/lib/checks/`: one module per check, named for its ID.
- `skill/docbound/scripts/lib/entry.mjs`: what every script does differently
  when it is run rather than imported: resolve its own path through symlinks,
  and treat a closed pipe as an ending rather than a crash. Both are also true
  of `cli/index.mjs`, which is why they live here and not in each script.

## Contract

The payload is provider-agnostic. Nothing inside it may assume where it is
installed, which harness invoked it, or that this repository exists: it is
copied verbatim into seven different paths, and a consumer may also vendor it by
hand with no CLI involved.

Check IDs, levels, and the waiver grammar are a public interface. Agents in the
wild write waiver lines against those IDs, so renaming one breaks repositories
this project cannot see. `docs/checks.md` is the reference for the set.

Scripts are Node 20 or later, ESM, `node:` imports only, and have no runtime
dependencies (`docs/decisions/0002-node-runtime.md`).

## Must not

- Must not import anything outside the payload. `cli/` and `scripts/` may import
  from here; the reverse would make the skill undistributable.
- Must not read or write outside the repository root it is given. The audit is
  handed a root and stays inside it.
- Must not put a file's contents into hook output beyond what a finding's own
  message carries. A finding is a check ID, a path, and that message; two
  checks quote a truncated line from the file they are about, and that is the
  whole of what reaches a transcript. See `skill/docbound/scripts/hook.mjs`.
- Must not gain a runtime dependency. The install paths that matter most are the
  ones with no package manager in them.

## Layout

| Directory | What it is | Who reads it |
|---|---|---|
| `skill/docbound/references/` | Prose an agent reads and reasons from | The agent |
| `skill/docbound/templates/` | Files copied verbatim | `scaffold`, and the CLI's `adr` |
| `skill/docbound/scripts/` | Executables | The agent, the hook, the CLI |
| `skill/docbound/agents/` | Subagent definitions | The harness |

The split between the first two is `docs/decisions/0003-templates-location.md`.

## Depended on by

`scripts/build.mjs` copies this directory into every distribution. `cli/` runs
its scripts directly. `tests/` exercises them against the fixtures.

## Gotchas

- `skill/docbound/scripts/reference/` holds the Python the Node port was diffed
  against. It is a frozen specification, it is excluded from the build, and it
  is deleted one release from now.
- This repository's own audit does not read the payload's prose. See
  `docs/decisions/0007-audit-exclude-config.md` for why, and what that costs.
