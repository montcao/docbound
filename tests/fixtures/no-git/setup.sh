#!/usr/bin/env bash
# The same complete tree with no repository. Coverage cannot be evaluated
# without a diff, so it is skipped rather than guessed at.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
rm -rf "$FIXTURE_DIR/.git"
