#!/usr/bin/env bash
# A diagram that outlived the code it describes. The package was renamed and the
# box was not, which is the failure mode diagrams have and prose mostly does not.
set -euo pipefail
. "$FIXTURE_LIB"
db_build_baseline
git checkout -q -b feature

git mv worker dispatch
python3 - <<'PY'
import io, os

# The prose follows the rename everywhere. The picture does not, because a
# diagram is not prose and search-and-replace does not find a box.
docs = ["README.md", "docs/ARCHITECTURE.md", "docs/WORKLOG.md",
        "src/README.md", "dispatch/README.md"]
for path in docs:
    if not os.path.exists(path):
        continue
    text = io.open(path, encoding="utf-8").read()
    inside_diagram = False
    out = []
    for line in text.split("\n"):
        if line.startswith("```mermaid"):
            inside_diagram = True
        elif inside_diagram and line.startswith("```"):
            inside_diagram = False
        elif not inside_diagram:
            line = line.replace("worker/", "dispatch/").replace("# worker", "# dispatch")
            line = line.replace("### worker ", "### dispatch ")
        out.append(line)
    io.open(path, "w", encoding="utf-8").write("\n".join(out))
PY

db_prepend_worklog_entry \
  "Rename the worker package to dispatch" \
  "Renamed the package and followed it through \`README.md\`, \`docs/ARCHITECTURE.md\`, and \`src/README.md\`." \
  "- The architecture diagram was not updated with the rename."
