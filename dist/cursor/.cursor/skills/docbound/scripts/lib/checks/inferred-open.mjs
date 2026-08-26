// Subagent mode only. An inference is a question, and a question with nowhere
// to be answered becomes a fact by attrition. Every `Inferred:` marker in a
// changed doc has a confirmation item under Still open that names that doc.

import { exists, isDoc, readText } from "../paths.mjs";
import { WORKLOG_PATH, entrySection } from "../worklog.mjs";

export const id = "inferred-open";
export const level = "error";

const INFERRED = /\bInferred:/g;

export function run(ctx) {
  if (ctx.topEntry === null) return;
  const stillOpen = entrySection(ctx.topEntry, "Still open").toLowerCase();

  for (const file of [...ctx.changed].sort()) {
    if (!isDoc(file, ctx.excludes) || file === WORKLOG_PATH) continue;
    if (!exists(ctx.root, file)) continue;

    const count = (readText(ctx.root, file) ?? "").match(INFERRED)?.length ?? 0;
    if (count === 0) continue;

    const asksForConfirmation =
      stillOpen.includes("inferred") || stillOpen.includes("confirm");
    const namesThisDoc =
      stillOpen.includes(file.toLowerCase()) ||
      stillOpen.includes(file.split("/").pop().toLowerCase());
    if (asksForConfirmation && namesThisDoc) continue;

    ctx.add(
      id,
      level,
      file,
      `${count} 'Inferred:' claim(s) with no confirmation item naming this ` +
        "doc under Still open",
    );
  }
}
