// Work opened and never closed is a ledger nobody reads.
//
// This project's own log reached 69 open items against 8 closed in five days,
// growing at roughly fourteen a day. At that rate a quarter produces a
// thousand-item list, and the command that reads it promises to tell a returning
// reader what is still open (`docs/decisions/0039-the-ledger-needs-pressure.md`).
//
// One condition: the size of the ledger. An earlier version also reported an
// entry that opened items and closed none, which fired on most of this project's
// own fixtures, because discovering something and finishing the task is the
// normal case. A cap says nothing until the list stops being readable, and then
// says it on every entry until somebody clears it.

import { openItems, worklogEntries } from "../digest.mjs";

export const id = "open-item-debt";
export const level = "warn";

// Above this, the list stops being something a person reads to orient.
const MAX_OPEN = 25;

export function run(ctx) {
  const entries = worklogEntries(ctx.root);
  if (entries.length === 0) return;

  const open = openItems(entries).open.length;
  if (open <= MAX_OPEN) return;

  ctx.add(
    id,
    level,
    "docs/WORKLOG.md",
    `${open} items open, over ${MAX_OPEN}. A list this long is not read; ` +
      "close what is done and delete what stopped mattering",
  );
}
