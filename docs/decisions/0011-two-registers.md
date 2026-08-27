# 0011. Two writing registers, split by who is reading

- Date: 2026-08-26
- Status: accepted
- Supersedes: none

## Context

The skill sets a writing standard in `skill/docbound/references/style.md`, and
it is strict. Declarative, present tense, dry. No second person addressed to the
reader, no persuasion, no praise. It names the reader it is written for: an
engineer who joins in six months, has no chat history, is under time pressure,
and is about to change something.

`README.md` in this repository breaks all of that. It addresses the reader
directly, opens on a scenario rather than a fact, and spends four paragraphs
arguing that a blocking check is tolerable.

Read side by side, that looks like the project failing to follow the standard it
publishes, which is the worst thing a tool of this kind can look like.

It is not the same job. The standard's reader has already committed. They work
here, the code is theirs to change, and what they need is the fastest true answer
about what breaks. Persuasion is noise to that reader, and second person wastes
the line.

The README's reader has committed to nothing. They do not work here, may never,
and are deciding whether this is worth any attention at all. Dry declaration
gives that reader no reason to keep reading, and a tool nobody adopts documents
nothing.

## Options

### One register everywhere

The standard applies to every file in the repository including the front door.
Perfectly consistent, and consistency is worth something when the product is a
writing discipline.

It also means the tool is explained in the register of a maintenance document to
people who are not maintainers, which is how good tools go unadopted. The cost
is invisible: nobody files an issue saying they bounced off a README.

### Two registers, split by reader

The front door explains and convinces. Everything else follows the standard.
Costs an apparent inconsistency that a careful reader will notice, and needs the
line between them written down or it drifts.

## Decision

Two registers.

**Adoption register** applies to `README.md` and `README.npm.md` only. Second
person, worked examples, the reader's objection answered before they raise it.
The job is comprehension and a decision to try it.

**The skill's standard** applies to everything else: `docs/`, the module
READMEs, the decision records, the worklog, and every doc an agent writes in any
repository through the skill. The job is a true answer, fast, for someone who is
already here.

The line is the reader's commitment, not the file's location. Two files sit on
the adoption side because two files are what a stranger reads before deciding.

`skill/docbound/references/style.md` is unchanged and stays scoped as written.
It already names its reader in its first section, which is the scope; nothing
about it claims to govern a project's sales pitch.

## Consequences

A contributor editing `README.md` follows different rules from one editing
`docs/ARCHITECTURE.md`, and has to know which file they are in.
`docs/DEVELOP.md` says so under Style.

The apparent inconsistency stays visible. Anyone comparing the README against
the standard the skill ships will find the difference, and the answer is this
record rather than a defence invented on the spot.

There is a real failure mode on the adoption side that the standard was
preventing. A register that persuades can persuade past what is true, and the
same register that makes a gate sound tolerable can make it sound harmless. The
README claims nothing here that the test suite does not cover, and the sample
output in it is copied from a fixture rather than written by hand, which is the
guard against that.

## What would reverse this

If the two READMEs start carrying reference material rather than an argument,
they have become documentation and the standard should apply to them. The signal
is someone linking to a README section to answer a question about behaviour,
instead of linking to `docs/checks.md`.

If a claim in the README turns out to be unsupported by a test, the register has
started doing harm rather than work, and the front door goes back to stating
what is true and letting it stand on its own.

## Corrections

- t=1787863142: this record says the adoption register applies to `README.md` and
  `README.npm.md`. `README.npm.md` was deleted, because npm ignores the
  `readme` field in `package.json` and always renders the `README.md` at the
  package root. The file was shipped in every tarball and shown to nobody. The
  two registers themselves are unchanged, and the adoption register now applies
  to `README.md` alone.
