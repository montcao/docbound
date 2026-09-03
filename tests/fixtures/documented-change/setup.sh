#!/usr/bin/env bash
# The same diff as undocumented-change, documented in the same change: a module
# README for the new package, an ADR that names the changed file, and a worklog
# entry opened and closed.
set -euo pipefail
. "$FIXTURE_LIB"
bash "$(dirname "$FIXTURE_LIB")/undocumented-change/setup.sh"
cd "$FIXTURE_DIR"

cat > billing/README.md <<'MD'
# billing

Turns an accepted job into a charge record. Amounts are integer cents.

## Start here

- `billing/charge.py` — the whole public surface: `capture` and `refund`.

## Contract

`capture` returns a charge record or raises ValueError. `refund` returns a
negative-amount record against a charge and raises ValueError when the refund
exceeds the capture.

## Must not

- Must not hold currency other than USD. A second currency is a schema change
  and needs a decision record first.
- Must not talk to the queue. It receives a job id and never resolves it.

## Depends on

Nothing. It is a leaf and stays one.
MD

cat > docs/decisions/0002-reject-reason.md <<MD
# 0002. Report the rejection reason instead of a boolean

- Date: ${TODAY}
- Status: accepted
- Supersedes: none

## What to do

Nothing. The reason codes are in the response already.

## Context

Callers of \`src/app.py\` could tell that a body was rejected and not why, so
every caller reimplemented the size check to produce a message.

## Options

### Keep the boolean and let callers explain

No change here and the same duplicated check in every caller.

### Return the reason

One authority for the rejection vocabulary, at the cost of a string contract
that is now load-bearing.

## Decision

\`reject_reason\` in \`src/app.py\` returns a reason string or None. The strings
are part of the contract.

## Consequences

Changing a reason string is a caller-visible change.

## What would reverse this

If a caller needs to branch on the reason, the strings become an enumeration and
this record is superseded.
MD

cat >> requirements.txt <<'TXT'
TXT

db_prepend_worklog_entry \
  "Add charge capture and report rejection reasons" \
  "Added \`billing/charge.py\` with \`billing/README.md\`. Added \`reject_reason\` to \`src/app.py\`, recorded in ADR 0002. Pinned urllib3 in \`requirements.txt\`." \
  "- A second currency in \`billing/charge.py\` is unhandled and needs a decision record first."
