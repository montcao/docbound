# 0020. Two directives a document can carry, for what no heuristic can decide

- Date: 2026-08-27
- Status: accepted
- Supersedes: none

## Context

Two findings from a real repository could not be resolved by making a check
smarter, because the information the check needed was not in the text.

<!-- docbound-ignore-start -->
A doc describing a Go package wrote `internal/httpapi` and `cmd/search-api`.
Both are correct, relative to that package rather than to the repository root,
which is how that package's own tooling writes them. `resolves` in
`skill/docbound/scripts/lib/refs.mjs` tried the root and the doc's own
directory, found neither, and reported two blocking dead references against a
doc that was accurate.

A repository documenting its commit convention wrote ``` `<type>(optional-scope):
<summary>` ```. `template-residue` reported it as an unfilled placeholder. It
has the same shape as one; the templates this project ships write `<path>` and
`<module name>` in exactly that form. Nothing distinguishes a format
specification from a placeholder nobody filled in, and both readings are
defensible.
<!-- docbound-ignore-end -->

## Options

### Guess harder

Both cases have candidate signals: a placeholder alone in a code span, a
placeholder next to the word "format". Every one of them is wrong on some
document, and a blocking check that is wrong on some documents is a check
somebody switches off. The failure is silent in both directions.

### Configuration

`.docbound/config.json` could carry a per-file anchor and a per-file exemption.
It puts the fact about a document somewhere other than the document, which is
the duplication this project's sixth principle is about, and it goes stale when
the file is renamed.

### The document says so

Two HTML comments, invisible in every Markdown renderer:

    <!-- docbound-root: services/search-api -->
    <!-- docbound-ignore -->
    <!-- docbound-ignore-start --> ... <!-- docbound-ignore-end -->

The fact lives with the thing it is about, moves with it, and is visible to the
next reader of the file rather than only to whoever opens the config.

## Decision

`docRoot` in `skill/docbound/scripts/lib/refs.mjs` reads the anchor, and
`resolves` tries it as a third base. `stripIgnored` in
`skill/docbound/scripts/lib/text.mjs` blanks ignored regions, and `dead-ref` and
`template-residue` read through it.

Blanking rather than deleting, so every line number still matches the file and a
finding points where a reader can open it. Both patterns use lazy repetition
against a literal terminator with no alternation inside it, because they run
over every doc after every edit and a pattern that can backtrack is a hang.

`tests/fixtures/real-world-shapes` pins both.

## Consequences

A repository can silence any doc check on any region, which is a mute button
with no reason attached. It is a visible one: it sits in the file, in a diff, in
review, unlike a waiver that expires with the worklog entry it was written in.

Two more things to know about docbound. They are documented in
`docs/checks.md`, and neither is needed until a check is wrong.

`docbound-ignore` is deliberately not honoured by the source-file checks. A
comment marker that turns off a check inside code is the shape that ends up
sprinkled through a codebase, and none of the source checks block.

## What would reverse this

If `docbound-ignore` starts appearing more than about once per repository, the
check it is silencing is mistuned and the fix is that check, not more markers.

If a monorepo needs the anchor on more than a handful of docs, the right unit is
the package rather than the file, and this becomes a per-directory setting.

## Corrections

- t=1787878318: the examples in Context and Decision originally used a service and
  directory name taken from a third-party repository this project was tested
  against. They are replaced with invented ones. The reasoning, the options, and
  the decision are unchanged, and the edit carries a waiver in the worklog entry
  that made it.
