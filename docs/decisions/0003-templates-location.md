# 0003. Raise `templates/` out of `references/`

- Date: 2026-08-26
- Status: accepted
- Supersedes: none

## Context

The five document templates sat one level down, inside the reference directory.
Two consumers resolve that path: `scaffold` reads it to create a repository's
initial docs, and `adr` reads `skill/docbound/templates/ADR.md` to create a
decision record. Both are code, so the path is an interface, not prose. It is
also quoted eleven times across `skill/docbound/SKILL.md` and
`skill/docbound/references/subagent-mode.md` as the place an agent copies a
template from.

`references/` holds prose an agent reads and reasons about — the writing
standard, the code standard, the anti-pattern list, the subagent contract.
Templates are neither read for guidance nor reasoned about; they are copied
verbatim by a script.

## Options

### Leave the templates inside the reference directory

No edits to the skill text or the reference files, and no chance of a stale path
in a copy of the skill that someone vendored before this change. Keeps a
code-facing interface nested inside a prose directory, where a future
reorganisation of the reference files moves it by accident.

### Raise it to `templates/`

One directory per kind of thing inside the payload: references are read,
templates are copied, scripts are executed, agents are invoked. The path
`skill/docbound/templates/ADR.md` is one directory shorter, and shorter paths
are quoted correctly more often. Costs a rewrite of every reference to the old
path in the same change.

## Decision

Raise it. `skill/docbound/templates/` holds the five templates;
`skill/docbound/scripts/scaffold.mjs` and the CLI's `adr` command resolve them
relative to the skill root rather than relative to the scripts directory. Every
mention of the old path in `skill/docbound/SKILL.md` and
`skill/docbound/references/subagent-mode.md` was rewritten in the same change.

## Consequences

A skill copy vendored before this change keeps working — it has its own
templates at its own path — but an agent reading new skill text against an old
payload finds nothing where the templates are said to be. The `dead-ref` check
catches exactly that case for anyone who audits, since the quoted path would not
exist.

## What would reverse this

If a provider's skill loader requires that everything an agent may read sits
under a single directory, the templates fold back under the reference directory
and the scripts resolve one path deeper.
