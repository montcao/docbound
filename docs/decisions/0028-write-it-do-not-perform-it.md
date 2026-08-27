# 0028. Sentence-level patterns belong in the standard, with nothing enforcing them

- Date: 2026-08-27
- Status: accepted
- Supersedes: none

## Context

A rule set for removing AI writing patterns was pointed at this repository. Its
vocabulary lists find almost nothing here: scanning six READMEs for the banned
words returns seven hits and every one is a false positive, with "harness" used
literally, "just" used temporally, and one em dash sitting inside quoted command
output.

The pattern rules land differently. The root README carried a fake-strong verb
in "docbound attacks that from both ends", puffery in "that is the entire value
of the tool", metadiscourse in "worth repeating here, because this is the point
where", a contrast in "an instruction competes and loses, an exit code does not
compete", and a closing aphorism about helping the reader lie to themselves. A
heading argued with the reader instead of naming a section. Bold stood in for a
heading in six places.

The existing standard rules out marketing. It asks for declarative, present
tense, and dry, and it bans praise and narrative. None of that describes the
patterns above, which is why they are spread through documents that pass every
check in this project.

The npm README turned out to be worse than stylistically off. It advertised
Codex, Gemini CLI, GitHub Copilot, and opencode, four editors removed in
`docs/decisions/0008-verified-providers-only.md`, and gave a check count two
versions stale. The audit does not read that file's claims about the world.

## Options

### Adopt the rule set as written

It is MIT licensed and copying it in is permitted with attribution. It is also
built for editing a human draft: half its rules are about preserving a writer's
voice, cadence, and digressions through an edit. An agent writing a module
README from a diff has no voice to preserve, and rules about protecting one
would be dead weight in a file an agent reads on every task.

### Add a check

Every one of these patterns is a judgement about English. This project decided
twice already, in `docs/decisions/0023-ambiguous-path-claims-are-warnings.md`
and `docs/decisions/0027-open-plainly-then-go-deep.md`, that a check reading
intent out of a sentence either warns or does not exist. A check for a colon
reveal would fire on every label, and one for a closing aphorism would need to
know what an aphorism is.

### Put the patterns in the standard and enforce nothing

The rules go where an agent reads them, grouped so they are memorable, and the
project says plainly that nothing holds them. Weaker than the rest of the skill
and honest about being weaker.

## Decision

The third, with the patterns regrouped rather than transcribed.

Fourteen rules in the source collapse to six in
`skill/docbound/references/anti-patterns.md`, numbers 19 to 24, because they are
one disease: the sentence performs instead of informing. Each carries a tell in
the format the file already uses. `skill/docbound/references/style.md` states
the rule and the portability test, and `skill/docbound/SKILL.md` carries two
bullets pointing at both.

`NOTICE.md` attributes the source and says what was changed, which the MIT
licence requires and which also marks where the adaptation stops.

The six READMEs were edited rather than rewritten. Voice was kept; the patterns
were removed.

## Consequences

Nothing enforces any of this. An agent that ignores the standard produces
documents that pass the audit, and the only signal is a person reading them.
That is a real hole and it is the same hole `docs/decisions/0018-no-self-serving-metrics.md`
and `docs/decisions/0026-docbound-does-not-recommend-logic.md` sit in. All three
rules are held by review, and all three were found by reading.

`anti-patterns.md` is now 24 patterns and 200 lines. It is loaded on demand
rather than with the skill, so the cost lands on an agent about to write prose
rather than on every task.

Two existing patterns in that file, 15 and 18, still told an agent to rename an
identifier, which `docs/decisions/0026-docbound-does-not-recommend-logic.md`
stopped this skill from doing. Both now say to record the naming mismatch under
`Still open` instead. That decision missed them.

## What would reverse this

If documents keep arriving with these patterns despite the standard, the
standard is not the mechanism, and the answer is a separate editing pass invoked
after writing rather than more rules in a file nobody re-reads mid-task.
