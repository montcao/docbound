// A new directory holding source is a new module, and a module with no README
// is a module whose contract lives only in the head of whoever wrote it.

import { exists, isTest } from "../paths.mjs";

export const id = "new-dir-readme";
export const level = "error";

export function run(ctx) {
  for (const dir of [...ctx.addedDirs].sort()) {
    if (isTest(`${dir}/`)) continue;
    if (!exists(ctx.root, `${dir}/README.md`)) {
      ctx.add(
        id,
        level,
        dir,
        "new directory with source and no README.md (templates/MODULE.md)",
      );
    }
  }
}
