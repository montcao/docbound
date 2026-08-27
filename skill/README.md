# skill

The skill itself: the instructions an agent reads, the audit that decides when a
task is done, and the templates a new document starts from. Everything a user
installs is a copy of what is in here.

This is the only place skill content is edited. Everything under `dist/` and
`plugin/` is a copy produced by `scripts/build.mjs`, and editing a copy is
reverted by the next build.

## Start here

- `skill/docbound/SKILL.md`: the skill itself, and the check table agents read.
- `skill/docbound/scripts/audit.mjs`: the audit; the definition of done.
- `skill/docbound/scripts/lib/checks/`: one module per check, named for its ID.
- `skill/docbound/scripts/start.mjs`: step 2 of the loop as a command. Writes
  the entry skeleton so the agent writes only the Intent.
- `skill/docbound/scripts/close.mjs`: closes a tracked open item by slug, and
  refuses a slug that is not open.
- `skill/docbound/scripts/summary.mjs`: step 1 of the loop as a command. Reads
  the documentation set and no source at all; see
  `docs/decisions/0018-no-self-serving-metrics.md`. It makes no claim about
  what it saved anyone, since that would rest on a counterfactual nobody
  measured.
- `skill/docbound/scripts/lib/worklog.mjs`: the entry that governs a run, its
  waivers, and the two findings about whether a task was opened and closed.
- `skill/docbound/scripts/lib/scan.mjs` and
  `skill/docbound/scripts/lib/languages.mjs`: what kind of span
  a character sits in, so a comment marker inside a string is not read as a
  comment. A lexer with a delimiter table, not a parser
  (`docs/decisions/0016-span-scanner-not-a-parser.md`). Read by
  `skill/docbound/scripts/lib/checks/logic-touched.mjs`,
  `skill/docbound/scripts/lib/checks/comment-sentence.mjs`, and
  `skill/docbound/scripts/lib/checks/todo-shape.mjs`, each of which falls back
  to the line-based path for a language the table has no entry for.
- `skill/docbound/scripts/lib/digest.mjs`: the documentation set parsed as data.
  Module contracts, decisions and their reversal conditions, worklog entries,
  and the open items tracked across them
  (`docs/decisions/0013-tagged-open-items.md`). Every check reads a repository
  to judge it; this reads one to describe it.
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
