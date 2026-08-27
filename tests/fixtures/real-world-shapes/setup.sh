#!/usr/bin/env bash
# Constructs that exist in real repositories and used to be reported as defects.
#
# Every one of these was found by installing docbound into a TypeScript and Go
# monorepo it had never seen and reading the first run's 97 errors. They are
# collected here rather than vendored from that repository, because a fixture
# has to be licence-clean and deterministic. What is distilled is the shape:
#
#   * a gofmt-clean Go file whose raw string contains space-indented JSON
#   * a URL route written `/scan`, and `owner/repo` standing in for an argument
#   * a documented commit format whose `<type>` is not an unfilled placeholder
#   * a doc inside a package writing paths the way that package's tooling does
#
# The audit reports no error on any of them.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

mkdir -p engine

cp "$(dirname "$FIXTURE_LIB")/real-world-shapes/prompt.go.txt" engine/prompt.go

cat > engine/README.md <<'MD'
<!-- docbound-root: engine -->

# engine

Terminates HTTP for the audit service. Paths below are written against this
package, the way its own tooling writes them.

## Start here

- `prompt.go` — the request schema and the route.

## Contract

`Route` returns the mount point and never varies at runtime.

## Must not

- Must not own the job id format. That belongs to `worker/queue.py`.

## Depended on by

The process entry point in `README.md`.
MD

cat > docs/conventions.md <<'MD'
# Conventions

Linked from `docs/ARCHITECTURE.md`.

## Commits

<!-- docbound-ignore -->
Use the Conventional Commits format: `<type>(optional-scope): <summary>`.

The type is one of the seven this repository uses. A scope is optional and
names the package the change lands in.

## Endpoints

The audit endpoint is mounted at `/scan`. Passing a repository to it means
passing `owner/repo`, which the service resolves against the host it is
configured for.
MD

python3 - <<'PY'
import io
path = "docs/ARCHITECTURE.md"
text = io.open(path, encoding="utf-8").read()
text = text.replace(
    "## Components",
    "## Conventions\n\n"
    "Commit format and endpoint naming live in `docs/conventions.md`.\n"
    "The Go package is described in `engine/README.md`.\n\n"
    "## Components",
)
io.open(path, "w", encoding="utf-8").write(text)
PY

db_prepend_worklog_entry \
  "Add the engine package and write down the conventions" \
  "Added \`engine/prompt.go\` with \`engine/README.md\` beside it, and wrote \`docs/conventions.md\`, linked from \`docs/ARCHITECTURE.md\`." \
  "- [engine-tests] the engine package has no test for \`Route\`."
