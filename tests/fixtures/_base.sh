#!/usr/bin/env bash
# A small repository whose documentation is complete and true. Most fixtures
# start here and introduce exactly one defect, so a finding in a fixture is
# attributable to the edit that fixture makes rather than to the baseline.
#
# Sourced with FIXTURE_DIR set to an empty directory. Leaves HEAD on main with
# a clean tree and two commits: source, then docs.

set -euo pipefail

TODAY="$(date +%F)"

db_git_init() {
  cd "$FIXTURE_DIR"
  git init -q -b main
  git config user.email "fixture@example.com"
  git config user.name "docbound fixture"
  git config commit.gpgsign false
}

db_commit() {
  git add -A
  git commit -q -m "$1"
}

db_write_source() {
  mkdir -p src worker
  cat > src/app.py <<'PY'
"""HTTP entry point.

Builds the request pipeline and hands accepted work to the worker queue.
"""

from worker.queue import enqueue

MAX_BODY_BYTES = 65536


def build_app(config):
    """Build an app from `config`.

    `config` is a mapping with a `queue_url` key. Raises KeyError when the key
    is absent. Safe to call more than once; each call is independent.
    """
    return {"queue": config["queue_url"], "limit": MAX_BODY_BYTES}


def accept(app, body):
    """Enqueue `body` and return its job id.

    Raises ValueError when `body` exceeds `MAX_BODY_BYTES`.
    """
    if len(body) > app["limit"]:
        raise ValueError("body too large")
    return enqueue(app["queue"], body)


def describe(app):
    """Return a one-line summary of `app` for the status endpoint."""
    return "queue={0} limit={1}".format(app["queue"], app["limit"])
PY

  cat > worker/queue.py <<'PY'
"""Job queue.

Owns the job id format. Callers never construct a job id themselves.
"""

import itertools

_counter = itertools.count(1)


def enqueue(queue_url, body):
    """Append `body` to the queue at `queue_url` and return the new job id.

    Raises ValueError on an empty body. Job ids are monotonic within a process
    and are not stable across restarts.
    """
    if not body:
        raise ValueError("empty body")
    return "{0}-{1}".format(queue_url, next(_counter))


def drain(queue_url, limit):
    """Return up to `limit` pending jobs for `queue_url`, oldest first."""
    return []
PY

  cat > requirements.txt <<'TXT'
certifi==2024.2.2
TXT
}

