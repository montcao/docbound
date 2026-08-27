#!/usr/bin/env bash
# A slug typed one character wrong, which opens a second item that looks like
# the first and tracks separately. Neither copy is wrong on its face.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

db_prepend_worklog_entry \
  "Note the retry backoff" \
  "Read the retry path and wrote down what it does not do." \
  "- [retry-jitter] the backoff has no jitter, so two callers synchronise"
db_commit "note the retry backoff"

db_prepend_worklog_entry \
  "Carry the backoff note forward" \
  "No code changed. The note below was carried into this entry." \
  "- [retry-jiter] the backoff still has no jitter"
