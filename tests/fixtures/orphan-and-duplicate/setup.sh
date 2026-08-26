#!/usr/bin/env bash
# A doc nobody links to, whose one substantial paragraph was copied into
# ARCHITECTURE instead of linked.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

PARAGRAPH="Draining the queue is a manual step. An operator runs the drain command against a single queue url, waits for the pending count to reach zero, and only then restarts the process, because a restart discards every job that has not been drained and there is no durable record of what was lost."

cat > docs/OPS.md <<MD
# Operations

${PARAGRAPH}

## Restart

Drain first. There is no other order that preserves pending work.
MD

python3 - "$PARAGRAPH" <<'PY'
import io, sys
path = "docs/ARCHITECTURE.md"
text = io.open(path, encoding="utf-8").read()
text = text.replace("## Known gaps", sys.argv[1] + "\n\n## Known gaps")
io.open(path, "w", encoding="utf-8").write(text)
PY

db_prepend_worklog_entry \
  "Write down the restart procedure" \
  "Added an operations note under docs/ and described the drain step in \`docs/ARCHITECTURE.md\`." \
  "- Nothing."
