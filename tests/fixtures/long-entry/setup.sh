#!/usr/bin/env bash
# A worklog entry carrying its reasoning instead of pointing at it.
#
# This project's own log averaged 94 prose lines an entry while the skill asked
# for two to four sentences (`docs/decisions/0032-worklog-entries-are-short.md`).
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

python3 - <<'PY'
import io
path = "worker/README.md"
text = io.open(path, encoding="utf-8").read()
io.open(path, "w", encoding="utf-8").write(
    text.replace("## Depended on by", "Job ids are opaque to callers.\n\n## Depended on by")
)
PY

prose="$(for i in $(seq 1 16); do echo "Line $i of reasoning that belongs in a decision record rather than here."; done)"
db_prepend_worklog_entry \
  "Say that job ids are opaque" \
  "$prose" \
  "- Nothing."
