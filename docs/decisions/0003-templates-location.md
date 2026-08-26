# 0003. Raise `templates/` out of `references/`

- Date: 2026-08-26
- Status: accepted
- Supersedes: none

## Context

The five document templates sat at `references/templates/`. Two consumers
resolve that path: `scaffold` reads it to create a repository's initial docs,
and `adr` reads `ADR.md` to create a decision record. Both are code, so the path
is an interface, not prose. It is also quoted eleven times across `SKILL.md` and
`references/subagent-mode.md` as the place an agent copies a template from.

`references/` holds prose an agent reads and reasons about — the writing
standard, the code standard, the anti-pattern list, the subagent contract.
Templates are neither read for guidance nor reasoned about; they are copied
verbatim by a script.

## Options

### Leave `references/templates/`

No edits to SKILL.md or the reference files, and no chance of a stale path in a
copy of the skill that someone vendored before this change. Keeps a code-facing
interface nested inside a prose directory, where a future reorganisation of
`references/` moves it by accident.

### Raise it to `templates/`

One directory per kind of thing: `references/` is read, `templates/` is copied,
`scripts/` is executed, `agents/` is invoked. The path `templates/ADR.md` is
shorter, and shorter paths are quoted correctly more often. Costs a rewrite of
every reference to the old path in the same change.

## Decision

Raise it. `skill/docbound/templates/` holds the five templates; `scaffold.mjs`
and the CLI's `adr` command resolve them relative to the skill root, not
relative to `scripts/`. Every mention of `references/templates/` in `SKILL.md`
and `references/subagent-mode.md` was rewritten in the same change.

## Consequences

A skill copy vendored before this change keeps working — it has its own
templates at its own path — but an agent reading a new SKILL.md against an old
payload finds nothing at `templates/`. The `dead-ref` check catches exactly that
case for anyone who audits, since the quoted path would not exist.

## What would reverse this

If a provider's skill loader requires that everything an agent may read sits
under a single directory, `templates/` folds back under `references/` and the
scripts resolve one path deeper.
