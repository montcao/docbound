#!/usr/bin/env bash
# Every warning derived from references/code-style.md, in one file: a shrug of
# a TODO, a fossil, lines past the limit, mixed indentation, and comments that
# are notes rather than sentences.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

cp "$(dirname "$FIXTURE_LIB")/code-style/pricing.py.txt" src/pricing.py

python3 - <<'PY'
import io
path = "src/README.md"
text = io.open(path, encoding="utf-8").read()
text = text.replace(
    "- `src/app.py` — the public surface; `build_app` and `accept` are what callers use.",
    "- `src/app.py` — the public surface; `build_app` and `accept` are what callers use.\n"
    "- `src/pricing.py` — quote assembly; every amount it returns is integer cents.",
)
io.open(path, "w", encoding="utf-8").write(text)
PY

db_prepend_worklog_entry \
  "Add quote assembly" \
  "Added \`src/pricing.py\` and named it in \`src/README.md\`." \
  "- The rate lookup in \`src/pricing.py\` is not written and the quote is a placeholder calculation."
