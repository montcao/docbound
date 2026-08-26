# Wiring the documentation subagent

docbound has two modes. In **author mode** the agent writing the code runs the
loop itself and records decisions at the moment it makes them. In **subagent
mode** a documentation agent runs after the fact, over code someone else wrote.

The difference is structural. The skill's thesis is that the *why* is captured
when the decision happens; a subagent never had that moment. What it has is the
diff, the code, and whatever the coding agent left behind. The full contract is
`skill/docbound/references/subagent-mode.md`; this file is the wiring.

## The invocation contract

The parent gives the documenter four things:

| Input | Flag | Why it is needed |
|---|---|---|
| Repository root | `--root` | Nothing is derived from the working directory |
| The coder's base ref | `--base` | Which commits are the coder's work |
| The coder's final commit | `--since` | Separates the coder's edits from the documenter's, which is what `logic-touched` compares against |
| The task description the coder received | prose | The stated goal, to check the code against |

The documenter returns four things, and nothing else: doc deltas by path;
decision records written, each with its source class; the `Still open` list; and
the audit's exit code and findings verbatim. A failed audit is returned as a
failure, never as a success with caveats.

## Claude Code

`skill/docbound/agents/docbound-documenter.md` is a subagent definition. It
arrives in a project through any of the install paths — the plugin puts it at
`plugin/agents/docbound-documenter.md`, and `npx docbound install` puts it
inside the skill payload, where Claude Code discovers it.

A parent agent invokes it after a coding task:

```
Use the docbound-documenter subagent to document the work on this branch.
Repository root: the current directory.
Base ref: main.
The coder's final commit: 9f2c1ab.
The task it was given: "add retry with backoff to the upstream client".
```

The subagent runs its own loop and finishes with:

```
node .claude/skills/docbound/scripts/audit.mjs --mode subagent --base main --since 9f2c1ab
```

The `Stop` hook installed with the skill runs the author-mode audit on the
parent, so a parent that ends a turn with the documenter's findings unresolved is
blocked as well. That is the intended shape: the audit is the definition of done
for the documenter's run *and* for the parent's task.

## Codex

Codex discovers the agent definition nested in the skill payload at
`.agents/skills/docbound/agents/`. Invoke it the same way, and approve the hook
once through the hooks command — Codex requires an explicit approval before a
hook in `.codex/hooks.json` will run.

Without a subagent mechanism, the same result comes from a second session with
the skill loaded and this instruction:

```
You are in subagent mode. Read .agents/skills/docbound/references/subagent-mode.md
first. Document the work between main and 9f2c1ab. You did not write this code.
Run the audit with --mode subagent --base main --since 9f2c1ab and return its
result verbatim.
```

## Why `handoff-present` failing is the coder's bug

`handoff-present` is an error, and a documentation agent cannot fix it.

That is deliberate. The handoff section is the coding agent's half of a
contract: written as it works, while the alternatives are still in view, it says
what was chosen over what, what was left unsettled, and what was deliberately
left out. It is the only source of *stated* reasoning the documenter ever gets.

If it is missing, the documenter has inference and nothing else. Every reason it
records is a reconstruction, and the specific failure the mode exists to prevent
is a confident, plausible, wrong decision record. So the audit refuses to pass,
the documenter reports the failure upward, and the parent workflow learns that
the coder skipped its half.

The fix is in the coding agent's prompt, not in the documenter's inference:

> If a documentation subagent will run after you, write the `### Handoff`
> section of your worklog entry as you work.

A documenter that waives `handoff-present` to get a green run has converted a
structural problem into a silent one.

## Granularity

"Docs move in the same step as the code" is violated by construction here — the
subagent *is* the batch. Two mitigations, both the parent's to apply:

- Invoke the documenter per commit or per logical change, not once per task.
  Smaller diffs, fewer inferences.
- Require the handoff to be written during the work rather than at the end. Its
  value is the same as the worklog Intent's, and for the same reason.

## Where to go next

- `skill/docbound/references/subagent-mode.md` — the contract itself
- `docs/checks.md` — the four checks this mode adds, with waiver examples
