# cli

`npx docbound`. Installs the skill into a project, keeps it current, and runs
the audit and the scaffold for anyone without an agent in the loop: CI, a
pre-commit hook, or a human at a terminal.

## Start here

- `cli/index.mjs`: argument parsing and one function per command.
- `cli/install.mjs`: everything that touches the filesystem, including
  `setBaseline`, which records the commit a repository adopted docbound at.
- `cli/providers.mjs`: the provider table. It lives here rather than in
  `scripts/` because it ships: everything the published package imports has to
  be inside the npm `files` whitelist, and `tests/package.test.mjs` enforces
  that by installing from the real tarball.

## Contract

Exit codes are the interface CI depends on: 0 success, 1 findings or a failed
operation, 2 usage. Every interactive prompt has a flag equivalent, so no
command needs a terminal.

Output is safe to pipe. Every command is one someone will send through `head` or
`grep`, and a closed pipe is a normal end to that rather than a crash.
`cli/index.mjs` calls `ignoreEpipe` from the skill's entry module when it is run
directly.

`baseline` is the one command that is neither an install nor a pass-through. It
resolves a ref with git, writes `audit.baseline` into `.docbound/config.json`,
and leaves every other key in that file alone. It belongs here rather than in
the skill because adopting docbound is an install-time act, not a step in the
loop (`docs/decisions/0019-adoption-baseline.md`).

`audit`, `scaffold`, `summary`, `start`, and `close` are pass-throughs: they hand their arguments
to the skill's own scripts unchanged and return the exit code unchanged. The CLI adds
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
npx docbound install --providers=claude-code,cursor --scope=project
npx docbound baseline
npx docbound doctor
npx docbound audit
```

`--providers` accepts a few aliases for the names people reach for first, such
as `claude` for `claude-code`. They are listed in `cli/providers.mjs`, and the
canonical name is what is printed back.

## Depends on

`dist/` for the payload to copy, `skills-lock.json` to tell a current install
from a stale one, and `skill/docbound/scripts/` for the audit and the scaffold.
Nothing here imports from `scripts/`, which is not published.

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
