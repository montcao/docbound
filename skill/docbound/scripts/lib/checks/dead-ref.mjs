// A backticked path that does not exist is the mechanism by which docs and code
// come untethered: the claim reads as checkable and is not.

import fs from "node:fs";
import path from "node:path";
import { SOURCE_EXT, allDocs, parentOf, readText, suffixOf } from "../paths.mjs";

export const id = "dead-ref";
export const level = "error";

const PATH_REF = /`([^`\s]+)`/g;
const DATA_EXT = new Set([
  ".md", ".json", ".toml", ".yaml", ".yml", ".txt", ".cfg", ".ini", ".env",
  ".lock", ".html", ".css", ".xml",
]);
const SKIP_PREFIX = ["$", "-", "--", "<", "{", "@", "#"];
const SKIP_CHARS = "*?<>{}()=";

export function run(ctx) {
  for (const doc of ctx.docs()) {
    const text = readText(ctx.root, doc);
    if (text === null) continue;
    for (const match of text.matchAll(PATH_REF)) {
      const ref = match[1];
      if (ref.includes("://")) continue;
      if (SKIP_PREFIX.some((p) => ref.startsWith(p))) continue;
      if ([...SKIP_CHARS].some((ch) => ref.includes(ch))) continue;

      let target = ref.split(":")[0].replace(/\/+$/, "");
      if (!target.includes("/") && !target.includes(".")) continue;
      if (target.startsWith("./") || target.startsWith("/")) {
        target = target.replace(/^[./]+/, "");
      }
      if (!target || target === "." || target === "..") continue;
      const suffix = suffixOf(target);
      const known = SOURCE_EXT.has(suffix) || DATA_EXT.has(suffix);
      // Things like `v1.2.3` or `foo.bar`: a dot, no slash, no known extension.
      if (suffix && !known && !target.includes("/")) continue;

      const candidates = [
        path.join(ctx.root, target),
        path.join(ctx.root, parentOf(doc) === "." ? "" : parentOf(doc), target),
      ];
      if (!candidates.some((c) => fs.existsSync(c))) {
        ctx.add(id, level, doc, `references \`${ref}\` which does not exist`);
      }
    }
  }
}
