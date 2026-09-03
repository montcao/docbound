// A dependency is a decision with a support cost, a licence, and a supply
// chain. Changing one without a record leaves the next reader guessing why.
//
// What counts as changing one is read from the file rather than from its name.
// A lockfile is where an automated bump lands, and none were in the manifest
// set, so the check missed its own case. A manifest also holds scripts, metadata,
// and tool configuration, and firing on those blocked an npm script rename
// (`docs/decisions/0035-dep-adr-reads-the-dependencies.md`).

import { isLockfile, isManifest, readText } from "../paths.mjs";

export const id = "dep-adr";
export const level = "error";

const BLOCKS = [
  "dependencies", "devDependencies", "peerDependencies",
  "optionalDependencies", "bundledDependencies", "overrides", "resolutions",
];

/**
 * The dependency-bearing part of a manifest, as a comparable string.
 *
 * JSON manifests are parsed and narrowed to the blocks that declare a
 * dependency. Anything else returns the whole file, because parsing every
 * manifest format is a larger promise than this check needs to make: those
 * formats are mostly dependency declarations already.
 */
export function dependencyPart(relpath, text) {
  if (text === null) return null;
  if (!relpath.endsWith(".json")) return text;
  try {
    const parsed = JSON.parse(text);
    const kept = {};
    for (const block of BLOCKS) {
      if (parsed[block] !== undefined) kept[block] = parsed[block];
    }
    return JSON.stringify(kept);
  } catch {
    // Unparseable: treat every change as a dependency change rather than
    // excusing one.
    return text;
  }
}

/** True when this file's dependencies differ from the reference commit. */
function dependenciesChanged(ctx, file) {
  if (isLockfile(file)) return true;
  const before = ctx.beforeVersion(file);
  // A new manifest is a dependency change. So is one with nothing to compare
  // against, since not knowing is not a reason to stay quiet about a dependency.
  if (before === null) return true;
  const after = readText(ctx.root, file);
  if (after === null) return false;
  return dependencyPart(file, before) !== dependencyPart(file, after);
}

export function run(ctx) {
  const changed = [...ctx.changed]
    .filter((c) => isManifest(c) || isLockfile(c))
    .sort()
    .filter((c) => dependenciesChanged(ctx, c));
  if (changed.length === 0) return;

  const hasAdr = [...ctx.changed].some(
    (c) => c.startsWith("docs/decisions/") && c.endsWith(".md"),
  );
  if (hasAdr) return;

  for (const manifest of changed) {
    ctx.add(
      id,
      level,
      manifest,
      "dependency changed with no Architecture Decision Record " +
        "(ADR) in the diff (docs/decisions/)",
    );
  }
}
