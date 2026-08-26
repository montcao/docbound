#!/usr/bin/env bash
# Scaffold run on a repository with source and no docs, left unfilled. The
# placeholders are the point: a scaffolded doc is not yet a doc.
set -euo pipefail
. "$FIXTURE_LIB"
db_git_init
db_write_source
db_commit "add the service"
node "$SKILL_DIR/scripts/scaffold.mjs" --root "$FIXTURE_DIR" > /dev/null
