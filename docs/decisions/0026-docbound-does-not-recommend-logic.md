# 0026. docbound documents; it does not recommend a change to logic

- Date: 2026-08-27
- Status: accepted
- Supersedes: 0021

## Context

Somewhere in writing a documentation discipline, this project also started
telling people how to write their code.

The skill's own `description` claimed "code-communication standards (clear code
before comments; naming, structure, context, then comments)". Step 3 of the loop
told an agent that code which would surprise a reader wants "first a better
name, then a clearer structure" before a comment, which is an instruction to
rename and restructure somebody's code as part of documenting it.
`skill/docbound/references/style.md` said a comment explaining what a thing is "is a rename
that has not happened yet". And `references/code-style.md` was a code standard
with no documentation in it at all.

Two checks were pure formatting. `line-length` counted columns and
`mixed-indent` compared tabs to spaces. Neither says anything about what a
repository records about itself, and a formatter owns both, does them better,
and does them on save.

The project already knew the rule and applied it to one mode.
`skill/docbound/references/subagent-mode.md` has said from the start: naming is the coder's
first mechanism, it is not yours. That should have been the rule in both modes.

## Options

### Keep the code standard and reword it

Findings become observations, nothing is removed, no public interface changes.
It also leaves `line-length` reporting that your columns are wrong, which is a
recommendation about code however it is phrased. The scope problem gets a new
sentence rather than an answer.

### Remove everything that reads a source file

The strictest line, and the easiest to explain: docbound reads documents. It
also throws away the three checks that read what a *comment* says, and a comment
is documentation that happens to live in a `.go` file. This skill's own spectrum
argues exactly that, from names through comments and docstrings to READMEs, one
continuum. Losing them means docstring drift becomes invisible, which is the
thing the discipline exists to catch.

### Draw the line at logic

A recommendation about documentation is the job. A recommendation about logic,
naming, structure, or formatting is not. Comments and docstrings stay in scope
because they are documentation; columns and indentation leave because they are
not.

## Decision

The third. `line-length` and `mixed-indent` are removed, along with
`references/code-style.md`.

This supersedes `docs/decisions/0021-line-length-needs-a-convention.md`, which
narrowed `line-length` to a width the repository had configured. That was the
right answer to the wrong question: the check had no business existing.

`todo-shape`, `comment-sentence`, and `restating-comments` remain. They are the
only three checks that open a source file, and each reads what a comment *says*,
never what the code does.

`skill/docbound/SKILL.md` gained a section stating the boundary before anything
else in the loop, and step 3 now says to record why surprising code is that way
rather than to rename it. Where a name is misleading, the instruction is to
write what the thing does and put the mismatch under `Still open`, with the
current name and what it appears to promise.

Removing a check ID is a breaking change to a public interface, and this
project's rules require a deprecation path. The path here needs no code: a
waiver naming a check that no longer exists is parsed, matches nothing, and
dismisses nothing. A repository carrying `waiver: line-length ...` keeps working
and that line becomes inert.

One consequence surfaced while making the change, and is part of the decision.
A record naming a path that is later deleted can never be fixed, because its
body is immutable, and the worklog has the same problem for the same reason.
`dead-ref` now reports a missing path in either of those two documents as a
warning rather than an error, which is the exemption `stale-marker` already
makes for exactly those two.

## Consequences

Twenty-two checks rather than twenty-four. Repositories relying on docbound for
line width or indent consistency lose it and should adopt a formatter, which is
a better answer than a warning.

The boundary is stated where an agent reads it first, which matters more than
the removals: the checks were the symptom, and the instructions to rename and
restructure were the disease.

Nothing enforces this. A check cannot tell a recommendation about a document
from a recommendation about code, because both are English. It is held by
review, the way ADR 0018's rule about self-serving metrics is held, and it is
written down for the same reason: both instances of that rule were found by
reading.

`skill/docbound/references/style.md` no longer argues for renaming. It now says a name carries
more per character than a sentence about it, which is a reason to write fewer
comments rather than a reason to change a name.

## What would reverse this

If repositories start writing waivers against `comment-sentence` and
`restating-comments` at the rate they wrote them against nothing else, those two
are being read as code review rather than as documentation review, and the line
is in the wrong place by two checks.
