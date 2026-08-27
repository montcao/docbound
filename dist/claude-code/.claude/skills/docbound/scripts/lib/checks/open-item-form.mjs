// The slug ledger is only as good as the syntax that maintains it, and getting
// that syntax wrong is invisible.
//
// Two ways it goes wrong, both seen in one real session:
//
//   Writing `Closes [nginx-python-default].` in an Outcome section reads like
//   closing the item and does nothing. The closing form is a bullet under
//   `Still open`, and prose naming the slug is silently not it. The item stayed
//   open, `summary --open` kept listing it, and no check said a word. An entry
//   that does write the bullet may also name the slug in prose as much as it
//   likes; only an item left open is reported.
//
//   Restating an item that is already open, as a fresh declaration in a new
//   entry. Carrying forward is what a slug is for; restating it is the
//   duplication slugs exist to remove, and `summary --open` already counts the
//   restatements, so the information to say so was there.
//
// Only the newest entry is examined, because that is the one being written.

import { openItems, parseOpenItem, worklogEntries } from "../digest.mjs";
import { splitLines } from "../paths.mjs";

export const id = "open-item-form";
export const level = "warn";

const SLUG_IN_LINE = /\[([a-z0-9][a-z0-9-]*)\]/g;
const CLOSING_WORD = /\b(close[sd]?|closing|resolved?|fixed|done)\b/i;
const CANONICAL_BULLET = /^\s*[-*]\s*\[/;

/**
 * Lines that talk about closing a slug without using the closing form.
 *
 * A canonical bullet is skipped whatever it says, so `- [slug] closed: fixed
 * the ordering` never reports itself.
 */
export function prosePretendingToClose(entryText) {
  const found = [];
  for (const line of splitLines(entryText)) {
    if (CANONICAL_BULLET.test(line)) continue;
    if (!CLOSING_WORD.test(line)) continue;
    for (const match of line.matchAll(SLUG_IN_LINE)) found.push(match[1]);
  }
  return found;
}

export function run(ctx) {
  const entry = ctx.topEntry;
  if (!entry) return;

  const entries = worklogEntries(ctx.root);
  if (entries.length === 0) return;

  // What was open before this entry was written, so "already open" means open
  // for a reason other than this entry declaring it.
  const earlier = openItems(entries.slice(1));
  const openBefore = new Map(
    earlier.open.filter((i) => i.slug).map((i) => [i.slug, i]),
  );

  // A slug this entry does close with the bullet is allowed to be named in
  // prose too. "Closing [retry-jitter]." is an ordinary way to open an Intent,
  // and warning about it beside a correct closing bullet is noise.
  const closedHere = new Set(
    entries[0].stillOpen
      .map(parseOpenItem)
      .filter((item) => item.slug !== null && item.closing)
      .map((item) => item.slug),
  );

  for (const slug of new Set(prosePretendingToClose(entry))) {
    if (!openBefore.has(slug) || closedHere.has(slug)) continue;
    ctx.add(
      id,
      level,
      "docs/WORKLOG.md",
      `\`[${slug}]\` is talked about as closed in prose, which does not close ` +
        `it; write \`- [${slug}] closed: <what changed>\` under Still open`,
    );
  }

  for (const raw of entries[0].stillOpen) {
    const item = parseOpenItem(raw);
    if (item.slug === null || item.closing) continue;
    const known = openBefore.get(item.slug);
    if (!known) continue;
    ctx.add(
      id,
      level,
      "docs/WORKLOG.md",
      `\`[${item.slug}]\` has been open since ${known.date ?? "an earlier entry"}` +
        "; it carries forward on its own, and restating it is what the slug " +
        "exists to make unnecessary",
    );
  }
}
