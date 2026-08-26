// An accepted ADR is an archive. The only permitted edit is the Status line
// (superseded by NNNN, deprecated). Anything else needs a new ADR, because the
// value of the record is what was believed at the time it was written.

import { exists, isAdr, readText } from "../paths.mjs";

export const id = "adr-immutable";
export const level = "error";

const STATUS_LINE = /^\s*[-*]?\s*Status:.*$/gm;

export function run(ctx) {
  for (const file of [...ctx.changed].sort()) {
    if (!isAdr(file) || ctx.added.has(file)) continue;
    if (!exists(ctx.root, file)) continue;

    const before = ctx.beforeVersion(file);
    // Untracked, or no reference commit: `adr-shape` owns new records.
    if (before === null) continue;

    const after = readText(ctx.root, file) ?? "";
    if (withoutStatus(before) !== withoutStatus(after)) {
      ctx.add(
        id,
        level,
        file,
        "existing Architecture Decision Record edited beyond its Status line; " +
          "ADRs are archives — write a superseding ADR instead",
      );
    }
  }
}

function withoutStatus(text) {
  return text.replace(STATUS_LINE, "").trim();
}
