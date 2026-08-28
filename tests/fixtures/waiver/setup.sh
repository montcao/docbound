#!/usr/bin/env bash
# documented-change with one file left uncovered and one accepted record edited,
# each dismissed by a waiver line giving the reason.
#
# The record's path is the case the old grammar could not express. A target used
# to end at the first hyphen inside it, so
# `docs/decisions/0001-adopt-docbound.md` parsed as `docs/decisions/0001`,
# matched no finding, and dismissed nothing without saying so. Every record
# filename is hyphenated (`docs/decisions/0030-waiver-targets-hold-hyphens.md`).
set -euo pipefail
. "$FIXTURE_LIB"
bash "$(dirname "$FIXTURE_LIB")/documented-change/setup.sh"
cd "$FIXTURE_DIR"

# Drop the sentence that named the changed file, so doc-coverage has nothing to
# find and the waiver is what carries the exception.
python3 - <<'PY'
import io
path = "docs/decisions/0002-reject-reason.md"
text = io.open(path, encoding="utf-8").read()
text = text.replace("`src/app.py`", "the request package")
io.open(path, "w", encoding="utf-8").write(text)
PY

# An edit to the body of an accepted record, waived. This is the case the old
# grammar could not express: the target is a record filename, every one of them
# is hyphenated, and the target used to end at the first hyphen.
python3 - <<'PY2'
import io
path = "docs/decisions/0001-adopt-docbound.md"
text = io.open(path, encoding="utf-8").read()
io.open(path, "w", encoding="utf-8").write(
    text.replace("Adopt docbound.", "Adopt docbound across the whole repository.")
)
PY2

db_prepend_worklog_entry \
  "Add charge capture and report rejection reasons" \
  "Added \`billing/charge.py\` with \`billing/README.md\`. Added a rejection-reason helper, recorded in ADR 0002. Pinned urllib3 in \`requirements.txt\`." \
  "- A second currency in \`billing/charge.py\` is unhandled and needs a decision record first." \
  "### Waivers

waiver: doc-coverage src/app.py — the helper is described by ADR 0002, which deliberately names the package rather than the file so the record survives a rename.
waiver: adr-immutable docs/decisions/0001-adopt-docbound.md — widening one sentence in the Decision to say what was already true everywhere; a hyphenated target, which the grammar used to truncate at the first hyphen."
