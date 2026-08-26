# Code and comment style

The code is the primary documentation. Everything in `style.md` about docs assumes the code underneath is already communicating its logic; if it is not, no amount of prose compensates, and the prose will drift from the code anyway. This file is the standard for the code itself.

This standard is a distillation of academic guidance on scientific-software communication and the conventions shared by the major language style guides. It is vendor-agnostic and language-agnostic: where the repository or the language community has a convention, that convention wins.

## Conventions beat preferences

Style is a convention, and its value is consistency. If the repository already has a style — a linter config, a formatter, an `.editorconfig`, a CONTRIBUTING or STYLE doc, or simply a consistent existing codebase — follow it exactly, even where it disagrees with this file. Do not reformat code you were not asked to change. Do not introduce a second convention. If the existing convention has a real problem, that is a decision record, not a unilateral fix.

Only where the repository has no convention does this file decide.

## Audience

The reader is a human who will do something useful with the code: extend it, debug it, call it, or borrow a piece of it for something you did not anticipate. Write for that person. The logic is the innovation; the names, layout, and structure should be unremarkable and predictable so the logic is the only thing the reader has to think about.

## Clear code before comments

Four mechanisms communicate logic, in order of preference: naming, structure, context, comments. Reach for the earlier ones first. A comment that exists because a name was bad or the structure was tangled is a repair on the wrong layer, and it will go stale when the code changes and the comment does not.

## 1. Naming

Call things what they are.

- Variables and classes are nouns. Functions and methods are verbs.
- Names are descriptive and pronounceable. Avoid abbreviations unless they are self-explanatory in the domain (`url`, `id`, `rho` in a fluid solver).
- Name length is proportional to scope. A loop index can be `i`; a module-level setting cannot.
- When a constraint forces an abbreviation (a fixed-width format, an external API's field names), define it once in a comment in plain English where it is introduced.
- Follow the language's typographic convention for constants, variables, types, functions, and modules. Where the repository has none, use the language community's published default (PEP 8 for Python, gofmt for Go, the language's own or its most widely adopted style guide for C++ and Java, tidyverse for R, the Julia manual for Julia). Whatever is chosen, it is used for the whole repository.

A comment whose only job is to say what an identifier means is a rename that has not happened yet.

## 2. Structure

Structure vertically, not horizontally. Readers scan columns; the interesting part of a statement is usually at its right end, and a line that runs off the screen hides it.

- Respect the line length the repository sets. Where it sets none, 80 columns.
- One statement per line.
- Indent with the language's convention (spaces for most; tabs for Go and Makefiles). Never mix tabs and spaces in one file.
- Indent once per block. Indent a continuation line once.
- When breaking a line at an operator, put the operator at the start of the new line, not the end of the old one.

Group related things and let alignment show the grouping. An argument list is one concept; if it fits on one line, keep it there. If it does not, break it so the whole list reads as one block — and choose a layout that survives refactoring. Alignment that depends on the length of the function name is destroyed by renaming the function and will be maintained by nobody.

Spacing follows English: one space after a comma, none before; one space either side of assignment and comparison operators; arithmetic operators either always spaced or never spaced within a file, not mixed.

## 3. Context

Use the surrounding context to avoid redundancy. A caught exception in a `catch` block does not need "Exception" in its name — the block already says that. What it needs is what went wrong: `invalidArgument`, `dimensionMismatch`. The same applies to fields inside a class named for the class, to parameters restating the function name, and to comments that repeat the name of the thing they annotate.

## 4. Comments

A comment adds only what naming, structure, and context cannot express: why the code is here, why it is shaped this way, what constraint or bug it works around, what would be wrong to change. Comments are the last thing a reader looks at, when everything else has already failed them — so a comment that merely restates the line beneath it has spent the reader's last resort on nothing.

- Comments are complete sentences with a capital letter and terminal punctuation.
- A comment describes a problem, a reason, or a constraint. Not a paraphrase of the code.
- A `TODO` or `FIXME` states the problem, what needs to be done, and who or what owns it — a person, a ticket, or a worklog item. `TODO: fix this` is noise. `TODO(#412): replace the Adams-Bashforth step with a predictor-corrector; shocks form at CFL > 0.5` is a comment someone can act on. Under this skill, every TODO left in code also appears under `Still open` in the worklog entry, so the human sees it without grepping.
- Comments require maintenance exactly like code. A comment that no longer matches the code is worse than no comment: it is documentation that lies. When you change code, read its comments and fix or delete them in the same edit.
- Commented-out code is deleted, not kept. Version control has it.

## API docstrings

Contract docstrings on the public surface (see `style.md`) are the one place a per-function comment is expected. Use the language's docstring convention (PEP 257 for Python, JSDoc, godoc, rustdoc, Javadoc) so tooling can render them, and keep the same rule: arguments, returns, errors, restrictions, gotchas. Not a restatement of the signature.

## What this means in the loop

- During **Orient**, identify the repository's style convention (linter and formatter config, `.editorconfig`, style docs, the existing code) before writing any code. Note it in the worklog entry's `Unknowns` if it is unclear.
- During **Work**, when tempted to write a comment, first try a rename, then a restructure. Write the comment only if both fail.
- During **Reconcile**, re-read every comment adjacent to code you changed. Fix or delete the ones that no longer hold. Confirm every TODO you left has a worklog counterpart.

The audit's `todo-shape`, `comment-sentence`, `line-length`, and `mixed-indent` checks are warnings derived from this file. They are warnings because conventions vary; they are on the record because drift from convention is how a codebase stops communicating.
