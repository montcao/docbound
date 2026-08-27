#!/usr/bin/env bash
# A duration nobody measured, and the correction an archive is allowed to make.
#
# Both came from this project stating elapsed time it had not computed: a
# removal described as happening months before, in a repository twenty-six hours
# old (`docs/decisions/0029-unix-timestamps-for-elapsed-time.md`).
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

python3 - <<'PY'
import io
path = "docs/ARCHITECTURE.md"
text = io.open(path, encoding="utf-8").read()
text = text.replace(
    "## Data flow",
    "## History\n\nThe queue was rewritten a while back and nobody has touched it recently.\n\n## Data flow",
)
io.open(path, "w", encoding="utf-8").write(text)

# An accepted record correcting a false statement of fact, which is the one
# edit to a record's body the audit allows.
path = "docs/decisions/0001-adopt-docbound.md"
text = io.open(path, encoding="utf-8").read()
io.open(path, "w", encoding="utf-8").write(
    text + "\n## Corrections\n\n- t=1787855693: the Context section overstates how long the repository had existed.\n"
)
PY

db_prepend_worklog_entry \
  "Note the queue rewrite and correct the adoption record" \
  "Added a History section to \`docs/ARCHITECTURE.md\` and appended a correction to \`docs/decisions/0001-adopt-docbound.md\`." \
  "- [queue-rewrite-date] the rewrite has no date recorded anywhere."
