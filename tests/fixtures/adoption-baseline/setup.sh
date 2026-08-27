#!/usr/bin/env bash
# A repository with history, adopting docbound today.
#
# Two commits of undocumented source and a doc that already carries a dead
# reference, none of it written under this discipline. `docbound baseline`
# records the current commit, and the audit stops asking about anything older.
# Without it the first run reports every existing file, which is a wall rather
# than a finding (`docs/decisions/0019-adoption-baseline.md`).
set -euo pipefail
. "$FIXTURE_LIB"
db_git_init

mkdir -p legacy
cat > legacy/billing.py <<'PY'
def total(items):
    return sum(i["cents"] for i in items)
PY
cat > README.md <<'MD'
# legacy-service

Adds up invoice lines. See `legacy/removed.py` for the old implementation.
MD
db_commit "the service as it stood before docbound"

cat > legacy/tax.py <<'PY'
def apply(total, rate):
    return round(total * rate)
PY
db_commit "more of the same"

# What `docbound baseline` writes. Written directly here so the fixture asserts
# the audit's behaviour rather than the CLI's; `tests/cli.test.mjs` covers the
# command that produces this file.
mkdir -p .docbound
cat > .docbound/config.json <<JSON
{
  "audit": {
    "exclude": [".docbound/**"],
    "baseline": "$(git rev-parse HEAD)"
  }
}
JSON
