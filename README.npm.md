# docbound

Documentation is a work product of every task, not a byproduct of finishing one.

docbound is a skill for coding agents. It puts a worklog entry before the first
edit, records decisions at the moment they are made, moves docs in the same
change as the code, and ends every task with a deterministic audit that either
exits 0 or says what is missing.

Agent-written code has a specific failure: the author does not persist. Every
session is a new engineer with no memory of why anything is shaped the way it
is.

## Install

```
npx docbound install
```

It detects the harnesses your project already uses, copies the skill where each
one looks for it, and merges its hook into whatever config is already there.

```
npx docbound install --providers=claude-code,codex --no-hooks
npx docbound scaffold      # bootstrap docs in a repository that has none
npx docbound audit         # run the checks without an agent
npx docbound doctor        # what is installed, and is this repo healthy
```

Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, opencode, and any agent
that reads the Agent Skills format. Node 20 or later, zero runtime dependencies.

## The audit

Twenty-one checks. Errors block; warnings go on the record. A changed source
file with no covering doc in the same diff, a doc pointing at a path that no
longer exists, an accepted decision record edited below its Status line, a
dependency change with no reasoning behind it — each has an ID, and a finding
you disagree with becomes one waiver line in the worklog entry with a reason.

With hooks installed, the audit runs inside the agent loop: a cheap subset after
every edit, the full set when the agent tries to stop.

## Documentation

Full documentation, the check reference, and the decision records:
https://github.com/montcao/docbound

Apache-2.0.
