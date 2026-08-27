#!/usr/bin/env bash
# The two ways the slug ledger is maintained wrongly, both silent until now.
#
# An entry that says `Closes [queue-durability].` in prose, which reads like
# closing the item and does not, and an entry that restates a slug already open
# from an earlier one. Both were done by hand in a real session before either
# was noticed (`docs/decisions/0025-the-slug-ledger-checks-itself.md`).
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

# An earlier entry that opens two slugs, so the newest one has something to
# restate and something to talk about closing.
db_prepend_worklog_entry \
  "Note what the queue does not do yet" \
  "Wrote the durability gap into \`worker/README.md\`." \
  "- [queue-durability] the queue keeps nothing across a restart.
- [id-opacity] job ids are opaque by convention and nothing enforces it.
- [drain-order] \`drain\` promises oldest first and returns an empty list."
db_commit "record two open items"

# The third slug is the near-miss: named in prose beside a closing word *and*
# closed by the bullet, which is ordinary writing and must not be reported.
db_prepend_worklog_entry \
  "Look at durability again" \
  "Read the queue and changed nothing. Closes [queue-durability]. Closing [drain-order] as well." \
  "- [id-opacity] job ids are opaque by convention and nothing enforces it.
- [drain-order] closed: \`drain\` now returns pending jobs in insertion order."
