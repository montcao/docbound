// A new directory holding source is a new module, and a module with no README
// is one whose contract lives only in whoever wrote it.
//
// A framework route directory is not a module. Next.js, Remix, SvelteKit, and
// Nuxt all put one reserved file per URL segment, so `app/api/audit/[id]/`
// holding a single `route.ts` is a path, not a boundary. One Next.js
// application produced fifteen blocking findings on its first audit, every one
// of them asking for a README beside a route handler
// (`docs/decisions/0036-route-directories-are-not-modules.md`).

import { exists, isSource, isTest, parentOf } from "../paths.mjs";

// Reserved basenames: a file the framework locates by name rather than one
// somebody chose. A directory whose source is only these is routing structure.
const ROUTE_FILES = new Set([
  "route", "page", "layout", "loading", "error", "not-found", "template",
  "default", "head", "middleware", "opengraph-image", "sitemap", "robots",
  "+page", "+layout", "+server", "+error", "+page.server", "+layout.server",
  "index", "_app", "_document", "_layout", "_middleware", "handle", "hooks",
]);

/** True when every source file in the directory is framework-located. */
export function routeDirectory(files) {
  if (files.length === 0) return false;
  return files.every((file) => {
    const base = file.split("/").pop().replace(/\.[^.]+$/, "");
    return ROUTE_FILES.has(base);
  });
}

export const id = "new-dir-readme";
export const level = "error";

export function run(ctx) {
  for (const dir of [...ctx.addedDirs].sort()) {
    if (isTest(`${dir}/`)) continue;
    const sources = [...ctx.changed].filter(
      (file) => isSource(file, ctx.excludes) && parentOf(file) === dir,
    );
    if (routeDirectory(sources)) continue;
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
