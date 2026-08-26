# <module name>

<One sentence: what this directory holds and what it is used for. "Owns" means it is the single authority for it.>

Status: <active | experimental | deprecated | internal — delete the line if the root README status applies>
Owner: <delete the line if the root README owner applies>

## Start here

<Which files to read first, and which of them are the public surface other modules call. Two to four lines. This is orientation, not `ls`.>

- `<path>` — <why read it first / this is the API>

## Contract

<What callers can rely on. Point at the public surface: `<path>:<symbol>`. Detail belongs in the docstrings on those symbols; this section names them and states what holds across all of them.>

## Must not

<The forbidden list. Each: what, why, what enforces it if anything does. The most valuable section in the file.>

- <must not — because <reason> — enforced by `<path>` / by convention>

## Use

```
<the simplest correct usage, or the command to exercise this module. Delete if the contract section makes it obvious.>
```

## Depends on

<Other modules or external systems this one calls. What breaks here if they change.>

## Depended on by

<Who calls this. What breaks there if this changes.>

## Decisions

<Local decisions: real choices inside this module, cheap to reverse. Structural ones go in `docs/decisions/`.>

| Decision | Rejected | Why | Reverse if |
|---|---|---|---|
| <chosen> | <alternative> | <reason> | <condition> |

## Gotchas

- <surprise — `<path>:<symbol>`>

## Known gaps

- <gap — condition, consequence, why not fixed>
