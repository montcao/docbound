#!/usr/bin/env bash
# code-style with the repository setting its own limit. Convention beats
# preference, so line-length stops firing without the code changing.
set -euo pipefail
. "$FIXTURE_LIB"
bash "$(dirname "$FIXTURE_LIB")/code-style/setup.sh"
cd "$FIXTURE_DIR"

cat > .editorconfig <<'INI'
root = true

[*]
max_line_length = 120
INI
