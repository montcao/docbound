#!/usr/bin/env bash
# The same file under a test name. Prose standards apply to code a reader has
# to maintain; a test's line width is not that.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

cp "$(dirname "$FIXTURE_LIB")/code-style/pricing.py.txt" src/pricing_test.py

db_prepend_worklog_entry \
  "Add the quote assembly test" \
  "Added \`src/pricing_test.py\`." \
  "- The test asserts nothing yet; it exists to pin the fixture's file shape."
