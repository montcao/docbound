#!/usr/bin/env bash
# An accepted ADR whose body is rewritten. Editing the archive is what the
# check exists to stop.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

python3 - <<'PY'
import io
path = "docs/decisions/0001-adopt-docbound.md"
text = io.open(path, encoding="utf-8").read()
text = text.replace("Tasks take longer.", "Tasks take about the same time.")
io.open(path, "w", encoding="utf-8").write(text)
PY

db_prepend_worklog_entry \
  "Revise the adoption record" \
  "Edited the Consequences section of ADR 0001." \
  "- Nothing."
