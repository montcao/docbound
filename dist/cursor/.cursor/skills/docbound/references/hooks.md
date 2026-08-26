# Hooks

The audit is the definition of done. An instruction that says so competes with
every other instruction in the agent's context and loses whenever the agent's
own sense of completion arrives first. A hook does not compete.

`scripts/hook.mjs` is the entry point. It reads no file contents and emits
findings only — check id, path, message — because it runs after every edit and
an edit is the worst moment in a session to be quoting a buffer back into a
transcript.

## Two events

| Event | Runs | Blocks | Why |
|---|---|---|---|
| `after-edit` | `worklog-entry`, `dead-ref`, `template-residue`, `adr-immutable` | never | Fires constantly, so it stays cheap and advisory. It catches the edit that broke a documented path while the reason is still in view. |
| `stop` | every check for the mode | on error, exit 2 | The agent believes it is finished. This is the moment the definition of done has to be enforced rather than recalled. |

A blocked stop is not a failure state. It hands the agent the findings and lets
it continue: fix the doc, or write a waiver line in the worklog entry giving a
reason a reviewer would accept.

## Configuration

`.docbound/config.json` is tracked and holds the policy the repository shares:

```json
{
  "audit": { "exclude": [] },
  "hook": { "enabled": true, "fast": true, "blockOnStop": true }
}
```

`.docbound/config.local.json` is gitignored, overrides it key by key, and is
where one developer turns the gate off without that appearing in a review.

`audit.exclude` takes exact paths, directory prefixes, and two glob forms —
`some/dir/**` and `*.suffix`. It exists for trees that vendor a skill payload,
a build output, or a directory of templates: files that are Markdown but are not
this repository's documentation. It is empty by default, and an empty list
leaves every check exactly as it behaves with no config file at all.

## Per provider

Each distribution carries its own manifest, pointing at the skill payload where
that provider installs it. `npx docbound install` merges the manifest into any
existing config rather than replacing it.

| Provider | Manifest | Event names |
|---|---|---|
| Claude Code | `.claude/settings.json` | `PostToolUse` on `Edit|Write|MultiEdit`, and `Stop` |
| Codex | `.codex/hooks.json` | `afterFileEdit`, `stop` — approve once via `/hooks` |
| GitHub Copilot | `.github/hooks/docbound.json` | `afterFileEdit`, `stop` |
| Cursor | `.cursor/hooks.json` | `afterFileEdit`, `stop` |

Installing without the gate is `npx docbound install --no-hooks`. The skill
still works; the audit becomes something the agent has to remember to run.
