# 0016. Write a span scanner rather than depend on a parser

- Date: 2026-08-27
- Status: accepted
- Supersedes: none

## Context

Four checks read source with regular expressions, and each is approximate in a
way that has already cost something.

`logic-touched` strips comments with a regex, so a comment marker inside a
string literal is misread. That is listed as a known gap in
`docs/ARCHITECTURE.md`, and the check exists to stop a documentation subagent
silently editing logic, which makes it a poor place for a guess.
`comment-sentence` reads line by line, so the continuation of a wrapped sentence
reads as a fragment; it is the most restated open item this project has.
`restating-comments` compares token overlap against whichever line sits nearby.
And `dead-ref` splits a reference at the colon and discards the symbol, so
`skill/docbound/references/style.md` asks for a reference naming a symbol while
the audit verifies only that the file exists.

Every one of those wants the same capability, and it is smaller than it looks:
knowing what kind of span a character sits in. Code, line comment, block
comment, or string.

That is a lexer. Tree-sitter builds a concrete syntax tree with error recovery
and incremental reparsing because editors need one. Nothing here does. No check
walks a tree, asks for a parent node, or cares about precedence.

## Options

### Depend on tree-sitter

Correct where a hand-written scanner is not: interpolated strings, regex
literals in JavaScript, heredocs, JSX. Someone else maintains the grammars.

The cost lands in three places. A native module needs a compiler on the install
machine, and the WASM build needs a runtime plus a grammar file per language for
roughly thirty-five extensions. `cp -R dist/payload` stops being an install
path, because a payload that needs `node_modules` cannot be copied. And a
finding starts depending on what a machine has installed, so the same repository
audits differently in two places, which is the property the fixtures exist to
prevent.

### Keep the regular expressions

No work and no new surface. Leaves a check that guards against logic edits
guessing about string literals, and leaves the style guide asking for a
reference nothing verifies.

### A span scanner with a per-language delimiter table

A state machine over the text plus a small table per language. This is how
`tokei` and `cloc` distinguish code from comments, and they are accurate enough
that nobody argues with their numbers. No dependency, so every install path
survives and every machine agrees.

It is wrong on interpolated strings, regex literals, heredocs, and JSX. The
checks it feeds are warnings, so the bar is being better than a regex rather
than being right.

## Decision

Write the scanner.

It answers two questions and no others: what kind of span is this character in,
and what names are defined in this file. A check needing more than that needs a
real parser, and that is a separate optional package with its own check IDs
rather than a flag that changes what an existing check reports.

The rule that keeps the two apart: **an optional dependency may add checks; it
may never change what an existing check reports.** A check that answers
differently depending on what is installed is worse than one that is
consistently approximate, because nobody can tell which answer they are looking
at.

A language with no table entry falls back to the current line-based behaviour.
That keeps the result a function of the file extension, which is in the
repository, rather than of the machine.

Two properties are requirements rather than polish, because this runs from a
hook after every file edit over source nobody here has read. Every iteration
advances, so no input loops forever. The scanner compares strings at an index
and runs no backtracking-capable pattern over untrusted text, so no input makes
it hang. Input above a size cap is declined rather than scanned, and the caller
falls back.

## Consequences

Around five hundred lines to maintain, and a table entry per language. That is
the maintenance the dependency would have absorbed, and it is the price of every
install path continuing to work.

The scanner will be wrong on JSX and on regex literals. Both are warnings, both
are documented, and neither is worse than the regex being replaced.

Landing it alone, with nothing reading it, means the audit behaves identically
and every fixture keeps its expectations. Each check moved onto it afterwards is
its own change, and every difference in output is a new fixture rather than a
number that quietly moved.

The masked-code representation keeps offsets, so a pattern run over it reports
line numbers that match the original file. Findings stay navigable, which is
most of what makes them worth reading.

## What would reverse this

If the table passes roughly twenty languages, or if entries start needing
conditional logic rather than delimiters, it has become a parser by increments
and the honest move is the optional package with tree-sitter in it.

If a check that needs real structure turns out to be worth blocking on, a
scanner cannot supply it, and that check is the argument for the dependency
rather than for extending this.
