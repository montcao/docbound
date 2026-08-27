# 0022. The edit hook reports each finding once

- Date: 2026-08-27
- Status: accepted
- Supersedes: none

## Context

The `after-edit` hook runs after every `Edit`, `Write`, and `MultiEdit`. It
printed everything currently open, every time.

Measured on a 107-file repository: 0.92 seconds and 17 findings per run, the
same 17 each time. A forty-edit session pays 37 seconds and puts the same
seventeen lines into the transcript forty times.

The findings were also unfixable at that moment: template placeholders in
scaffolded docs and dead references inherited from before adoption. The agent
was being told, six hundred times, about work it was not doing.

That is context spent to say nothing new, by a project whose argument is that
re-deriving what is already written down is the waste worth removing. The tool
was doing to the transcript what it exists to stop.

## Options

### Leave it

Each edit gets the current state, which is simple and needs no memory. It is
also what was measured above.

### Cap the output

`MAX_REPORTED` already caps at 20. A cap makes the repetition shorter, not less
repetitive, and truncation hides the new finding behind the old ones.

### Report only what is new

Remember what was reported and print the difference. It needs somewhere to keep
the memory and a rule for when a finding counts as new again.

## Decision

`skill/docbound/scripts/hook.mjs` keeps the fingerprints of what it
<!-- docbound-ignore-start -->
reported in a `reported.json` under `.docbound/`, which `docbound install`
<!-- docbound-ignore-end -->
already excludes from the audit and the shipped `.gitignore` block already
ignores. A fingerprint is
the check ID, the path, and the message.

The memory is rebuilt from what is currently open rather than accumulated, so a
finding that is fixed and reappears is reported again. The `stop` event clears
it: that event states everything still open, so nothing after it is worth
suppressing.

An unreadable or malformed cache means report everything. Losing the memory
costs a repeat; trusting a bad file costs a finding nobody ever sees. A cache
that cannot be written is ignored, because a read-only working directory is not
a reason to fail somebody's edit.

Bounded at 500 entries, so a repository with thousands of findings cannot grow
the file without limit.

`tests/hook.test.mjs` pins all of it.

## Consequences

A long editing session says each thing once. When something new appears it is
the only thing on screen, which is what makes it readable.

The cost is state. Two sessions editing the same working tree share one cache,
so the second may not be told something the first was told. They also share the
working tree, so they were already going to confuse each other.

A finding suppressed by the cache is still an error. The stop hook restates it
and still blocks. Nothing gets past by being repetitive.

## What would reverse this

If a finding is reported once, scrolls out of the agent's context, and is then
never mentioned again until the stop hook blocks, the memory should expire on a
timer rather than lasting a whole session.
