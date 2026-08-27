# 0029. Unix seconds on every entry, and errata on records that got it wrong

- Date: 2026-08-27
- Status: accepted
- Supersedes: none

## Context

This project published two statements about elapsed time that nobody measured.
<!-- docbound-ignore-start -->
It said four provider entries had been removed "months ago" and that a check
count in `README.npm.md` was "two versions stale".
<!-- docbound-ignore-end --> The first commit here is
1787760161 and this record is written at 1787855966, which is under thirty hours. There
has been one version, 0.1.0, released once.

Both claims were generated rather than computed, and the reason is visible in
the data. Nothing in this repository records elapsed time. Every date is an ISO
day string in a heading, so an agent reading a worklog sees two dates and has to
parse and subtract them to know anything. When the number is not there, the
sentence gets a phrase instead, and a phrase is never checked.

`docs/decisions/0018-no-self-serving-metrics.md` already settled the principle
for this project: a number nobody measured is not a number. It was written about
token counts and applies unchanged here.

## Options

### Resolve to be more careful

Free, and it is what the two existing rules held by review already ask for. It
has now failed twice in the same repository that wrote them.

### ISO 8601 timestamps

Human-readable in the file. They also need a parser and a timezone before they
subtract, which is the step that was being skipped.

### Unix seconds

An integer that subtracts, sorts, and compares with no parser and no timezone,
readable by every language and by `date +%s`. Less readable to a person, and
the ISO day already in the heading covers that.

## Decision

Unix seconds, in three places.

`skill/docbound/scripts/audit.mjs` stamps each run and
`skill/docbound/scripts/lib/report.mjs` prints it, as `t=` in the header and
`timestamp` in the JSON, so every run is anchored.
`skill/docbound/scripts/start.mjs` writes `t=` onto the entry's Agent line and
`skill/docbound/templates/WORKLOG-entry.md` carries the field for a hand-written
entry. `skill/docbound/scripts/lib/digest.mjs` reads it back, and
`skill/docbound/scripts/summary.mjs` computes an age rather than printing a date
and leaving the subtraction to the reader.

`skill/docbound/scripts/lib/checks/stale-marker.mjs` gained a pattern for
durations asserted without a number. It
runs on the worklog and the decision records for this case, unlike the
changelog-phrasing half, because an unmeasured span is a claim about the world
and is as wrong in an archive as anywhere else.

Words that describe rather than assert a span are deliberately absent from that
pattern. Recently, nowadays, and these days appear in sentences like "what has
changed recently", which names a section rather than claiming a duration.

## Consequences

A record's body is immutable, so a false statement of fact inside one could not
be marked as false. Superseding is wrong when the decision still stands. So
`skill/docbound/scripts/lib/checks/adr-immutable.mjs` now permits one more edit: a `## Corrections` section appended
at the end, anchored so it cannot hide an edit above it. The original text is
never touched and the correction carries the timestamp it was made at, which is
how errata have always worked.

Two records were corrected this way rather than rewritten, 0027 and 0028, and
the past worklog entry that carried the second false claim got the same
treatment. `stale-marker` goes quiet on a record that carries a Corrections
section, because appending one is the only thing that record is allowed to do
about it. One correction quiets the whole file, which is why a record takes a
bullet per error rather than a section per record.

Entries written before this field existed have no timestamp, and every reader
treats that as unknown rather than filling it in. The ages in `summary` will be
blank for the existing history and present from here.

None of this stops an agent writing an unmeasured phrase in a sentence the
pattern does not match. It makes the number available and reports the phrasings
that have actually appeared.

## What would reverse this

If the pattern starts firing on sentences that name a section rather than assert
a span, it is reading English again and the list should shrink to the phrases
that have caused a real error.
