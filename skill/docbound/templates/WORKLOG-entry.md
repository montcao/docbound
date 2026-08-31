## <YYYY-MM-DD> - <task title, as a verb phrase>

Agent: <claude | codex | gemini | copilot | other> · Branch: <branch or "n/a"> · t=<unix seconds, from `date +%s`>
<In subagent mode, both: `Agent: codex (code) · claude (docs)`>

### Intent

<Written before the first edit. One or two lines: what this task is for. Not a plan, not a file list, not what you might find. The diff carries all of that.>

### Handoff

<Written by the coding agent as it works, for whoever documents after it — a documentation subagent, a reviewer, or its future self. Required when a documentation subagent will run; optional otherwise. Delete the section if you ran the full loop yourself and recorded decisions as you went.>

- Chose: <what> over <alternative> — because <reason>
- Unsure about: <what you did not settle, and why>
- Did not: <what you deliberately left out, and why>

### Outcome

<Filled at the end. One or two lines: what changed and anything that surprised you. Reasoning goes in a decision record, not here. An entry longer than a few lines is one nobody reads.>

### Still open

<Filled at the end. One line each, specific enough that somebody else could pick it up.>

<Give an item a slug in square brackets and it becomes trackable: declared once, open until an entry closes it, never restated. Without one it is a note attached to this task, which is fine for something that will not outlive it.>

- [<slug>] <item — `<path>` — <why it is open>>
- [<slug from an earlier entry>] <closed: and what happened>

### Waivers

<Audit findings deliberately not fixed. Format: `waiver: <check-id> — <reason a reviewer would accept>`. Delete this section if empty.>
