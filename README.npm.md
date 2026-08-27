# docbound

A documentation discipline for coding agents. It checks whether the change your
agent just made was written down, and your agent cannot call the task finished
until it was.

It reads documentation and nothing else. A green audit means the change is
explained, not that the code is correct, and your tests still own that half.

Agent-written code has one failure this exists for. The author does not persist:
every session is a new engineer with no memory of why anything is shaped the way
it is, so reasoning that is not written down when it happens is gone.

## Install

```
npx docbound install
```

It detects the editors your project already uses, copies the skill where each
one looks for it, and merges its hook into whatever config is already there.

```
npx docbound install --providers=claude-code,cursor --no-hooks
npx docbound baseline      # adopting in a repository that already has history
npx docbound scaffold      # bootstrap docs in a repository that has none
npx docbound summary       # what this project is, read from its docs
npx docbound audit         # run the checks without an agent
npx docbound doctor        # what is installed, and is this repo healthy
```

Claude Code and Cursor ship, each verified against the editor's own files. Any
other agent that reads the Agent Skills format can use `dist/payload/` directly.
Node 20 or later, and no dependencies at runtime or for development.

## The audit

Twenty-three checks, four more in subagent mode. Errors block, warnings go on
the record. A changed source file with no covering doc in the same diff, a doc
pointing at a path that is not there, an accepted decision record edited below
its Status line, a dependency change with no reasoning behind it. Each has
an ID, and a finding you disagree with becomes one waiver line in the worklog
entry with a reason a reviewer would accept.

With hooks installed the audit runs inside the agent loop: a cheap subset after
every edit, the full set when the agent tries to stop.

## Documentation

Full documentation, the check reference, and the decision records:
https://github.com/montcao/docbound

Apache-2.0.
