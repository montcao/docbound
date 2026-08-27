// A slug one keystroke away from another slug.
//
// `docbound close` refuses a slug that is not open, so a typo caught there is
// an error message. Nothing protects the file when it is edited by hand, and a
// mistyped slug then opens a second item that looks like the first and tracks
// separately. Neither copy is wrong on its face, which is why this has to be
// noticed rather than deduced.
//
// A warning, not an error. Two genuinely different items can be one edit apart,
// and blocking a task over a naming coincidence would be a check about spelling
// rather than about truth.

import { openItems, worklogEntries } from "../digest.mjs";
import { WORKLOG_PATH } from "../worklog.mjs";

export const id = "open-item-typo";
export const level = "warn";

// Short slugs collide innocently, so only compare ones long enough that a near
// match is more likely to be a mistake than a coincidence.
const MIN_LENGTH = 6;
const MAX_DISTANCE = 2;

export function run(ctx) {
  const entries = worklogEntries(ctx.root);
  if (entries.length === 0) return;

  const { open, closed } = openItems(entries);
  const all = [...open, ...closed].filter((item) => item.slug);
  const seen = new Map();
  for (const item of all) {
    if (!seen.has(item.slug)) seen.set(item.slug, item);
  }

  const slugs = [...seen.keys()].filter((slug) => slug.length >= MIN_LENGTH).sort();
  const reported = new Set();

  for (let i = 0; i < slugs.length; i += 1) {
    for (let j = i + 1; j < slugs.length; j += 1) {
      const distance = editDistance(slugs[i], slugs[j], MAX_DISTANCE);
      if (distance > MAX_DISTANCE) continue;

      // The one mentioned less is the likelier mistake, and is named first.
      const [suspect, established] =
        seen.get(slugs[i]).mentions <= seen.get(slugs[j]).mentions
          ? [slugs[i], slugs[j]]
          : [slugs[j], slugs[i]];
      if (reported.has(suspect)) continue;
      reported.add(suspect);

      ctx.add(
        id,
        level,
        WORKLOG_PATH,
        `open item [${suspect}] is ${distance} character(s) from ` +
          `[${established}]; if they are the same item, one of them is a typo ` +
          "that opened a second one",
      );
    }
  }
}

/**
 * Levenshtein distance, abandoned once it passes `limit`.
 *
 * Two rows rather than a full matrix, and an early exit, because this runs over
 * every pair of slugs in a worklog that only grows.
 */
export function editDistance(a, b, limit = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      best = Math.min(best, current[j]);
    }
    if (best > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}
