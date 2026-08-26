# 0010. Mermaid for the architecture diagram, checked against real paths

- Date: 2026-08-26
- Status: accepted
- Supersedes: none

## Context

`docs/ARCHITECTURE.md` describes components, seams, and invariants in prose. A
reader arriving cold gets the shape faster from a picture, and the taxonomy in
`skill/docbound/SKILL.md` gives every other kind of information a home while
giving the picture none.

Adding a place to draw one is the easy half. The hard half is that a diagram is
the artifact in a repository most likely to be stale and least likely to be
noticed: it is read first, trusted most, and checked by nobody. A rename reaches
every sentence through search-and-replace and reaches none of the boxes.

## Options

### The notation

**Mermaid** renders natively on GitHub, GitLab, and most editors with no
toolchain, is plain text inside a fenced block, and diffs line by line.

**D2** has a better layout engine and a cleaner language, and needs a binary to
render. **PlantUML** has the richest notation for architecture and needs Java or
a render server. **Graphviz** has the best graph engine of the three and needs a
binary. All three produce a picture that only exists where the toolchain does.

**ASCII** needs nothing at all and is unreadable past four boxes, and nobody
maintains it.

### What draws it

**Generate the diagram from the code.** No staleness, because it is derived.
Also no value: an inferred import graph of a real codebase is hundreds of nodes,
and what makes ARCHITECTURE worth reading is the must-not list and the
load-bearing seams, neither of which is inferable. This skill already names the
failure — a README that is `ls` with prose — and a generated call graph is that
at architecture scale. Reliable inference across languages also needs real
parsers, which is a dependency this project does not have.

**Seed the boxes, let the author draw the edges.** `scaffold` already discovers
the top-level directories holding source, because that is how it decides which
directories get a module README. Emitting those as nodes costs nothing and
claims nothing.

## Decision

Mermaid, because it renders where people read code and needs nothing installed.
A diagram that only renders on the author's machine is a diagram nobody reads.

`scaffold` seeds the block with the top-level source directories and stops
there. The arrows and their labels are the author's, because they are the part
that carries meaning.

A new check, `diagram-refs`, at error level: a node label that names a path must
name a path that exists. It reads only path-shaped tokens — a file with a known
extension, or a directory with a trailing slash — so read/write and Node.js stay
prose. That rule doubles as the convention the template demonstrates.

The check is an error rather than a warning because it is the same defect class
as `dead-ref`, which is also an error, and because a diagram that has quietly
stopped being true is worse than a paragraph that has: the reader believes it
faster.

## Consequences

A repository that draws a diagram has to keep it true, and renaming a package
now fails the audit until the picture follows. That is the point, and it is also
a new way for the audit to block work that a user may not have expected when
they drew a box.

`diagram-refs` and `dead-ref` disagree about one token shape. A trailing-slash
directory like `worker/` is a path inside a diagram and is skipped in prose,
because stripping the slash leaves a bare word and a bare word in a sentence is
usually a symbol. The asymmetry is documented in
`skill/docbound/scripts/lib/refs.mjs`, and it means a dead `worker/` in a
paragraph still goes uncaught.

The check reads every fenced Mermaid block in every doc, so a diagram in a
module README is held to the same standard as the one in ARCHITECTURE.

## What would reverse this

If Mermaid's renderers diverge enough that a block valid on one host fails on
another, the notation is no longer the thing that needs no toolchain, and the
reason for choosing it over D2 is gone.

If `diagram-refs` produces a false positive on a diagram anyone actually drew —
a label that is path-shaped and deliberately not a path — the level drops to
warning and the token rule tightens, rather than the check being removed.
