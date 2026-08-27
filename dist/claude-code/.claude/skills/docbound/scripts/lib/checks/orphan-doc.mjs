// A doc nobody links to is a doc nobody reads, which is how it dies.
//
// The corpus is every doc in the repository; the docs reported on are the ones
// this change is answerable for. Under a baseline those differ, and a link from
// an older doc still counts as a link.

import { isAdr, readText } from "../paths.mjs";

export const id = "orphan-doc";
export const level = "warn";

export function run(ctx) {
  const corpus = new Map();
  for (const doc of ctx.allDocs()) corpus.set(doc, readText(ctx.root, doc) ?? "");

  for (const doc of ctx.docs()) {
    const exempt =
      !doc.startsWith("docs/") ||
      doc === "docs/ARCHITECTURE.md" ||
      doc === "docs/WORKLOG.md" ||
      isAdr(doc);
    if (exempt) continue;

    const name = doc.split("/").pop();
    let linked = false;
    for (const [other, text] of corpus) {
      if (other === doc) continue;
      if (text.includes(doc) || text.includes(name)) {
        linked = true;
        break;
      }
    }
    if (!linked) {
      ctx.add(
        id,
        level,
        doc,
        "not linked from any other doc; link it from README or ARCHITECTURE, " +
          "or delete it",
      );
    }
  }
}
