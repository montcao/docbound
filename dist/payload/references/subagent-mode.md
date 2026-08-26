# Subagent mode

docbound has two modes. **Author mode** is the default: the agent writing the code runs the loop itself, and decisions are recorded at the moment they are made. **Subagent mode** is for a documentation agent invoked after the fact to document code another agent wrote.

The difference is structural, not cosmetic. The skill's thesis is that the *why* is captured when the decision happens. A subagent never had that moment. It has the diff, the code, and whatever the coding agent left behind. So in subagent mode the decision trail is reconstructed, and the whole mode is designed around one risk: **reconstructed reasoning presented as recorded reasoning.** A confident, plausible, wrong Architecture Decision Record (ADR) is worse than no ADR.

## When you are in subagent mode

You are in subagent mode if any of these hold:

- You were invoked to document, review, or write docs for code you did not write in this session.
- The task description names another agent or a prior session as the author.
- The worklog entry's `Agent:` line names a different agent, or the entry has an `Intent` you did not write.

When in doubt, you are in subagent mode. Author mode assumes knowledge you do not have.

## Inputs, in order of trust

1. **The code.** Read it. Derive every factual claim — contracts, boundaries, invariants, must-nots — from what the code does, not from what anyone says it does.
2. **The coding agent's `### Handoff` section** in the worklog entry (`templates/WORKLOG-entry.md`). This is the only source of real *why*. If it exists, its decisions and rejections are what you record. If it does not exist, you have no *why* — only inferences.
3. **Inline comments and docstrings the coder left.** Treat as claims to verify, not facts.
4. **The coding agent's final message or summary.** Use it as a list of places to look. Coding agents overstate what they did and omit what they broke.

If the handoff section is missing, the audit fails on `handoff-present`. That is deliberate: the parent workflow needs to know that the coder skipped its half of the contract, and the fix is upstream, not in your inference.

## Stated vs. inferred

Every claim about *why* falls into one of two classes, and the doc must say which.

**Stated**: traceable to the handoff section, a decision comment in the code, or a prior ADR. Record it as fact.

**Inferred**: your reconstruction from the diff. Record it with the marker `Inferred:` at the start of the sentence, and add a matching line under `Still open` asking the human or the coding agent to confirm. Example:

> Inferred: the retry sleeps before the first attempt because the upstream rate limiter counts the failed call. Confirm with the author.

In ADRs, every option and the decision must cite a source in a `## Sources` section — `handoff`, a `path:symbol` where the reasoning is commented, or `inferred`. An ADR whose only source is `inferred` still gets written (the decision exists in the code whether or not anyone explains it), but its Status is `accepted (unconfirmed)` and the `Still open` list carries it. The `adr-sourced` check enforces the section.

Never upgrade an inference to a statement by rewording it.

## What you may edit in code

Documentation lives inside source files too. In subagent mode you may:

- Write or fix contract docstrings on the public surface.
- Fix or delete comments that no longer match the code.
- Delete commented-out code.
- Fix a TODO that lacks problem, action, or owner — using the handoff or the worklog for the owner.

You may not:

- Rename identifiers, restructure code, or change logic — even where `code-style.md` would call for it. Propose the rename under `Still open` with the current name, the proposed name, and the reason. Naming is the coder's first mechanism; it is not yours.
- Write tests for documented behavior. Note the missing test under `Still open`.
- Change dependency manifests, configuration, or anything outside docs and comments.

The `logic-touched` check compares your diff against the coder's end state with comments and docstrings stripped, and warns if anything else moved.

## The worklog entry

You do not open a new entry. The coding agent's entry is the entry; its `Intent` and `Handoff` are inputs. You:

- Add yourself to the `Agent:` line: `Agent: codex (code) · claude (docs)`.
- Fill `Outcome` with what you documented, what you deleted, which claims are inferred.
- Fill `Still open` with the coder's open items, plus every inference awaiting confirmation, every proposed rename, every missing test.

If there is no entry at all, open one, mark `Intent` as `Reconstructed from the diff:` followed by your best reading, and expect `handoff-present` to fail. Report that upstream.

## Granularity

The principle "docs move in the same step as the code" is violated by construction in this mode — you are the batch. Two mitigations, both belonging to the parent workflow rather than to you:

- Invoke the documentation subagent per commit or per logical change, not once per task. Smaller diffs, fewer inferences.
- Require the coding agent to write the handoff section as it works, not at the end. Its value is the same as the worklog Intent's: written while the alternatives are still in view.

## Blocking, upward

The audit is the definition of done for your run. It is also the definition of done for the parent's task: a failed audit in the documentation subagent means the task is not done, whatever the coding agent reported. Return the audit's exit code and its findings to the parent verbatim. Do not summarize a failure as a success with caveats.

## Invocation contract

The parent should give you:

- The repository root and the base ref (`--base`) for the coder's changes.
- The coder's final commit or tree state (`--since`) so `logic-touched` can separate your edits from theirs.
- The task description the coder received.
- The coder's final message, if any.

Run: `node scripts/audit.mjs --mode subagent --base <ref> --since <coder-commit>`

You return: the list of doc deltas by path, the ADRs written with their source class, the `Still open` list, and the audit result.
