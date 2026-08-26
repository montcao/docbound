// Subagent mode only. The handoff is the documentation agent's only source of
// stated reasoning; without it every recorded why is a reconstruction, and the
// fix is upstream in the coding agent, not downstream in better inference.

import { entrySection, filled } from "../worklog.mjs";

export const id = "handoff-present";
export const level = "error";

export function run(ctx) {
  // `worklog-entry` already failed if there is no entry to read.
  if (ctx.topEntry === null) return;
  if (filled(entrySection(ctx.topEntry, "Handoff"))) return;

  ctx.add(
    id,
    level,
    "docs/WORKLOG.md",
    "no ### Handoff section from the coding agent; reconstructing reasoning " +
      "without one is guesswork — report upstream",
  );
}
