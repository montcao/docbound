#!/usr/bin/env bash
# A feature branch with no commits: source changed, a dependency manifest
# changed, a new package added, and the worklog untouched.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

cat >> src/app.py <<'PY'


def reject_reason(app, body):
    """Return why `body` would be rejected, or None when it is acceptable."""
    if not body:
        return "empty body"
    if len(body) > app["limit"]:
        return "body too large"
    return None
PY

cat >> requirements.txt <<'TXT'
urllib3==2.2.1
TXT

mkdir -p billing
cat > billing/charge.py <<'PY'
"""Charge capture.

Turns an accepted job into a charge record. The amount is in cents throughout.
"""

CURRENCY = "USD"


def capture(job_id, amount_cents):
    """Return a charge record for `job_id`.

    Raises ValueError when `amount_cents` is not a positive integer.
    """
    if not isinstance(amount_cents, int) or amount_cents <= 0:
        raise ValueError("amount must be a positive integer number of cents")
    return {"job": job_id, "amount": amount_cents, "currency": CURRENCY}


def refund(charge, amount_cents):
    """Return a refund record against `charge`.

    Raises ValueError when the refund exceeds the captured amount.
    """
    if amount_cents > charge["amount"]:
        raise ValueError("refund exceeds capture")
    return {"job": charge["job"], "amount": -amount_cents}
PY
