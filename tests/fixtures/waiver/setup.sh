#!/usr/bin/env bash
# documented-change with one file left uncovered on purpose and a waiver line
# in the worklog entry giving the reason.
set -euo pipefail
. "$FIXTURE_LIB"
bash "$(dirname "$FIXTURE_LIB")/documented-change/setup.sh"
cd "$FIXTURE_DIR"

# Drop the sentence that named the changed file, so doc-coverage has nothing to
# find and the waiver is what carries the exception.
python3 - <<'PY'
import io
path = "docs/decisions/0002-reject-reason.md"
text = io.open(path, encoding="utf-8").read()
text = text.replace("`src/app.py`", "the request package")
io.open(path, "w", encoding="utf-8").write(text)
PY

db_prepend_worklog_entry \
  "Add charge capture and report rejection reasons" \
  "Added \`billing/charge.py\` with \`billing/README.md\`. Added a rejection-reason helper, recorded in ADR 0002. Pinned urllib3 in \`requirements.txt\`." \
  "- A second currency in \`billing/charge.py\` is unhandled and needs a decision record first." \
  "### Waivers

waiver: doc-coverage src/app.py — the helper is described by ADR 0002, which deliberately names the package rather than the file so the record survives a rename."
