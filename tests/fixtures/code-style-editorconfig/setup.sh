#!/usr/bin/env bash
# code-style with the repository setting its own limit. line-length enforces a
# width the repository chose and says nothing when it chose none, so this is the
# fixture where it has something to enforce and `code-style` is the one where it
# does not.
set -euo pipefail
. "$FIXTURE_LIB"
bash "$(dirname "$FIXTURE_LIB")/code-style/setup.sh"
cd "$FIXTURE_DIR"

cat > .editorconfig <<'INI'
root = true

[*]
max_line_length = 60
INI
