#!/usr/bin/env bash
# The subagent-correct tree audited in author mode. The subagent checks are
# additions, not replacements, and must not leak into an author-mode run.
set -euo pipefail
. "$FIXTURE_LIB"
bash "$(dirname "$FIXTURE_LIB")/subagent-correct/setup.sh"
rm -f "$FIXTURE_META/args"
