#!/usr/bin/env bash
# Constructs that exist in real repositories and used to be reported as defects.
#
# Every one of these was found by installing docbound into a TypeScript and Go
# monorepo it had never seen and reading the first run's 97 errors. They are
# collected here rather than vendored from that repository, because a fixture
# has to be licence-clean and deterministic. What is distilled is the shape:
#
#   * a gofmt-clean Go file whose raw string contains space-indented JSON
#   * a URL route written `/search`, and `owner/repo` standing in for an argument
#   * a documented commit format whose `<type>` is not an unfilled placeholder
#   * a doc inside a package writing paths the way that package's tooling does
#   * a container image reference, which has slashes and dots and is not a path
#   * a bare file name naming a kind of file that exists elsewhere in the tree
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

- `prompt.go` — the response template and the route.

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

The query endpoint is mounted at `/search`. Passing a repository to it means
passing `owner/repo`, which the service resolves against the host it is
configured for.

## Images

The engine runs on `gcr.io/distroless/base-debian12`. A project is identified by
the file it carries: `requirements.txt` for python, `package.json` for node.
MD

mkdir -p sample/python sample/node
cat > sample/python/requirements.txt <<'TXT'
fastapi==0.111.0
TXT
cat > sample/node/package.json <<'JSON'
{ "name": "sample", "private": true }
JSON
cat > sample/README.md <<'MD'
# sample

Fixture projects, one per identified type. Each exists to carry the file that
identifies it and nothing else.

## Must not

- Must not grow application logic.
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

# Two dependency manifests arrive with the sample projects, which `dep-adr`
# asks for a record about. Writing it is the fixture behaving correctly rather
# than working around a check.
cat > docs/decisions/0002-sample-projects-carry-real-manifests.md <<'MD'
# 0002. The sample projects carry real dependency manifests

- Date: TODAY
- Status: accepted
- Supersedes: none

## What to do

Nothing. The sample manifests are committed.

## Context

The identifier keys off the file a project carries, so a sample project without
a real manifest does not exercise it.

## Options

### Empty files named like manifests

Cheap, and the identifier reads them, so nothing is proven about parsing.

### Real manifests with one pinned dependency each

Exercises the identifier and the parse. Adds two dependency files to a
repository that had one.

## Decision

Real manifests, one pinned dependency each.

## Consequences

The repository now declares dependencies in three files rather than one, and
none of them is installed by anything here.

## What would reverse this

If the identifier stops reading manifest contents and keys only on file names,
empty files are enough and these should shrink.
MD
sed -i.bak "s/^- Date: TODAY/- Date: $TODAY/" docs/decisions/0002-sample-projects-carry-real-manifests.md
rm -f docs/decisions/0002-sample-projects-carry-real-manifests.md.bak

db_prepend_worklog_entry \
  "Add the engine package and write down the conventions" \
  "Added \`engine/prompt.go\` with \`engine/README.md\` beside it, \`sample/\` with a README and manifests recorded in \`docs/decisions/0002-sample-projects-carry-real-manifests.md\`, and wrote \`docs/conventions.md\`, linked from \`docs/ARCHITECTURE.md\`." \
  "- [engine-tests] the engine package has no test for \`Route\`."
