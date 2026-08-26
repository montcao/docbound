// Whether a module was run directly rather than imported.
//
// The obvious comparison, `import.meta.url === "file://" + process.argv[1]`,
// is wrong wherever the script's path crosses a symlink: Node resolves symlinks
// when it builds `import.meta.url` and the shell does not when it builds argv.
// On macOS every path under /var is such a path, and so is a skill installed
// through a symlink, which is one of the two install modes this repository
// supports.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export function isEntryPoint(importMetaUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return path.resolve(fileURLToPath(importMetaUrl)) === fs.realpathSync(entry);
  } catch {
    return false;
  }
}
