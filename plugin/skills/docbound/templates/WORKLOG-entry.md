## <YYYY-MM-DD> - <task title, as a verb phrase>

Agent: <claude | codex | gemini | copilot | other> · Branch: <branch or "n/a">
<In subagent mode, both: `Agent: codex (code) · claude (docs)`>

### Intent

<Written before the first edit. What this task is trying to achieve and why. Two to four sentences.>

### Expected to touch

- `<path/>` — <what you expect to change there>

### Unknowns going in

- <what you do not know yet that could change the plan>

### Handoff

<Written by the coding agent as it works, for whoever documents after it — a documentation subagent, a reviewer, or its future self. Required when a documentation subagent will run; optional otherwise. Delete the section if you ran the full loop yourself and recorded decisions as you went.>

- Chose: <what> over <alternative> — because <reason>
- Unsure about: <what you did not settle, and why>
- Did not: <what you deliberately left out, and why>

### Outcome

<Filled at the end. What actually changed, by path. Which docs were updated, which sections or docs were deleted, which Architecture Decision Records (ADRs) written or superseded, which stale claims removed. Where reality diverged from Intent, say so.>

### Still open

<Filled at the end. What is not done, deferred, or discovered. Each item specific enough that someone else could pick it up.>

<Give an item a slug in square brackets and it becomes trackable: declared once, open until an entry closes it, never restated. Without one it is a note attached to this task, which is fine for something that will not outlive it.>

- [<slug>] <item — `<path>` — <why it is open>>
- [<slug from an earlier entry>] <closed: and what happened>

### Waivers

<Audit findings deliberately not fixed. Format: `waiver: <check-id> — <reason a reviewer would accept>`. Delete this section if empty.>
