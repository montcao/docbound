#!/usr/bin/env bash
# A source file whose only change is a comment, with no doc touched.
#
# `doc-coverage` used to fire here, so a typo fix in a comment blocked a task.
# There is no contract change to document
# (`docs/decisions/0031-comment-edits-need-no-doc.md`).
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

python3 - <<'PY'
import io
path = "src/app.py"
text = io.open(path, encoding="utf-8").read()
text = text.replace(
    '"""Return a one-line summary of `app` for the status endpoint."""',
    '"""Return a one-line summary of `app`, for the status endpoint."""',
)
io.open(path, "w", encoding="utf-8").write(text)
PY

db_prepend_worklog_entry \
  "Fix a comma in a docstring" \
  "Reworded one docstring in \`src/app.py\`. No behaviour changed." \
  "- Nothing."
