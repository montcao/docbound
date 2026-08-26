// A dependency is a decision with a support cost, a licence, and a supply
// chain. Changing one without a record leaves the next reader guessing why.

import { isManifest } from "../paths.mjs";

export const id = "dep-adr";
export const level = "error";

export function run(ctx) {
  const manifests = [...ctx.changed].filter(isManifest).sort();
  if (manifests.length === 0) return;

  const hasAdr = [...ctx.changed].some(
    (c) => c.startsWith("docs/decisions/") && c.endsWith(".md"),
  );
  if (hasAdr) return;

  for (const manifest of manifests) {
    ctx.add(
      id,
      level,
      manifest,
      "dependency manifest changed with no Architecture Decision Record " +
        "(ADR) in the diff (docs/decisions/)",
    );
  }
}
