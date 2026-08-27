## What this changes

<!-- The behaviour, not the diff. -->

## Doc deltas

<!--
This repository runs docbound on itself, so a pull request lists what changed in
the documentation alongside the code: docs written or rewritten, sections
deleted, decision records added or superseded, stale claims removed, waivers,
and what is under `Still open`.
-->

## Checklist

- [ ] `npm test`
- [ ] `node scripts/build.mjs && node scripts/check-dist-fresh.mjs`, if `skill/docbound/` changed
- [ ] `node cli/index.mjs audit` exits 0
- [ ] A worklog entry in `docs/WORKLOG.md`, opened before the first edit and closed with an outcome
- [ ] A decision record, if this chose between two plausible approaches
