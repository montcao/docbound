// Subagent mode only. A confident, plausible, wrong ADR is worse than no ADR,
// so every reason in one carries its source class and an ADR built only from
// inference says so in its Status line.

import { exists, isAdr, readText, splitLines } from "../paths.mjs";
import { filled } from "../worklog.mjs";
import { sectionBody } from "../text.mjs";

export const id = "adr-sourced";
export const level = "error";

const STATUS = /^\s*[-*]?\s*Status:\s*(.+)$/m;

export function run(ctx) {
  for (const file of [...ctx.changed].sort()) {
    if (!isAdr(file)) continue;
    const existing =
      ctx.git && !ctx.added.has(file) && ctx.beforeVersion(file) !== null;
    if (existing) continue;
    if (!exists(ctx.root, file)) continue;

    const text = readText(ctx.root, file) ?? "";
    const body = sectionBody(text, "## Sources") ?? "";
    if (!filled(body)) {
      ctx.add(
        id,
        level,
        file,
        "no ## Sources section; every reason must trace to handoff, a code " +
          "comment, a prior ADR, or be marked inferred",
      );
      continue;
    }

    const sources = splitLines(body)
      .filter((line) => line.trim())
      .map((line) => trimSourceMarkers(line).toLowerCase());
    const onlyInferred = sources.every((s) => s.startsWith("inferred"));
    const status = STATUS.exec(text);
    const statusText = status ? status[1].trim().toLowerCase() : "";

    if (onlyInferred && !statusText.includes("unconfirmed")) {
      ctx.add(
        id,
        level,
        file,
        "sourced only from inference; Status must be 'accepted (unconfirmed)'",
      );
    }
  }
}

function trimSourceMarkers(line) {
  return line.replace(/^[ \-*`]+/, "").replace(/[ \-*`]+$/, "");
}
