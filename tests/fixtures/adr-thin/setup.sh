#!/usr/bin/env bash
# A new ADR with no reversal condition. A decision that cannot be revisited is
# a decision that will be re-litigated from scratch.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

cat > docs/decisions/0002-json-logs.md <<MD
# 0002. Emit logs as JSON

- Date: ${TODAY}
- Status: accepted
- Supersedes: none

## What to do

Nothing yet; the terminal formatter is still to be written.

## Context

Log lines are parsed by two consumers that each guess at the field boundaries.

## Options

### Keep the line format

No work, and the guessing continues.

### Emit JSON

One parse for every consumer, at the cost of unreadable logs in a terminal.

## Decision

Emit JSON.

## Consequences

Terminal reading needs a formatter.
MD

db_prepend_worklog_entry \
  "Record the log format decision" \
  "Added ADR 0002 covering the log format." \
  "- The formatter for terminal reading is not written."
