#!/usr/bin/env bash
# A file whose comments are wrapped paragraphs. Judged line by line, every
# continuation line is a fragment and the check fires; judged as runs, each
# paragraph is one sentence and it does not.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

cat > src/rates.py <<'PY'
"""Rate lookup."""

BASE_CENTS = 1200


def surcharge(region, weight_grams):
    # The surcharge is charged per started kilogram rather than per gram,
    # because the carrier bills that way and a partial kilogram would leave
    # us paying the difference.
    started = -(-weight_grams // 1000)

    # Domestic traffic is exempt, which is a contractual term rather than a
    # property of the route.
    if region == "us":
        return 0

    return started * 40
PY

python3 - <<'PY'
import io
path = "src/README.md"
text = io.open(path, encoding="utf-8").read()
text = text.replace(
    "- `src/app.py` - the public surface; `build_app` and `accept` are what callers use.",
    "- `src/app.py` - the public surface; `build_app` and `accept` are what callers use.\n"
    "- `src/rates.py` - surcharge lookup; amounts are integer cents.",
)
io.open(path, "w", encoding="utf-8").write(text)
PY

db_prepend_worklog_entry \
  "Add surcharge lookup" \
  "Added \`src/rates.py\` and named it in \`src/README.md\`." \
  "- [surcharge-table] The per-region rates are hard coded pending the table."
