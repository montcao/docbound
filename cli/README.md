# cli

`npx docbound`. Installs the skill into a project, keeps it current, and runs
the audit and the scaffold for anyone without an agent in the loop — CI, a
pre-commit hook, a human.

## Start here

- `cli/index.mjs` — argument parsing and one function per command.
- `cli/install.mjs` — everything that touches the filesystem.

## Contract

Exit codes are the interface CI depends on: 0 success, 1 findings or a failed
operation, 2 usage. Every interactive prompt has a flag equivalent, so no
command needs a terminal.

`audit` and `scaffold` are pass-throughs: they hand their arguments to the
skill's own scripts unchanged and return the exit code unchanged. The CLI adds
nothing to them, so a finding reported through `npx docbound audit` is the same
finding an agent sees.

## Must not

- Must not overwrite what the project already owns. `.docbound/config.json` is
  written once and merged thereafter; a hook manifest is merged key by key and
  event by event, so both an unrelated hook and a key the format requires
  survive. Both rules are exercised in `tests/cli.test.mjs`.
- Must not implement a check. Checks live in the skill payload; the CLI runs it.
- Must not gain a runtime dependency (`docs/decisions/0002-node-runtime.md`).
- Must not require the repository this file is in. Installed through npm, the
  CLI has `dist/` and `skill/` beside it and nothing else.

## Use

```
npx docbound install --providers=claude-code,codex --scope=project
npx docbound doctor
npx docbound audit
```

`--providers` accepts a few aliases for the names people reach for first —
`claude` for `claude-code`, `copilot` for `github` — listed in
`scripts/providers.mjs`. The canonical name is what is printed back.

## Depends on

`scripts/providers.mjs` for the provider table, `dist/` for the payload to copy,
`skills-lock.json` to tell a current install from a stale one, and
`skill/docbound/scripts/` for the audit and the scaffold.

## Decisions

| Decision | Rejected | Why | Reverse if |
|---|---|---|---|
| Install seeds `audit.exclude` with docbound's own paths | Leave the list empty | Installing a tool should not open a documentation task; see `docs/decisions/0007-audit-exclude-config.md` | An install stops being the only writer of those paths |
| `update` compares the payload hash only | Compare the whole distribution | A merged hook manifest carries the project's other hooks, so a whole-distribution hash never matches | The manifest becomes a file docbound fully owns |
| `link` points at a checkout's `skill/docbound/` | Link a built distribution | A linked checkout is for developing the skill, where the canonical source is what you want live | Providers start needing transformed payloads rather than copies |
| Detection reads the project and the home directory | Project only | A harness writes its project directory only once it has something to keep there, so a Cursor user on a fresh repository was detected as nothing at all | A harness starts using a home directory that does not imply the user works with it |

## Gotchas

- `install` replaces the payload directory wholesale rather than copying over
  it, so a file dropped from the build does not survive an update.
- `doctor` exits 1 when the repository's audit fails. That is deliberate: it is
  the command CI and a developer both reach for to ask "is this healthy".
