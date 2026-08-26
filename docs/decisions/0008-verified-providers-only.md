# 0008. Ship a provider only when it is verified against its harness

- Date: 2026-08-26
- Status: accepted
- Supersedes: none

## Context

The provider table shipped seven entries. Two were checked against the harness
they describe. The rest were written from inference about conventions, and
checking them against harnesses present on the development machine showed that
inference had been wrong in every case it could be tested:

- The Cursor entry placed the payload in the generic agent-skills directory.
  Cursor reads project skills from its own directory, so every Cursor install
  had written the skill somewhere Cursor never looks.
- The Codex entry did the same, and its hook manifest used event names from a
  different harness's vocabulary. Codex's own skill-creator describes only a
  location under the user's home directory and no project-level one at all.
- The GitHub Copilot entry was invented outright. No project examined puts
  skills or hooks under the GitHub directory; that directory holds instructions
  files, workflows, and issue templates.

The failure mode is what makes this worth a record. A wrong entry does not
error. The payload copies successfully, the install prints success, the harness
never reads the path, and the skill silently never loads. The user has no
message to search for and no reason to suspect the tool rather than themselves.

One entry compounded it. Writing into the GitHub directory means writing beside
workflow definitions and access configuration, on a guess, in a tool a user
installed to manage documentation.

This repository is about to be public. A supported-providers list is read as a
promise, and the first thing a reader does is test the entry that covers them.

## Options

### Ship every entry, marked with a confidence level

Widest apparent support, and it keeps the research visible in the code. It also
publishes a list where some entries work and some quietly do not, and a
confidence label in a source file is not seen by the person running `install`.
Support that has to be qualified is not support.

### Ship only what has been verified, and document the rest

Two providers instead of seven. Anyone else installs by hand from a payload that
carries no path claim, which is honest about what is known. Costs apparent
reach, and costs a contributor with a harness in front of them a little work
before their provider is added — which is the work that was skipped.

## Decision

An entry ships only when four questions have been answered from the harness
itself — its bundled documentation, the skills it ships, or its files on disk —
and the entry records that evidence in a `verified` field:

1. Where does it read a project-level skill from?
2. What file holds its hook manifest, and what is that file's schema?
3. What are its event names for a file edit and for the agent stopping?
4. What does a hook do to block a stop?

Claude Code and Cursor meet that bar. Codex, Gemini CLI, GitHub Copilot,
opencode, and the generic agent-skills layout do not, and are documented as
candidates in `docs/providers.md` with what each still needs.

`install` with no supported harness detected refuses and names the options
rather than falling back to a path nobody checked. The build removes its whole
output tree before writing, so an entry dropped from the table stops shipping
rather than lingering in the package.

## Consequences

docbound claims less than it did and everything it claims can be checked. A
harness with no entry is a documented gap rather than a broken install, and the
work to close one is bounded and written down.

The test suite cannot enforce this. `tests/cli.test.mjs` asserts the payload
lands where the entry says, which is silent about whether the entry is right
about the world. Only a harness settles that, which is why the evidence lives in
the entry where a reviewer reads it.

Earlier decision records name provider paths this decision removed. They are
archives of what was believed when they were written and are left intact; the
`dead-ref` findings against them are waived in the worklog entry that made this
change, with that reason.

## What would reverse this

If a harness publishes a stable, versioned specification of where skills and
hooks belong, an entry sourced from that specification is verified without the
harness being present, and the four questions are answered by citing it.

Nothing reverses shipping an unverified entry. If that becomes tempting because
a provider is popular, the honest response is a candidate section in
`docs/providers.md` and an issue asking someone with the harness to answer the
four questions.
