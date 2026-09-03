#!/usr/bin/env bash
# A file whose comments say what the next line says.
#
# The check shipped with no fixture producing it, which a test in
# `tests/build.test.mjs` now catches
# (`docs/decisions/0037-the-readme-counts-itself.md`).
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

cp "$(dirname "$FIXTURE_LIB")/restating-comments/pricing.py.txt" src/pricing.py

python3 - <<'PY'
import io
path = "src/README.md"
text = io.open(path, encoding="utf-8").read()
io.open(path, "w", encoding="utf-8").write(
    text.replace(
        "- `src/app.py` — the public surface; `build_app` and `accept` are what callers use.",
        "- `src/app.py` — the public surface; `build_app` and `accept` are what callers use.\n"
        "- `src/pricing.py` — quote assembly; every amount it returns is integer cents.",
    )
)
PY

db_prepend_worklog_entry \
  "Add quote assembly" \
  "Added \`src/pricing.py\` and named it in \`src/README.md\`." \
  "- [rate-lookup] the rate is passed in and nothing validates it."
