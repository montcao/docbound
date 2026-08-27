#!/usr/bin/env bash
# A module README that opens by naming things the reader has not met.
#
# The sample is real: it is close to what this skill produced on an unfamiliar
# Go repository while passing every accuracy check, which is what made the door
# worth a check of its own
# (`docs/decisions/0027-open-plainly-then-go-deep.md`).
#
# The second directory is the near-miss. Its opening carries backticks too, and
# also a plain sentence, which is all the check asks for.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

mkdir -p identify router
cat > identify/detect.py <<'PY'
"""Project type detection."""


def detect(root):
    """Return the project type for `root`, or None when nothing matches."""
    return None
PY
cat > identify/README.md <<'MD'
# identify

`detect` returns a project type string, the lockfile it matched on, and an error
when nothing matches. The strings `node` and `python` are the vocabulary
`router/` keys off.

## Must not

- Must not build anything. It reads a directory and answers a question.
MD

cat > router/route.py <<'PY'
"""Routing by project type."""


def route(project_type):
    """Return the handler registered for `project_type`."""
    return None
PY
cat > router/README.md <<'MD'
# router

Picks the build steps that suit a project once its type is known. Everything
here runs after detection and before anything is written to disk.

`route` takes the string `identify/detect.py` produced and returns a handler.

## Must not

- Must not detect anything. By the time this runs the type is settled.
MD

db_prepend_worklog_entry \
  "Split detection from routing" \
  "Added \`identify/detect.py\` and \`router/route.py\`, each with a README beside it." \
  "- [handler-registry] nothing registers a handler yet, so \`route\` always returns None."
