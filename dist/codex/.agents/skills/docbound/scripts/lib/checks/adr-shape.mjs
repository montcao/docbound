// An ADR without a reversal condition is a fact, not a decision. Context and
// Decision are what make it readable; the reversal condition is what makes it
// worth having written.

import { exists, isAdr, readText } from "../paths.mjs";
import { sectionBody } from "../text.mjs";

export const id = "adr-shape";
export const level = "error";

const SECTIONS = ["## Context", "## Decision", "## What would reverse this"];

export function run(ctx) {
  for (const file of [...ctx.changed].sort()) {
    if (!isAdr(file)) continue;
    // An existing ADR belongs to `adr-immutable`, which forbids editing it at
    // all; re-checking its shape here would report the same file twice.
    if (ctx.git && !ctx.added.has(file) && ctx.beforeVersion(file) !== null) {
      continue;
    }
    if (!exists(ctx.root, file)) continue;

    const text = readText(ctx.root, file) ?? "";
    for (const section of SECTIONS) {
      const body = (sectionBody(text, section) ?? "")
        .replace(/<[^>]*>/g, "")
        .trim();
      if (!body) {
        ctx.add(id, level, file, `section '${section}' missing or empty`);
      }
    }
  }
}
