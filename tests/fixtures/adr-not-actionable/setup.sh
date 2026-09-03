#!/usr/bin/env bash
# A new ADR that explains itself and never says what a reader does about it.
#
# The reasoning is complete and the record still leaves the commonest reader —
# somebody who found it while trying to get something done — to work out whether
# it changes what they were about to do
# (`docs/decisions/0045-a-record-says-what-to-do-about-it.md`).
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

cat > docs/decisions/0002-retry-budget.md <<MD
# 0002. A retry budget per request, not per call

- Date: ${TODAY}
- Status: accepted
- Supersedes: none

## Context

Each client retries its own calls, so one request fans out into fifteen attempts
against a service that is already failing.

## Options

### Keep per-call retries

Simple, and it multiplies load exactly when the system can least carry it.

### One budget per request

The first call to spend the budget leaves none for the rest, which is the point.

## Decision

A budget of three attempts is attached to the request and decremented by every
call made under it.

## Consequences

A slow dependency now exhausts the budget for the calls behind it, so a request
can fail with attempts left unused elsewhere.

## What would reverse this

If a request routinely fails with its budget spent on one dependency, the budget
belongs per dependency rather than per request.
MD

db_prepend_worklog_entry \
  "Record the retry budget decision" \
  "Added ADR 0002 covering the retry budget." \
  "- Nothing."
