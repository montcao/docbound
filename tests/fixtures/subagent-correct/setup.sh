#!/usr/bin/env bash
# The same task done as subagent mode intends: a handoff to work from, an ADR
# whose sources are named, inferences queued for confirmation by doc, no rename,
# and nothing added to the code but a docstring.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

# --- the coding agent's half: code, and a Handoff written as it worked -------

cat >> src/app.py <<'PY'


def retry_after(attempt):
    return min(2 ** attempt, 30)
PY

cat > docs/WORKLOG.md <<MD
# Worklog

Newest entry first. One entry per task.

## ${TODAY} — Add the retry backoff

Agent: fixture · Branch: feature

### Intent

Stop retrying immediately after a failure. The upstream rejects bursts and the
current behaviour produces them.

### Expected to touch

- \`src/app.py\` — the retry helper

### Handoff

- Chose: exponential backoff over a fixed delay — a fixed delay is either too
  slow for a single blip or too fast for a real outage.
- Chose: a thirty second cap over an unbounded delay — callers time out at
  sixty seconds and a delay past thirty guarantees the caller gives up first.
- Unsure about: whether the upstream sends a retry-after header. Nothing in the
  client reads one.
- Did not: add jitter. One caller retries, so a thundering herd is not reachable
  yet.

### Outcome

### Still open
MD
db_commit "add the retry backoff"
printf -- '--mode subagent --since %s' "$(git rev-parse HEAD)" > "$FIXTURE_META/args"

# --- the documentation subagent's half, left in the working tree -------------

python3 - <<'PY'
import io

path = "src/app.py"
text = io.open(path, encoding="utf-8").read()
# A docstring and nothing else: logic, names, and tests belong to the coder.
text = text.replace(
    "def retry_after(attempt):\n",
    'def retry_after(attempt):\n'
    '    """Return the seconds to wait before retry number `attempt`.\n\n'
    "    `attempt` counts from zero. The result is capped at thirty seconds.\n"
    '    """\n',
)
io.open(path, "w", encoding="utf-8").write(text)

path = "src/README.md"
text = io.open(path, encoding="utf-8").read()
text = text.replace(
    "## Must not",
    "Inferred: the thirty second cap is chosen against the caller's sixty\n"
    "second timeout rather than against any upstream limit.\n\n## Must not",
)
io.open(path, "w", encoding="utf-8").write(text)
PY

cat > docs/decisions/0002-exponential-backoff.md <<MD
# 0002. Retry with exponential backoff capped at thirty seconds

- Date: ${TODAY}
- Status: accepted
- Supersedes: none

## Context

Retries were immediate, and the upstream rejects bursts of them.

## Options

### Fixed delay

Either too slow for a single blip or too fast for a real outage.

### Exponential backoff with a cap

Absorbs both, at the cost of a worst-case wait that has to be chosen against
the caller's timeout.

## Decision

Exponential backoff capped at thirty seconds, in \`src/app.py\`. The cap is set
below the caller's sixty second timeout so the caller does not give up first.

## Consequences

The worst-case delay before a retry is thirty seconds. No jitter, so a second
retrying caller would synchronise with the first.

## Sources

- handoff
- inferred

## What would reverse this

If the upstream publishes a retry-after header, the delay comes from the
response and this record is superseded.
MD

cat > docs/WORKLOG.md <<MD
# Worklog

Newest entry first. One entry per task.

## ${TODAY} — Add the retry backoff

Agent: fixture (code) · fixture-docs (docs)

### Intent

Stop retrying immediately after a failure. The upstream rejects bursts and the
current behaviour produces them.

### Expected to touch

- \`src/app.py\` — the retry helper

### Handoff

- Chose: exponential backoff over a fixed delay — a fixed delay is either too
  slow for a single blip or too fast for a real outage.
- Chose: a thirty second cap over an unbounded delay — callers time out at
  sixty seconds and a delay past thirty guarantees the caller gives up first.
- Unsure about: whether the upstream sends a retry-after header. Nothing in the
  client reads one.
- Did not: add jitter. One caller retries, so a thundering herd is not reachable
  yet.

### Outcome

Added a contract docstring to the retry helper in \`src/app.py\`, recorded the
choice as ADR 0002 sourced from the handoff, and stated the cap's reasoning in
\`src/README.md\`.

### Still open

- Confirm the inferred claim in \`src/README.md\`: the cap is read here as
  chosen against the caller's timeout, which the handoff implies and does not
  state.
- Proposed rename, not made: \`retry_after\` reads as a timestamp;
  \`backoff_delay\` would say it returns a duration.
- No test covers the cap.
MD
