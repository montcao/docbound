# <project name>

<One sentence: what this is and what it is used for. No adjectives.>

Status: <active | experimental | deprecated — and what that means for a reader>
Owner: <person, team, or channel a reader should contact>

## Run

```
<the command that starts it, or the entry point>
```

<Prerequisites that are not obvious: required env vars, services that must be up, versions that matter. Omit anything a competent engineer would assume.>

## Test

```
<the command that runs the tests>
```

## Debug

<How to see what it is doing: log location, verbose flag, a local-only mode. One to three lines. Delete the section if there is nothing non-obvious.>

## Release

<How a change reaches users. Delete the section if this is not released.>

## Shape

<Two to five sentences: the top-level packages and how they relate. Point at directories. Detail lives in `docs/ARCHITECTURE.md`; this is the map, not the territory.>

## Invariants

<Things that must always be true across the whole system. If a change would violate one, it needs an Architecture Decision Record (ADR) in `docs/decisions/` first.>

- <invariant — `<path>` that enforces it>

## Where to go next

- `docs/ARCHITECTURE.md` — boundaries, data flow, seams
- `docs/decisions/` — why things are shaped this way
- `docs/WORKLOG.md` — what has changed recently and what is still open
- <module>/README.md — per-module contract and must-not list
- <External docs, if any live elsewhere: link, do not copy. Delete the line if none.>
