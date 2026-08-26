# Providers

docbound ships support for two harnesses. Both were verified against the harness
itself — its own bundled files, not a description of them.

| Provider | Skill lands at | Hook manifest | How it was verified |
|---|---|---|---|
| Claude Code | `.claude/skills/docbound` | `.claude/settings.json` | Skills directory and settings file present on disk; the hook schema matches a published plugin's own hooks file, and the events were observed firing while running under Claude Code |
| Cursor | `.cursor/skills/docbound` | `.cursor/hooks.json` | Paths, schema version, event names, and the exit-code-2 blocking contract all read out of the `create-skill` and `create-hook` skills Cursor itself ships |

Anything else is a candidate, and candidates do not ship.

## Why a candidate does not ship

A wrong provider entry fails silently and expensively. The payload lands where
the harness never reads, the install prints success, the skill never loads, and
the user has no error to search for. A missing provider is a feature request. A
wrong one is a bug report that reads as a false claim, and a supported-list that
cannot be trusted costs more than the entries were worth.

One candidate would also have written into `.github/`, a directory that holds
workflows, `CODEOWNERS`, and Dependabot configuration. A tool that writes there
on a guess deserves the review it would get.

## What each candidate still needs

An entry moves into `cli/providers.mjs` when someone can answer all four
questions from the harness itself, and records the answers in the entry's
`verified` field.

1. Where does the harness read a **project-level** skill from? Not a personal
   one — docbound is installed per repository.
2. What file holds its hook manifest, and what is that file's schema?
3. What are the event names for "a file was edited" and "the agent is stopping"?
4. What does a hook do to block a stop? The gate depends on a specific answer;
   for Claude Code and Cursor it is exit code 2.

### Codex

Not shipped. An earlier entry placed the payload at `.agents/skills/docbound`
with a hook file at `.codex/hooks.json`, and both look wrong. The `skill-creator`
that Codex ships says skills belong in `$CODEX_HOME/skills`, or `~/.codex/skills`
when that variable is unset, and describes no project-level location at all.
Codex skills also carry an `agents/openai.yaml` next to `SKILL.md`, which the
docbound payload does not produce.

Open question 1, and question 2 with it: a hooks file found in a published
plugin uses the Claude Code shape — `SessionStart`, a `matcher`, and
`{ type, command }` entries — not the lowercase event names the removed entry
used.

### GitHub Copilot

Not shipped, and the entry was invented. `.github/` in real projects holds
`copilot-instructions.md`, workflows, issue templates, and funding metadata. No
project seen puts skills or hooks under `.github/skills/` or `.github/hooks/`.

Open questions 1 through 4. A repository-level instructions file is a different
mechanism from a skill directory, and docbound would have to decide which of its
content belongs in one before this is an entry at all.

### Gemini CLI

Not shipped. No evidence was gathered for the path, the hook file, or the event
names. Open questions 1 through 4.

### opencode

Not shipped. Same position as Gemini CLI. Open questions 1 through 4.

### The generic Agent Skills layout

Not shipped as a provider. `.agents/skills/` is a convention rather than a
harness, so there is nothing to verify it against, and installing to a path no
tool on the machine reads is the failure this file exists to prevent.

Hand-vendoring is served instead by `dist/payload/`, which is the skill with no
directory wrapped around it:

```
cp -R dist/payload /wherever/your/tool/reads/skills/docbound
```

That makes no claim about where any harness looks, which is the honest position
when nobody has checked.

## Adding a provider

`docs/DEVELOP.md` has the procedure. In short: answer the four questions from
the harness, add the entry with its evidence, add it to the install matrix in
`tests/cli.test.mjs`, rebuild, and delete that candidate's section here.

The test can only assert that the payload lands where the entry says. It cannot
assert that the entry is right about the world — only the harness can, which is
how the Cursor entry was found to be wrong after it had already shipped once.
