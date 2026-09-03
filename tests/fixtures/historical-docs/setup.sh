#!/usr/bin/env bash
# A changelog, an archived worklog, and a live doc naming a file that is gone.
#
# The changelog and the archive record the past, so changelog phrasing and a
# path that has since been deleted belong in both
# (`docs/decisions/0041-the-historical-set-is-every-record-of-the-past.md`).
# The live doc's reference carries an extension, which says it is a path whether
# or not it also carries a slash
# (`docs/decisions/0042-a-known-extension-is-a-path-claim.md`).
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

cat > CHANGELOG.md <<'MD'
# Changelog

## 0.2.0

### Changed

- The queue no longer uses `worker/legacy.py`, which was deleted. It previously
  retried in place; it now uses the durable queue in `worker/queue.py`.
MD

mkdir -p docs/worklog
cat > docs/worklog/2026-Q1.md <<'MD'
# Worklog archive 2026-Q1

Entries moved out of `docs/WORKLOG.md`. Newest first.

## 2026-01-04 — Retire the legacy worker

### Outcome

Deleted `worker/legacy.py`. The retry policy previously lived there.
MD

python3 - <<'PY'
import io
path = "docs/ARCHITECTURE.md"
text = io.open(path, encoding="utf-8").read()
io.open(path, "w", encoding="utf-8").write(
    text.replace(
        "## Components",
        "The retry policy is documented in `legacy.py`.\n\n## Components",
    )
)
PY

db_prepend_worklog_entry \
  "Write the changelog and archive the first quarter" \
  "Wrote \`CHANGELOG.md\`, moved one entry into \`docs/worklog/2026-Q1.md\`, and named the retired file in \`docs/ARCHITECTURE.md\` without its directory." \
  "- Nothing."
