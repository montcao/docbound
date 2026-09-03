#!/usr/bin/env bash
# An entry that opens work and closes none.
#
# This project's own ledger reached 69 open against 8 closed in five days
# (`docs/decisions/0039-the-ledger-needs-pressure.md`).
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

python3 - <<'PY'
import io
path = "worker/README.md"
text = io.open(path, encoding="utf-8").read()
io.open(path, "w", encoding="utf-8").write(
    text.replace("## Depended on by", "Job ids are opaque to callers.\n\n## Depended on by")
)
PY

words="retry-jitter drain-order id-opacity queue-durability backpressure-limit
clock-skew shard-rebalance cache-eviction schema-version replay-window
token-refresh idle-timeout batch-sizing dead-letters partition-key
leader-election read-repair compaction-lag fanout-cost snapshot-restore
quota-accounting tracing-spans warm-standby cursor-stability lease-renewal
digest-format proxy-affinity spill-to-disk vector-clock write-amplification"
items="$(for w in $words; do echo "- [$w] something discovered and not yet done."; done)"
db_prepend_worklog_entry \
  "Say that job ids are opaque" \
  "Wrote one sentence into \`worker/README.md\`." \
  "$items"
