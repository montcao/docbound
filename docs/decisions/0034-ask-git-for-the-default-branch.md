# 0034. Ask git for the default branch, and print what was compared

- Date: 2026-08-31
- Status: accepted
- Supersedes: none

## Context

`skill/docbound/scripts/lib/changes.mjs` resolved the reference commit from a
fixed list: origin/main, main, origin/master, master. The list is a
guess, and it is wrong for any repository whose default branch is named
something else.

One clone whose default branch was neither, and which also carried a stale
origin/main from an earlier life, had every one of its 128 files reported as
undocumented on a change touching four. The audit was correct about the diff it
was given and the diff was against the wrong ref.

Nothing in the output named the ref. A reader had no way to tell a real finding
from the wrong comparison, so the failure looked like the tool being broken
rather than the tool being misconfigured.

## Options

### Document `--base`

The flag already exists. It requires the user to know that the default guess was
wrong, which is exactly what the output did not tell them, and it puts the
correction after the bad first impression.

### Take the merge base against every candidate and use the nearest

Robust to a stale remote ref, and it invents an answer. A repository with an old
main branch lying around gets a comparison against whichever ref happens to be
closest, which is not a claim about anything.

### Ask git

The ref refs/remotes/origin/HEAD records the default branch the clone was made
from. It is one command, it is right whenever the clone has an origin, and when
it is absent the guessed list is still there.

## Decision

`defaultBranch` in `skill/docbound/scripts/lib/changes.mjs` reads
refs/remotes/origin/HEAD and puts the result at the front of the candidate
list. The guessed candidates stay behind it for a repository with no origin.

`skill/docbound/scripts/lib/report.mjs` prints the ref that was used, on the
line under the header, on every run in a git repository. The audit now says what
it compared against whether it guessed well or badly.

## Consequences

The ref origin/HEAD is set at clone time and is not refreshed when the remote's
default branch is renamed, so it can be stale in its own way. It is stale less
often than a hard-coded list is wrong, and the printed ref makes either mistake
visible in one line.

Every audit in a git repository grows a line of output. That is the point: the
one thing a reader needed in the failing case was the ref.

A repository with no remote is unchanged, and still guesses.

## What would reverse this

If reports arrive of origin/HEAD pointing at a renamed branch more often than
the guessed list misses, resolve the default branch from the remote itself
(`git ls-remote --symref`) when a network call is acceptable, and keep the local
ref as the offline answer.
