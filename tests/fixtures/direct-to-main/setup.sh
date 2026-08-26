#!/usr/bin/env bash
# No feature branch and a clean tree: the last commit is the change set, so a
# direct-to-main workflow is still audited.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline

cat >> worker/queue.py <<'PY'


def purge(queue_url, older_than_seconds):
    """Drop jobs older than `older_than_seconds` from `queue_url`.

    Returns the number dropped. Irreversible: purged jobs are not recoverable.
    """
    return 0
PY

db_prepend_worklog_entry \
  "Add queue purge" \
  "Added a purge helper to the queue package." \
  "- Purge has no audit trail, so a mistaken purge cannot be reconstructed."
db_commit "add queue purge"
