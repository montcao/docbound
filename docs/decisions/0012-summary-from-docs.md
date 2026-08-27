# 0012. Answer "what is this project" from the docs, never from the source

- Date: 2026-08-26
- Status: superseded by 0017
- Supersedes: none

## Context

The failure this project exists for is not a single forgotten decision. It is
scale. An agent builds a feature, spawns more agents, and the repository grows
faster than anyone can hold in their head, because most of it was not typed by
a person. The question that follows is "what does this thing do now", and it
gets asked of an agent.

Answering it from source costs a re-read of the tree, which is slow, consumes
most of a context window, and is paid again on every asking. The answer is also
worse than it looks. Source contains what the code does. The reasoning was never
in it, so a summary reconstructed from code recovers the what and quietly drops
the why, which is the half that was expensive to produce and impossible to
recover later.

Meanwhile this project already maintains exactly the material that question
wants, and maintains it under a check that fails when it goes stale: what each
module owns and must not do, every decision with its reversal condition, and a
worklog of intent and outcome. Against the source it is a rounding error.

The loop's first step already says to read those files. It says it as a list of
files to open by hand, which makes the cheap path the effortful one.

## Options

### Leave Orient as a reading list

Nothing to build, and it works for someone who follows instructions carefully.
It also asks an agent to open six files and decide what matters in each, which
costs more than reading one assembled answer and produces a different result
every time.

### Generate the summary from source, with the docs as a supplement

Independent of whether anyone kept the docs current, which is a real advantage
on a repository that has not adopted the discipline. It also reintroduces the
whole cost the command exists to avoid, and reintroduces the reconstruction
problem: the parts it derives from code carry no why, and nothing in the output
would distinguish those from the parts that do.

### Assemble it from documentation only

Cheap, and every claim in it traces to a document that the audit keeps true. It
is worthless on a repository with no documentation, which is a real limit and
one the command can state plainly rather than paper over.

## Decision

`skill/docbound/scripts/summary.mjs` assembles an orientation from the root
README, `docs/ARCHITECTURE.md`, the module READMEs, the decision records, and
the worklog. It opens no source file. `docbound summary` is the pass-through,
as `audit` and `scaffold` already are, and step 1 of the loop names it.

The output ends with what it cost and what the alternative would have cost,
measured rather than asserted. A claim about token economics that cannot be
checked by the person reading it is marketing.

`--open` gives the unfinished work across every entry, deduplicated, which is
the other question a returning reader asks. `--json` gives the same content as
data for a caller that wants to select from it.

On a repository with nothing to read, the summary says so and points at
`scaffold`. Padding it would make an empty documentation set look like a
documented project, which is the failure mode this whole tool is arguing
against.

## Consequences

The summary is exactly as good as the documentation underneath it, and there is
no fallback that hides a bad one. That is intended, and it makes the command a
second signal about documentation health alongside the audit: a thin summary of
a large repository is a finding.

Everything reported is already covered by a check. Paths in it are held by
`dead-ref`, placeholders by `template-residue`, and staleness by `doc-coverage`,
so the summary inherits its accuracy rather than asserting it separately.

A reader who wants to know how something is implemented still has to read the
code. This answers what exists and why, not how.

The token figures are estimates at four characters per token, and the output
says so. Build output and Markdown are excluded from the source count, because
counting a payload this project copies three times would inflate the ratio the
figure exists to report honestly.

## What would reverse this

If summaries start being wrong in a way readers do not catch, the problem is
that documentation drifted while the checks passed, and the answer is a check
that closes that gap rather than a summary that reads source to compensate.

If a repository routinely produces a useful summary while its audit fails, the
two are measuring different things and the audit is the one to revisit.
