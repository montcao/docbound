#!/usr/bin/env bash
# The one edit an accepted ADR is allowed: its Status line.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

python3 - <<'PY'
import io
path = "docs/decisions/0001-adopt-docbound.md"
text = io.open(path, encoding="utf-8").read()
text = text.replace("- Status: accepted", "- Status: superseded by 0002")
io.open(path, "w", encoding="utf-8").write(text)
PY

db_prepend_worklog_entry \
  "Mark the adoption record superseded" \
  "Changed the Status line of ADR 0001 and nothing else." \
  "- The superseding record is not written yet."