db_write_docs() {
  mkdir -p docs/decisions

  cat > README.md <<'MD'
# fixture-service

Accepts HTTP request bodies and hands them to a queue for asynchronous work.

Status: active — used by the audit fixtures and by nothing else.
Owner: the docbound maintainers.

## Run

```
python -m src.app
```

## Test

```
pytest
```

## Shape

Two packages. `src/` terminates HTTP and validates request bodies; `worker/`
owns the queue and the job id format. Detail lives in `docs/ARCHITECTURE.md`.

## Invariants

- A job id is produced by `worker/queue.py` and by nothing else.
- A request body larger than the configured limit is rejected before it reaches
  the queue, enforced by `src/app.py`.

## Where to go next

- `docs/ARCHITECTURE.md` — boundaries, data flow, seams
- `docs/decisions/` — why things are shaped this way
- `docs/WORKLOG.md` — what has changed recently and what is still open
- `src/README.md` and `worker/README.md` — per-module contract
MD

  cat > src/README.md <<'MD'
# src

Terminates HTTP and decides what is allowed into the queue.

## Start here

- `src/app.py` — the public surface; `build_app` and `accept` are what callers use.

## Contract

`build_app` returns an application mapping. `accept` either returns a job id or
raises ValueError. Both are safe to call concurrently.

## Must not

- Must not construct a job id. The format belongs to `worker/queue.py`, and two
  producers of one identifier is one producer too many. Enforced by convention.
- Must not read the queue. This package writes; `worker/` reads.

## Depends on

`worker/queue.py`. A change to the job id format is invisible here and must stay
that way.

## Depended on by

The process entry point in `README.md`.
MD

  cat > worker/README.md <<'MD'
# worker

Owns the queue and the job id format.

## Start here

- `worker/queue.py` — the whole public surface.

## Contract

`enqueue` returns a job id or raises ValueError on an empty body. `drain`
returns pending jobs oldest first and never blocks.

## Must not

- Must not validate request bodies. Size limits belong to `src/app.py`, so that
  a rejected request never reaches durable storage.
- Must not expose the counter. Job ids are opaque to every caller.

## Depended on by

`src/app.py`.

## Known gaps

- Job ids restart from one when the process restarts, so they are unique within
  a run and not across runs. Not fixed because nothing persists them yet.
MD

  cat > docs/ARCHITECTURE.md <<'MD'
# Architecture

Two packages in one process. Everything that crosses between them crosses the
queue interface.

## Diagram

```mermaid
flowchart LR
  api["src/"] -->|enqueue| worker["worker/"]
```

## Components

### src — `src/`

- Owns: request admission and the body size limit.
- Must not: mint job ids, or read from the queue.
- Talks to: `worker/queue.py`, by direct call.

### worker — `worker/`

- Owns: the queue and the job id format.
- Must not: inspect request semantics.
- Talks to: nothing; it is a leaf.

## Data flow

A body arrives at `src/app.py`, is checked against the size limit, and is passed
to `enqueue`. The job id returned to the caller is the queue's, unmodified.

## Boundaries

| Interface | Defined in | Consumers | Change requires |
|---|---|---|---|
| enqueue | `worker/queue.py` | `src/app.py` | Architecture Decision Record (ADR) |

## Invariants

- One producer of job ids, enforced by convention and by the must-not list in
  `worker/README.md`.
- Body size is checked before enqueue, enforced by `src/app.py`.

## Known gaps

- The queue has no durability story — `worker/queue.py` keeps nothing. Not fixed
  because no caller needs delivery across a restart.
MD

  cat > docs/decisions/0001-adopt-docbound.md <<MD
# 0001. Adopt docbound as the documentation discipline

- Date: ${TODAY}
- Status: accepted
- Supersedes: none

## What to do

Run the audit before calling a task done, and open a worklog entry first.

## Context

This repository is written and modified by agents across sessions that share no
memory. Reasoning that is not recorded when a decision is made is re-derived
later, often wrongly.

## Options

### Document at the end of each task

Cheap per task, and produces summaries of diffs rather than descriptions of a
system.

### Continuous documentation with a blocking audit

Docs move with the code and the audit defines done. Costs a few minutes a task.

## Decision

Adopt docbound. Every task opens a worklog entry before the first edit and
closes on a green audit.

## Consequences

Tasks take longer. \`docs/WORKLOG.md\` grows and needs pruning each quarter.

## What would reverse this

If more than one entry in five carries a waiver, the check set is mistuned and
needs retuning before the discipline is worth its cost.
MD

  cat > docs/WORKLOG.md <<MD
# Worklog

Newest entry first. One entry per task.

## ${TODAY} — Write the baseline documentation

Agent: fixture · Branch: main

### Intent

Describe the two packages, their contracts, and the one invariant that spans
them, so that the audit has a true baseline to run against.

### Expected to touch

- \`docs/\` — all of it
- \`src/README.md\` and \`worker/README.md\` — new

### Outcome

Wrote \`README.md\`, \`docs/ARCHITECTURE.md\`, \`src/README.md\`,
\`worker/README.md\`, and ADR 0001. No code changed.

### Still open

- Queue durability is unaddressed; see the known gap in \`worker/README.md\`.
MD
}

db_build_baseline() {
  db_git_init
  db_write_source
  db_commit "add the service"
  db_write_docs
  db_commit "document the service"
}

# A worklog entry that is open and closed in one go, for fixtures whose defect
# is somewhere other than the worklog.
db_prepend_worklog_entry() {
  local title="$1"
  local outcome="$2"
  local still_open="$3"
  local extra="${4:-}"
  local body
  body="$(cat docs/WORKLOG.md)"
  {
    printf '# Worklog\n\nNewest entry first. One entry per task.\n\n'
    printf '## %s — %s\n\n' "$TODAY" "$title"
    printf 'Agent: fixture · Branch: %s\n\n' "$(git rev-parse --abbrev-ref HEAD)"
    printf '### Intent\n\n%s\n\n' "$title"
    printf '### Outcome\n\n%s\n\n' "$outcome"
    printf '### Still open\n\n%s\n' "$still_open"
    if [ -n "$extra" ]; then printf '\n%s\n' "$extra"; fi
    printf '\n'
    printf '%s\n' "$body" | tail -n +5
  } > docs/WORKLOG.md.new
  mv docs/WORKLOG.md.new docs/WORKLOG.md
}
