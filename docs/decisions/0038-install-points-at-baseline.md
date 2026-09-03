# 0038. Install points at `baseline`, and does not run it

- Date: 2026-08-31
- Status: accepted
- Supersedes: none

## Context

`npx docbound install` wires a blocking gate into a session. In a repository
with history, the audit's change set is the whole branch, so the first stop
attempt after an install can fail on hundreds of files nobody in that session
touched.

`baseline` is the answer. It records the commit the repository adopted docbound
at, and work older than that is out of scope until it is touched
(`docs/decisions/0019-adoption-baseline.md`). It was findable only by reading
the README, and the person who most needs it is the person who has just
installed the tool and not yet read anything.

The failure mode is the worst kind: the tool appears to work, and then blocks a
session over unrelated history.

## Options

### Run `baseline` during install

One less step, and it decides something on the user's behalf. A baseline is a
claim about which commit a repository adopted at, and writing it silently into
configuration means a repository that wanted the whole history in scope now
quietly does not.

### Report it at audit time

Detect a large change set and suggest `baseline` in the audit output. It arrives
at the moment of the failure, which is later than it needs to be, and it is a
heuristic on top of a number that is sometimes legitimately large.

### Say it at install

Install already knows whether the repository has history. Print the pointer
there, once, in the output the user is reading.

## Decision

`commandInstall` in `cli/index.mjs` checks whether the repository has more than
one commit and, when it does, prints two sentences naming `baseline` and saying
what happens without it.

It stays a pointer rather than an action, because adopting at a commit is the
user's claim to make and reversing a silently written baseline requires knowing
it was written.

## Consequences

Every install into a real repository grows a paragraph, including for users who
already know. That is cheap next to the session it saves.

Someone who ignores the paragraph still hits the wall. Nothing here changes what
the audit does; it changes what the user was told beforehand.

`hasHistory` shells out to git during install, which was already true of the
rest of the command, and returns false outside a repository, where the whole
question does not apply.

## What would reverse this

If installs keep being followed by a first-audit failure over unrelated history,
the pointer is not enough: run `baseline` as part of install, print the commit
it recorded, and say in the same breath how to remove it.
