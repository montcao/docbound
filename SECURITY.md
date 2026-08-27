# Security

## Reporting

Report a vulnerability through GitHub's private advisory form on this
repository, under Security, then Report a vulnerability. That reaches the
maintainers without the report being public first.

Please do not open a public issue for something exploitable.

Expect an acknowledgement within a few days. This is a small project and there
is no support contract behind that number.

## What the threat model is

docbound runs inside a coding agent's loop, in a hook that fires after every
file edit, over repositories nobody here has read. Three properties matter more
than they would in a tool a person invokes deliberately.

**Configuration is untrusted input.** `.docbound/config.json` is whatever the
cloned repository carried, and it is parsed automatically. Keys that reach the
prototype chain are refused, and an object whose prototype has been reassigned
is not merged into.

**No input may hang the hook.** The span scanner advances on every iteration,
runs no backtracking-capable pattern, and declines a file over two megabytes
rather than scanning it. The document patterns are anchored against literal
terminators for the same reason.

**Findings carry paths and messages, not file contents.** A hook runs at the
most sensitive moment in a session to be echoing a buffer into a transcript. Two
checks, `todo-shape` and `stale-marker`, quote a truncated line inside their own
message, and that is the whole of the file content that reaches a transcript by
this route.

Reports that demonstrate any of those three failing are the most valuable ones.

## What is out of scope

docbound reads and writes documentation inside a repository root it is handed.
It does not make network requests, it has no dependencies at runtime or for
development, and it executes nothing from the repository it audits.

A repository whose documentation contains something misleading is not a
vulnerability in this tool. Neither is a check that reports a finding you
disagree with; that is a bug, and the issue tracker is the right place.
