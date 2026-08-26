#!/usr/bin/env bash
# A documentation subagent doing every part of its job wrong: no handoff to work
# from, an ADR built purely from inference and marked accepted, inferences with
# nowhere to be confirmed, and a rename it had no standing to make.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

# --- the coding agent's half: code, and an Intent with no Handoff ------------

cat >> src/app.py <<'PY'


def retry_after(attempt):
    """Return the seconds to wait before retry number `attempt`."""
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
# A rename: the subagent's first mechanism is not naming, and this is why.
text = text.replace("def retry_after(attempt):", "def backoff_delay(attempt):")
io.open(path, "w", encoding="utf-8").write(text)

path = "src/README.md"
text = io.open(path, encoding="utf-8").read()
text = text.replace(
    "## Must not",
    "Inferred: the backoff is capped at thirty seconds because the upstream\n"
    "rate limiter resets on that interval.\n\n## Must not",
)
io.open(path, "w", encoding="utf-8").write(text)
PY

cat > docs/decisions/0002-exponential-backoff.md <<MD
# 0002. Retry with exponential backoff capped at thirty seconds

- Date: ${TODAY}
- Status: accepted
- Supersedes: none

## Context

Inferred: retries were immediate and the upstream rejected them in bursts.

## Options

### Fixed delay

Simple, and either too slow for the common case or too fast for the bad one.

### Exponential backoff with a cap

Chosen so a long outage does not push the delay past the point where a caller
gives up.

## Decision

Exponential backoff capped at thirty seconds, in \`src/app.py\`.

## Consequences

The worst-case delay before a retry is thirty seconds.

## Sources

- inferred

## What would reverse this

If the upstream publishes a retry-after header, this record is superseded.
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

### Outcome

Documented the backoff helper in \`src/README.md\` and added ADR 0002.

### Still open

- The cap is not covered by a test.
MD
