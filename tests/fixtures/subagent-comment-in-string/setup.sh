#!/usr/bin/env bash
# A subagent rewording one comment, on a line whose string contains a comment
# marker. Rewording a comment is explicitly allowed; the regular expression this
# check used could not tell that line's `#` apart and reported a logic edit.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

# --- the coder's half -------------------------------------------------------

cat > src/links.py <<'PY'
"""Link handling."""

DOCS_URL = "https://example.com/guide#installation"  # anchors are server-side


def canonical(url):
    """Return `url` with any fragment removed."""
    return url.split("#", 1)[0]
PY

cat > docs/WORKLOG.md <<MD
# Worklog

Newest entry first. One entry per task.

## ${TODAY} - Add link canonicalisation

Agent: fixture · Branch: feature

### Intent

Strip fragments before storing a link, since the server never sees them.

### Handoff

- Chose: dropping the fragment over preserving it - nothing downstream reads it.
- Did not: validate the scheme. No caller passes anything but https yet.

### Outcome

### Still open
MD
db_commit "add link canonicalisation"
printf -- '--mode subagent --since %s' "$(git rev-parse HEAD)" > "$FIXTURE_META/args"

# --- the documentation subagent's half, comments only -----------------------

python3 - <<'PY'
import io

path = "src/links.py"
text = io.open(path, encoding="utf-8").read()
# Only the trailing comment changes. The string on that line still holds a `#`.
text = text.replace(
    "# anchors are server-side",
    "# the fragment never reaches the server",
)
io.open(path, "w", encoding="utf-8").write(text)

path = "src/README.md"
text = io.open(path, encoding="utf-8").read()
text = text.replace(
    "- `src/app.py` - the public surface; `build_app` and `accept` are what callers use.",
    "- `src/app.py` - the public surface; `build_app` and `accept` are what callers use.\n"
    "- `src/links.py` - canonical link form; fragments are dropped before storage.",
)
io.open(path, "w", encoding="utf-8").write(text)
PY

cat > docs/WORKLOG.md <<MD
# Worklog

Newest entry first. One entry per task.

## ${TODAY} - Add link canonicalisation

Agent: fixture (code) · fixture-docs (docs)

### Intent

Strip fragments before storing a link, since the server never sees them.

### Handoff

- Chose: dropping the fragment over preserving it - nothing downstream reads it.
- Did not: validate the scheme. No caller passes anything but https yet.

### Outcome

Named \`src/links.py\` in \`src/README.md\` and reworded one comment in it. No
logic changed.

### Still open

- [link-scheme] Nothing validates the scheme, per the handoff.
MD
