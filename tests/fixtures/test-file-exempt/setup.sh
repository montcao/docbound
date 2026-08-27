#!/usr/bin/env bash
# The same file under a test name. The prose checks skip a test file, since a
# comment in a test is scaffolding for the case rather than documentation
# somebody navigates by. A TODO is not scaffolding, so `todo-shape` still reads
# it.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

cp "$(dirname "$FIXTURE_LIB")/code-style/pricing.py.txt" src/pricing_test.py

db_prepend_worklog_entry \
  "Add the quote assembly test" \
  "Added \`src/pricing_test.py\`." \
  "- The test asserts nothing yet; it exists to pin the fixture's file shape."
