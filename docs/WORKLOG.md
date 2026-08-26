# Worklog

Newest entry first. One entry per task. Intent is written before the first
edit; Outcome and Still open are written after the audit passes.
Entries older than a quarter can be pruned once their content is reflected
in ARCHITECTURE, module READMEs, or Architecture Decision Records (ADRs).

## 2026-08-26 - Open an entry by command, and tag the items already open

Agent: claude · Branch: main

### Intent

Two pieces of clerical work are still going through a language model every task.

The first is the entry skeleton. An agent hand-writes the heading, the date, the
agent line, and five section headers before it writes anything worth reading.
That is structure, not judgement, and hand-writing it is why one heading in this
worklog uses an em dash where every other uses a hyphen, which the summary
parser had to be made lenient about. `docbound start` writes the skeleton so the
agent fills Intent and nothing else.

The second is the backlog this repository is carrying. Thirty-five untagged
notes sit in eleven entries, describing perhaps a dozen real pieces of
unfinished work, several of them already done. The slug convention landed one
entry ago and nothing has used it, so `summary --open` is still a list nobody
would act on.

Tagging them means annotating closed entries, which the previous record ruled
out. That ruling was mine and it was wrong: adding a slug in front of a bullet
changes no word of what the entry said, and it makes the history read more
accurately rather than less, because one item restated six times becomes one
item mentioned six times. Reversing it needs a superseding record rather than an
edit, which is what this repository's own check enforces.

### Expected to touch

- `skill/docbound/scripts/start.mjs` - new
- `cli/index.mjs` - the pass-through
- `docs/WORKLOG.md` - slugs added in front of existing bullets, wording untouched
- `docs/decisions/` - a record superseding 0013, and 0013's Status line
- `tests/` - the command, and the retagged history aggregating correctly

### Unknowns going in

- How many of the thirty-five are genuinely still open. Some were closed by
  later work and never marked, which is the backlog problem this is meant to
  expose rather than a reason not to do it.
- Whether `start` should refuse when the previous entry is unclosed. Refusing
  protects the discipline and blocks a legitimate second task in one day.

### Outcome

**`docbound start "Add rate limiting"`** writes the entry skeleton:
`skill/docbound/scripts/start.mjs`, with the usual pass-through in
`cli/index.mjs`. The sections come from `skill/docbound/templates/WORKLOG-entry.md`,
so the template stays the one place deciding what an entry contains, and their
guidance text is stripped rather than carried in. Creating a `template-residue`
finding at the start of every task only to make the agent clear it is busywork.

It refuses when the newest entry has no Outcome, because that entry is a task
nobody closed and stacking on top of it is how a worklog stops being a record.
`--force` says you meant it. Eleven tests, one of which asserts the heading uses
a hyphen, since a hand-written em dash in one heading is what the summary parser
had to be made lenient about in the first place.

**The backlog was retagged.** Thirty-five bullets across eleven entries turned
out to be twenty-six distinct items and three notes that say nothing is open.
`provider-coverage` had been restated five times and
`comment-sentence-wrapping` six. Only a slug was added in front of each bullet;
not one word of any entry changed, which is why this annotates the history
rather than rewriting it.

**Three items were already done and never marked.** They are closed below. That
is the backlog problem this was meant to expose: without identity, finishing
something leaves no trace on the record of it being open.

**A record superseded rather than edited.** ADR 0013 said this repository's own
history would stay untagged. That was mine and it was wrong, so
`docs/decisions/0014-retroactive-slugs.md` replaces it and 0013's Status line
changed to say so, which is the only edit an accepted record allows. First
supersession in this repository, and the mechanism it demonstrates is the point
of having it.

### Still open

- [lock-per-provider] closed: the per-provider payload hashes came out of
  `skills-lock.json` when the CLI moved to comparing the single top-level hash.
- [doc-path-waivers] closed: both became entries in `audit.exclude` rather than
  waivers, since they were standing facts about two documents rather than
  exceptions scoped to one task.
- [register-conflict] closed: settled by
  `docs/decisions/0011-two-registers.md`, which splits the register by reader.
- [start-agent-name] `docbound start` defaults the agent name to "agent"
  because nothing tells it which agent is running. A harness that set an
  environment variable would fix it, and none of them do.
- [nothing-notes] Three untagged notes say some version of "nothing from this",
  which reads as an open item in `summary --open`. They are honest prose and
  editing closed entries to remove them would cost more than they do.

## 2026-08-26 - Give open items an identity so they stop being retyped

Agent: claude · Branch: main

### Intent

Six bullets across five entries describe one unfinished piece of work. Each was
correct when written, because each entry honestly reports what was open at that
moment, and each was retyped from scratch in slightly different words. The
summary then concatenated the history and presented it as a status, so a
repository with about twenty loose ends looked like one with thirty-five.

The deduplication that fixed the display compares the first ninety characters
after normalising, which catches a restatement that opens the same way and
misses one that buries the item behind a different clause. Three of the six
matched, three did not. A heuristic over prose is the wrong instrument.

The cause is upstream of the summary. An open item has no identity, so carrying
it forward means writing it again, and writing it again means writing it
differently. Give it a slug and the item is declared once, stays open until an
entry closes it, and never needs restating. Aggregation becomes exact matching
rather than fuzzy matching, and the agent stops spending judgement on
bookkeeping.

### Expected to touch

- `skill/docbound/scripts/lib/digest.mjs` - parse and aggregate tagged items
- `skill/docbound/scripts/summary.mjs` - report them with their history
- `skill/docbound/templates/WORKLOG-entry.md` - the convention, demonstrated
- `skill/docbound/SKILL.md` - one paragraph on declaring once
- `tests/summary.test.mjs` - the aggregation, and untagged items still working
- `docs/` - this entry and a decision record

### Unknowns going in

- Whether requiring a slug makes the section feel like a ticket tracker. The
  convention has to stay optional, since an untagged bullet is the normal way
  someone writes a note and refusing it would be worse than tracking it badly.
- How to close an item without a second file format. Anything that needs a
  parallel state file is a synchronisation problem, which is what an append-only
  log exists to avoid.

### Outcome

**An open item can carry a slug**, and one that does is declared once:
`- [check-set] comment-sentence reads wrapped sentences as fragments`. Any later
entry closes it with `- [check-set] closed: ...`, and `closed`, `done`, and
`resolved` are all accepted, because the cost of taking all three is one regular
expression and the cost of refusing two is an item that silently stays open.

`openItems` in `skill/docbound/scripts/lib/digest.mjs` walks the history oldest
first, so an item is opened by its first appearance rather than its most recent
one, and reports how many entries have mentioned it. Aggregation is exact
matching on the slug. The prose deduplication it replaces matched three of six
restatements of the same item and missed the three that opened with a different
clause.

**Untagged bullets keep working.** A note that will not outlive its task should
not need an identity, and refusing one would push people into tagging things
that do not deserve tracking. It cannot be followed across entries, so it is
shown while its entry is still in view and counted afterwards rather than
restated as a fresh item forever.

**This repository's own history stays untagged.** Retagging closed entries would
edit the record of what was written when, and that record is worth more than the
convention. The summary reports the older notes as a count with a pointer to
`docs/decisions/0013-tagged-open-items.md`.

**The convention is not enforced.** A check requiring a slug would be a check
about form rather than truth, and the check set has stayed on one side of that
line on purpose. The record names the check that would be legitimate: a warning
listing slugs that appear exactly once, which is a likely typo rather than a
rule.

Nineteen tests in `tests/summary.test.mjs`, seven of them on the aggregation.

### Still open

- [slug-typos] A mistyped slug opens a second item instead of continuing the
  first, and nothing catches it. Visible in `summary --open` as two nearly
  identical rows. The warning described in
  `docs/decisions/0013-tagged-open-items.md` is the fix, once there is evidence
  that it happens.
- [summary-usefulness] Nothing measures whether the summary is worth reading.
  The tests assert it reads no source and parses what is there, which is truth
  rather than usefulness. Same gap the check set has.
- [entries-default] `--entries` defaults to five, chosen without evidence.
- [comment-sentence-wrapping] `comment-sentence` reads the continuation lines of
  a wrapped sentence as fragments, so every file here with a wrapped header
  comment trips it. Treating a run of comment lines as one unit is the fix.
- [provider-coverage] Four provider entries are unverified against a running
  harness: gemini, github, opencode, and the generic layout.
  `docs/providers.md` has the four questions each needs answered.

## 2026-08-26 - Add a summary that reads the docs instead of the code

Agent: claude · Branch: main

### Intent

The README describes the wrong failure. It says you merge good code and cannot
explain it three weeks later, which is true and is not what actually hurts.

What hurts is scale. You ask an agent for a feature, it spawns more agents, you
keep going, and the project outgrows what you can hold in your head. Then you
need to decide what to build next, so you ask an agent what the project does. It
re-reads the source to answer, which is slow, costs a great deal of context, and
produces a reconstruction from code that can only recover what the code does and
never why any of it is that way. The next time you ask, it pays the whole cost
again.

docbound already keeps a set of documents true: what each module owns, what it
must not do, every decision and its reversal condition, and a worklog of intent
and outcome per task. That is exactly the material such a question wants, and it
is a rounding error next to the source tree.

So the feature is a `summary` command that assembles an orientation from those
documents and reads no source at all. It is also step 1 of the loop, Orient,
which the skill currently describes as a list of files to go and read by hand.
Mechanising it makes the cheap path the default one.

The claim to be careful about is the token one. It has to be measured and
printed rather than asserted, or it is marketing.

### Expected to touch

- `skill/docbound/scripts/summary.mjs` - new, and its library support
- `cli/index.mjs` - a pass-through, as `audit` and `scaffold` already are
- `tests/summary.test.mjs` - new
- `skill/docbound/SKILL.md` - Orient names the command
- `README.md` - the problem section, rewritten to the failure that matters
- `docs/` - a decision record, the check reference is untouched

### Unknowns going in

- Whether a summary assembled from documents is good enough to answer "what
  should I build next" without the source. It cannot be, entirely. The question
  is whether it gets close enough to be worth the difference in cost.
- What to do when the docs are thin. A summary of a repository that never
  adopted the discipline is a summary of nothing, and saying so plainly is
  better than padding it.

### Outcome

**`docbound summary`**, at `skill/docbound/scripts/summary.mjs`, with the
document parsing in `skill/docbound/scripts/lib/digest.mjs`. It assembles
purpose, shape and diagram, each module's contract and must-not list, known
gaps, invariants, every decision with its reversal condition, recent worklog
entries, and what is still open. `--open` gives unfinished work across every
entry, deduplicated. `--json` gives the same content as data.

**The claim is measured, not asserted.** Output ends with what the summary cost
and what reading the source would have cost. On this repository that is about
2,400 tokens against roughly 69,000 across 94 source files. Build output and
Markdown are excluded from the source count, because counting a payload this
project copies three times would inflate the ratio the figure exists to report
honestly.

**Step 1 of the loop names it.** Orient was a list of six files to open by
hand, which made the cheap path the effortful one. It now runs one command, and
keeps the reading list for a repository without the CLI installed.

**Two defects the first run showed.** Bullets were read only from the line
carrying the marker, so every wrapped bullet was truncated mid-sentence, which
is worse than dropping it because a half-sentence reads as a whole one. And the
must-not heading was prefixed onto bullets that already opened with "Must not".

**One test carries the feature.** A marker string is planted in a source file
and the output is required never to contain it. That survives any future change
to the renderer, which an assertion about specific headings would not.

`docs/decisions/0012-summary-from-docs.md` records why the summary never falls
back to reading source, and why a thin summary is reported as thin rather than
padded. The README's problem section is rewritten to the failure that actually
hurts: not one forgotten decision, but a project outgrowing what anyone can
hold, and every attempt to ask about it costing a re-read that recovers the what
and drops the why.

86 tests.

### Still open

- [summary-fallback] The summary is exactly as good as the documentation under it, with no
  fallback. On a repository part-way through adopting the discipline it will be
  partial, and nothing distinguishes "this module has no must-not list" from
  "this module's must-not list is empty on purpose".
- [summary-usefulness] Nothing checks the summary stays useful. The fixtures assert it reads no
  source and parses what is there, which is not the same as the output being
  worth reading. That gap is the same shape as the one in the check set: the
  audit measures truth, and neither measures usefulness.
- [entries-default] `--entries` defaults to five, chosen without evidence. On a repository with
  two hundred entries the right default is probably different, and there is no
  data yet to pick it from.
- [token-estimates] Token figures are estimates at four characters per token. Good enough for a
  ratio this large, wrong enough that nobody should budget from them.

## 2026-08-26 - Bound what the audit claims to decide

Agent: claude · Branch: main

### Intent

The README's first sentence calls docbound "a documentation discipline for
coding agents, with a checker that decides when a task is finished." A reader
asked what that means, and the sentence is the reason they had to ask.

It overclaims. The audit reads documentation. It cannot tell whether a feature
works, whether a bug is fixed, or whether a test passes. Saying it decides when
a task is finished invites exactly one question, which is how a documentation
tool could possibly know that, and the README never answers it because the claim
was never true in that form.

Under-explaining compounds it. The sentence says the checker decides something
without saying what it reads, so a reader has no way to size the claim for
themselves.

The fix is to say what it checks, say plainly what it does not, and repair the
two later sentences that inherit the same ambiguity. Bounding a claim makes it
more persuasive rather than less, because an unbounded one has to be taken on
trust.

### Expected to touch

- `README.md` - the opening claim and the two sentences that repeat it

### Outcome

The opening sentence now names what the audit reads: whether the change you just
made was written down. Two short blocks follow it. **What it checks** lists the
three questions in plain language, and **What it does not check** says the audit
has no opinion on whether the code works, that tests own that half, and that the
two gates are independent in both directions.

Two inherited sentences repaired. "docbound makes that happen by making it the
condition for finishing" said nothing about which condition, and now says the
explanation moves inside the task rather than after it. The gate section repeats
the bound at the point a reader is most likely to mistake the tool for an
authority on their work, and points out that wiring tests into the same stop
hook is available if they want that gate too.

`README.npm.md` carried a quieter version of the same claim, that docbound "ends
every task" with an audit. Bounded there in two lines, since the npm page earns
its length differently.

The skill's own phrasing is untouched. `skill/docbound/SKILL.md` says a task is
not done until the audit exits 0, and its reader is an agent already inside a
documentation skill, for whom the subject of that sentence is not in doubt.

### Still open

- Nothing from this. The claim now matches what the code does, and
  `tests/fixtures/` is what would catch it drifting again.

## 2026-08-26 - Settle which writing register applies where

Agent: claude · Branch: main

### Intent

The README rewrite in the entry below left an unresolved conflict: the front
door addresses the reader directly and argues a case, and the standard the skill
publishes in `skill/docbound/references/style.md` forbids exactly that. Read
side by side, the project looks like it does not follow the discipline it sells.

Settle it rather than leave it noted. The resolution is that the split is by
reader and not by taste, so it can be stated as a rule and applied without
judgement each time.

### Expected to touch

- `docs/decisions/0011-two-registers.md` - the record
- `docs/DEVELOP.md` - where a contributor looks before editing prose
- `docs/WORKLOG.md` - this entry, and the open question it closes

### Outcome

`docs/decisions/0011-two-registers.md` records the split. The adoption register
covers `README.md` and `README.npm.md` and nothing else; the skill's standard
covers `docs/`, the module READMEs, the decision records, the worklog, and every
doc an agent writes through the skill in any repository.

The line is the reader's commitment. A reader who already works here wants the
fastest true answer and is slowed down by persuasion. A reader deciding whether
to try the tool has committed nothing, and dry declaration gives them no reason
to continue.

`docs/DEVELOP.md` says so under Style, because that is where a contributor looks
before editing prose. `skill/docbound/references/style.md` is unchanged: it names
its reader in its first section, which is already its scope, and nothing in it
claims to govern a project's front door.

The record also names the failure mode the standard was preventing on the
adoption side. A register that persuades can persuade past what is true. The
guard is that the README's sample output is copied from a fixture rather than
written by hand, and that it claims nothing the test suite does not cover.

### Still open

- Nothing from this decision. The reversal conditions are in the record: the
  front door starting to carry reference material, or a claim in it turning out
  to be unsupported by a test.

## 2026-08-26 - Rewrite the README for a reader who has not adopted the tool yet

Agent: claude · Branch: main

### Intent

The README is written for someone who already agrees that documentation
discipline is worth enforcing. It opens with a thesis, states the loop as five
imperatives, and reaches the install instructions after the argument is already
won. A reader who has never felt the problem has no reason to keep going.

The audience that matters for adoption is a junior engineer who uses an AI
assistant daily, has been burned by code nobody can explain, and has never
installed a tool that can block them from finishing. That last part is the
obstacle. A gate sounds like an obstacle until you have seen what it actually
prints, so the rewrite shows real output rather than describing it.

Ordering changes with the audience. `audit` comes before `install`, because it
reads and changes nothing, so the first run costs nothing to try and produces a
real answer about their own repository.

### Expected to touch

- `README.md` - rewritten for a reader deciding whether to adopt
- `docs/WORKLOG.md` - this entry

### Unknowns going in

- Whether teaching register conflicts with the writing standard the skill
  itself sets in `skill/docbound/references/style.md`, which forbids second
  person and prefers dry declaration. That standard governs documentation
  inside a repository being documented. A front door that has to convince
  someone is a different genre, and the two may not be reconcilable.
- How much length a teaching README can carry before it stops being scanned.

### Outcome

**Reordered around the reader's first decision, not the author's argument.**
`audit` now comes before `install`, because it reads and writes nothing, so
trying it costs nothing and returns a real answer about the reader's own
repository. The old opening was a thesis about documentation being a work
product, which is true and persuades nobody who has not already been burned. It
opens on the specific failure instead: good code merged fast, and three weeks
later nobody can explain it.

**Real output, not a description of output.** The audit sample is copied
verbatim from `tests/fixtures/undocumented-change`. The blocking behaviour is
the single thing most likely to stop someone adopting this, and describing it
reads as a warning while showing it reads as five fixable lines.

**A section for the objection rather than a mention of it.** "The gate, and why
it is not as bad as it sounds" says what the agent does when blocked and how
long it takes. "Turning it down, or off" gives four supported positions, from no
hooks through CI-only, framed as choices rather than escapes. A reader who
believes they cannot back out does not start.

**The checks table says what each one means to the reader** rather than what it
detects internally, and points at `doc-coverage` as the one to read first, since
it produces most of both the value and the friction.

The file grew from 171 lines to 290. That is the cost of teaching rather than
stating, and it stays scannable because a reader who wants the commands can take
the first two code blocks and leave.

### Still open

- [register-conflict] The register conflicts with `skill/docbound/references/style.md`, which forbids
  second person and prefers dry declaration. Resolved in a later entry by
  `docs/decisions/0011-two-registers.md`: the split is by reader, and the two
  READMEs are the only files on the adoption side.
- [audit-output-dash] The audit's own FAIL line contains an em dash, so the quoted terminal output in
  the README carries one. Faking program output would be worse. Changing the
  message means updating `docs/checks.md` and the table in the skill, which is a
  separate change.
- [adoption-metric] Nothing measures whether this works. Adoption is the metric and there is no way
  to see it from here.

## 2026-08-26 - Rewrite the repository's prose to read as human writing

Agent: claude · Branch: main

### Intent

This repository goes public, and its documentation carries a cluster of
patterns that read as machine-written. The dominant one is punctuation: 207 em
and en dashes across the prose, roughly one every eleven lines. Vocabulary is
already clean, so the work is punctuation, sentence rhythm, and the rule-of-three
constructions that show up when a writer reaches for symmetry it has not earned.

Credibility is the whole reason to care. A tool that tells agents how to write
documentation, whose own documentation reads as generated, loses the argument
before anyone reads the checks.

Two directories stay untouched. `docs/decisions/` holds accepted records, and
this repository's own rule is that an accepted record is an archive; rewriting
ten of them for style is exactly what `adr-immutable` exists to stop.
`skill/docbound/` is the canonical skill, whose prose belongs to its author and
which a build copies verbatim into every distribution. `docs/WORKLOG.md` keeps
its closed entries for the same reason the records keep theirs.

### Expected to touch

- `README.md`, `README.npm.md` - the front door, rewritten rather than patched
- `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md`, `NOTICE.md`
- `docs/ARCHITECTURE.md`, `docs/DEVELOP.md`, `docs/checks.md`,
  `docs/providers.md`, `docs/subagent.md`
- `cli/README.md`, `scripts/README.md`, `tests/README.md`, `skill/README.md`

### Unknowns going in

- Whether the waiver examples survive losing their em dash. The grammar accepts
  a plain hyphen, and `docs/checks.md` is full of examples that have to keep
  parsing.
- Whether removing dashes costs clarity anywhere the sentence was doing real
  work with them. Where it does, the sentence gets restructured instead of
  repunctuated.

### Outcome

**Sixteen files, 136 em dashes, zero left.** `README.md` and `README.npm.md`
first, since they are what a stranger reads. Then `AGENTS.md`, `CLAUDE.md`,
`CHANGELOG.md`, the five files under `docs/` that are not archives, and the four
module READMEs.

**Three shapes, three fixes, not one substitution.** A glossary line
(``- `docs/checks.md` - every check``) takes a colon. A bold lead-in
(`**Copy** -`) takes a period and folds into the sentence. A genuine
parenthetical mid-sentence takes commas, parentheses, or a full stop, depending
on whether the clause was doing structural work. Replacing all 136 with commas
would have produced grammatical mush, which is the tell it was supposed to
remove.

About a quarter of them were pattern-uniform enough to convert with four
regular expressions. The rest needed a sentence rewritten, and several were
sentences that had been leaning on the dash to avoid choosing between two ideas.

**Waivers still parse.** The grammar accepts `[—-]{1,2}`, so the examples in
`docs/checks.md` work with a plain hyphen. Checked against the live regex before
converting them rather than after.

**Nothing else moved.** 74 tests, the freshness check, and the audit are
unchanged, because none of these files ships in a distribution.

### Still open

- [archive-dashes] `docs/WORKLOG.md` keeps 71 em dashes in its closed entries, and
  `docs/decisions/` keeps its own. Both are archives, and the rule that an
  accepted record is not edited for style is the same rule `adr-immutable`
  enforces. Anyone reading the repository will see them.
- [skill-prose-register] `skill/docbound/` is untouched. Its prose belongs to its author and a build
  copies it verbatim into every distribution, so a decision to restyle it is a
  decision about the product rather than about this repository.
- [prose-style-check] Nothing checks for this. A `prose-style` check could catch dash density the
  way `stale-marker` catches changelog phrasing, and it would be the first check
  in the set that is about taste rather than truth. That is an argument against
  it as much as for it.

## 2026-08-26 — Add an architecture diagram, tethered to real paths

Agent: claude · Branch: main

### Intent

`docs/ARCHITECTURE.md` describes components, seams, and invariants in prose. A
reader arriving cold gets the shape faster from a picture, and every other tier
of the taxonomy already has a home while the picture has none.

Mermaid is the notation. It renders where people read code — GitHub, GitLab,
most editors — with no toolchain, which is the constraint that rules out D2,
PlantUML, and Graphviz whatever their layout engines are worth. It is plain text
in a fenced block, so it diffs and an agent can write it.

The risk is the reason this is not just a template change. A diagram is the
easiest document in a repository to leave stale, and a stale architecture
diagram is the most confidently wrong artifact a codebase can carry: it is read
first, trusted most, and checked by nobody. Adding a place to draw one without
adding a way to catch it rotting would make this repository's documentation
worse, not better.

So the feature is two halves. `scaffold` seeds a diagram from the top-level
source directories it already discovers, and a new `diagram-refs` check requires
that any node label naming a path is a path that exists.

The seed stops at directories on purpose. Inferring edges means inferring
semantics, and a generated import graph is the anti-pattern this skill already
names — a README that is `ls` with prose, at architecture scale. The tool draws
the boxes it can see; the arrows and the must-nots are the author's.

### Expected to touch

- `skill/docbound/scripts/lib/checks/diagram-refs.mjs` — new check
- `skill/docbound/scripts/lib/refs.mjs` — the path heuristic `dead-ref` already
  uses, extracted so both checks agree on what counts as a path
- `skill/docbound/templates/ARCHITECTURE.md` and
  `skill/docbound/scripts/scaffold.mjs` — the seeded block
- `skill/docbound/SKILL.md` — the check table, and when the diagram is updated
- `tests/fixtures/` — a fixture for the check, and the scaffold fixtures whose
  placeholder counts move
- `docs/` — this entry, a decision record, the check reference, and this
  repository's own diagram

### Unknowns going in

- How many false positives a path heuristic produces against real Mermaid.
  Arrow syntax, class definitions, and quoted labels all look nothing like
  paths, but subgraph names and edge labels might.
- Whether the check should block. `dead-ref` is an error and this is the same
  defect class, but the parser is new and a false positive on a blocking check
  is how a tool gets uninstalled.

### Outcome

**Mermaid, and the reasoning is in
`docs/decisions/0010-mermaid-architecture-diagram.md`.** It renders where people
read code with no toolchain, which is the constraint that decides it. D2 has the
better layout engine, PlantUML the richer notation, Graphviz the better graph
engine, and all three produce a picture that exists only where the toolchain
does.

**A `## Diagram` section** in `skill/docbound/templates/ARCHITECTURE.md`, seeded
by `skill/docbound/scripts/scaffold.mjs` with the top-level directories holding
source — which it already computes, because that is how it decides
which directories get a module README. Boxes only. `seedDiagram` and
`sourceDirs` are the new surface there.

**`diagram-refs`**, error level, in
`skill/docbound/scripts/lib/checks/diagram-refs.mjs`. Every fenced Mermaid block
in every doc; a node label naming a path must name a path that exists.

The path heuristic `dead-ref` used moved to
`skill/docbound/scripts/lib/refs.mjs` so both checks agree on what a path is. `dead-ref` behaviour is unchanged and
all seventeen existing fixtures produce identical output.

**The false-positive problem, and the rule that solves it.** A naive
slash-detector reads read/write, input/output, client/server, and 24/7 as paths,
and a blocking check that fires on English is a blocking check somebody turns
off. Only path-shaped tokens count: a file with a known extension, or a
directory with a trailing slash. That is also the convention the template
teaches — in a diagram, name a path the way you would in prose. A probe diagram
built from the worst labels I could think of, plus a URL and a comment, produces
zero findings.

**The two checks disagree about one token, on purpose.** `dead-ref` skips a
trailing-slash directory because stripping the slash leaves a bare word, and a
bare word in a sentence is usually a symbol. Inside a diagram the trailing slash
is the documented way to write a directory, so `diagram-refs` takes it
literally. `pathClaim` carries the flag and the comment explaining it.

**It caught its own author twice.** The diagram I wrote for this repository
labelled an edge with a bare scripts path when that file lives under
`skill/docbound/scripts/`, and
`dead-ref` flagged the backticked examples in `docs/checks.md` that exist to
explain which labels are *not* paths — backticking one makes it a path claim,
and the check was right. Both fixed rather than waived.

**Tests.** `tests/fixtures/diagram-dead-node` renames a package through every
sentence and leaves the boxes alone, which is how diagrams actually rot. 74
tests, and `docs/ARCHITECTURE.md` now carries a real diagram that the check
holds to the same standard as everyone else's.

### Still open

- [diagram-placeholders] The seeded diagram's instructional placeholders begin with a capital letter,
  so `template-residue` does not see them and an agent can leave the section
  half-filled. That is true of most of the template's prose and is not new here,
  but the diagram is the place it would be least noticed.
- [dead-ref-trailing-slash] `dead-ref` still cannot see a dead trailing-slash directory in prose —
  `worker/` in a paragraph goes uncaught. Fixing it means changing a frozen
  check's behaviour, which wants its own decision and its own fixture.
- [diagram-structure] `diagram-refs` reads labels, not structure. A diagram whose boxes all exist
  but whose arrows are wrong passes, and nothing but a reader will catch that.
- [comment-sentence-wrapping] The check candidates from earlier entries stand: `frontmatter-limits` for the
  eighteen characters of headroom in the skill's description, and the
  wrapped-sentence handling in `comment-sentence`.

## 2026-08-26 — Release 0.1.0

Agent: release script · Branch: main

### Intent

Cut 0.1.0. Written by `scripts/release.mjs`, which refuses to run
unless the tests, the audit, and the freshness check pass against a clean
tree first.

### Outcome

Set the version in `package.json`, `.claude-plugin/plugin.json`, and
`.claude-plugin/marketplace.json`; rolled `CHANGELOG.md`; rebuilt `dist/`,
`plugin/`, and `skills-lock.json`; tagged.

### Still open

- Nothing from the release itself. Open work is in the entries below.
## 2026-08-26 — Make the published package actually installable, and cut 0.1.0

Agent: claude · Branch: main

### Intent

Everything so far has been exercised from a git checkout. Nobody has run the
path a user will actually take: `npx docbound`, which downloads a tarball built
from the `files` whitelist in `package.json` and runs the CLI out of it.

That path is broken. Both files in `cli/` import the provider table from
`scripts/`, and `scripts/` is not in the whitelist, so the published package
would fail to resolve a module on its first command. The bug is not the missing
entry so much as the absence of anything that would have caught it: no test
opens the artifact that gets published.

This task fixes that, treats the current scope as the MVP, and cuts 0.1.0. No
features are added or removed. The work is the last mile: make the artifact
correct, prove it with a test that packs and installs it, and put the README in
front of someone who has five minutes.

### Expected to touch

- `cli/providers.mjs` — the provider table moves into the package that ships it
- `tests/package.test.mjs` — new: pack, unpack, install, assert
- `README.md` — reordered around a first run rather than around the design
- `docs/`, `CHANGELOG.md` — the paths that move, and the release notes
- `package.json` — version and the whitelist

### Unknowns going in

- Whether anything else in the whitelist is missing. The packaging test is
  written to answer that for every future change rather than this one.
- Whether the skill's frontmatter description, at 1006 characters against
  Cursor's 1024 limit, leaves enough room to survive an edit.

### Outcome

**The published package was broken, and two things were missing rather than
one.** Both files in `cli/` imported the provider table from `scripts/`, which
the npm `files` whitelist does not include, and `skills-lock.json` — read by
`install`, `update`, and `doctor` — was not in it either. Either one would have
made `npx docbound` fail on its first command with a module resolution error.

The table moved to `cli/providers.mjs`, because it is product data that ships;
`scripts/build.mjs` imports it now rather than owning it. `skills-lock.json`
joined the whitelist. The rule that came out of it — nothing under `cli/` may
import from `scripts/` — is in `cli/README.md` and in
`docs/decisions/0009-package-is-the-artifact.md`.

**A test that opens the artifact.** `tests/package.test.mjs` packs the real
tarball, unpacks it where no checkout is reachable, installs from it into a
fixture repository, and then runs the *installed* audit and the *installed* stop
hook out of that project. It also asserts the package carries no test suite, no
build scripts, and no frozen Python, so the whitelist is checked in both
directions. Six tests; the suite is 73.

This is the check that was missing. Seventy tests passed while the package was
unusable, because none of them opened it.

**`docbound --help` exited non-zero.** A flag in the command position was read
as a command, so the first thing anyone types printed usage to stderr and exited
2. Both it and `--version` are commands now.

**The README is reordered around a first run.** Quickstart is at the top —
three commands and what to expect from them — with the loop, the gate, and the
check table after it. Two install snippets were still naming a provider and a
distribution directory that were removed earlier today; an edit meant to fix
them had silently not applied, which is its own argument for the audit.

**Two waivers became exclusions.** Cutting the release exposed them: the release
writes its own worklog entry, waivers are scoped to the top entry by design, and
a mechanical entry dropped both. That is the mechanism working — those two were
never task-scoped exceptions. `docs/providers.md` names paths inside other
people's repositories by construction, and records 0002 and 0007 name paths that
this task's predecessor removed. Both are permanent, so both moved to
`audit.exclude` in `.docbound/config.json`, where they are tracked and reviewed
rather than restated every entry. That is the trade
`docs/decisions/0007-audit-exclude-config.md` describes.

The cost is real and small: the two excluded records lose `adr-immutable`
coverage. They are accepted archives that should not change, and a change to
either shows up in review as a diff to a file nothing else touches.

**Frontmatter headroom.** The skill's description is 1006 characters against
Cursor's 1024 limit. Valid, and eighteen characters from not being.

**The release script had the same shape of bug as the package.** `--dry-run`
left `CHANGELOG.md` modified, and the audit ran after the version bump, so it
saw a release commit with no worklog entry behind it and failed — correctly, and
uselessly. Verification now runs against the clean tree before anything is
written, a dry run writes nothing, and the release commit stages only the files
the script touches instead of everything in the tree.

Moving the audit earlier fixed the script and left the repository broken in a
quieter way: the release commit would have been the one commit on main that
fails `npx docbound audit`, and CI runs that on every push. A release is a task,
so the release now writes its own worklog entry. The invariant holds — every
commit on main passes the audit, including the one that cuts the release.

### Still open

- [frontmatter-limits] The skill's frontmatter description has eighteen characters of headroom before
  Cursor rejects it. Nothing checks that, and the next edit to it is likely to
  be the one that breaks a provider silently. A `frontmatter-limits` check is
  the strongest candidate for the next pass at the check set.
- [provider-coverage] Four candidate providers still need someone with the harness in front of them;
  `docs/providers.md` has the four questions each has to answer.
- [comment-sentence-wrapping] `comment-sentence` reads the continuation lines of a wrapped sentence as
  fragments, and the warnings it leaves on this repository are the record of
  that. Unchanged for three entries now.
- [adr-exclusion-coverage] Excluding two decision records from the audit costs them `adr-immutable`
  coverage. A narrower mechanism — an exclusion that suppresses one check rather
  than every check — would be better, and is a candidate rather than a change to
  make while cutting a release.
- [npm-dependency] The packaging test shells out to `npm`, so the suite now needs npm on the
  path. `docs/decisions/0009-package-is-the-artifact.md` says what would move it
  to a release-only step.


## 2026-08-26 — Ship only verified providers, and close three security findings

Agent: claude · Branch: main

### Intent

This repository is about to be public. Two classes of problem make that unsafe
in its current state.

The first is provider entries that were written from assumption rather than from
evidence. Correcting the Cursor entry earlier today showed the method — read
what the harness itself ships — and applying that method to the rest shows the
table is largely fiction. Codex's own skill-creator places skills under its own
home directory and describes no project-level location, so the path and the
hook schema in the Codex entry are both wrong. No project puts
skills under the GitHub directory; that holds Copilot instructions, workflows,
and issue templates, so the GitHub entry was invented, and it is the one entry
that writes into a directory people treat as security-critical. Gemini and
opencode have no evidence behind them at all. A supported-providers list whose
entries silently do nothing is the first thing a reader will test and the first
thing they will report.

The second is three findings from reading the code as an attacker would. The
configuration merge assigns keys straight from parsed JSON, so a repository
carrying a crafted config file can reach `Object.prototype` through a hook that
runs automatically after every file edit. Merging a hook manifest
treats an unparseable existing file as an empty one, which silently replaces a
developer's entire harness settings with docbound's two hooks. And the hook is
documented as never emitting file contents, which is false: two checks quote a
truncated line from the file they are about.

### Expected to touch

- `cli/providers.mjs` — remove every entry not verified against a harness
- `skill/docbound/scripts/lib/config.mjs` — prototype-safe merge
- `cli/install.mjs` — refuse to overwrite a config or a manifest that will not
  parse
- `skill/docbound/scripts/hook.mjs` and the hooks reference — an accurate
  claim about what hook output can contain
- `docs/providers.md` — new: what each candidate needs before it can ship
- `dist/`, `plugin/`, and this repository's own harness directories — rebuilt
  and pruned
- `README.md`, `docs/`, `CHANGELOG.md` — the supported list, honestly

### Unknowns going in

- Whether removing the generic Agent Skills layout costs more than it gains. It
  is the layout the skill's own text recommends, but the one independent project
  on this machine uses that directory for plugin metadata and puts its skills
  elsewhere, so it is a claim I cannot check either.
- Whether a prototype-pollution guard is enough, or whether the config merge
  should reject unknown keys outright.

### Outcome

**Five provider entries removed; two ship.** `cli/providers.mjs` now holds
Claude Code and Cursor, each carrying the evidence it was verified against.
Codex, Gemini CLI, GitHub Copilot, opencode, and the generic Agent Skills layout
are documented as candidates in `docs/providers.md` with the four questions each
still has to answer. The policy is recorded in
`docs/decisions/0008-verified-providers-only.md`.

Two of the five were demonstrably wrong rather than merely unconfirmed. Codex's
own skill-creator describes a location under the user's home directory and no
project-level one, and the removed entry's hook manifest used another harness's
event vocabulary. The GitHub entry was invented: no project examined puts skills
or hooks under that directory, which holds instructions files, workflows, and
access configuration — and writing there on a guess is the part of this that was
worst.

`install` with nothing detected now refuses and names the options instead of
falling back to an unverified path, exiting 1 rather than 2, because the flags
were fine. `dist/payload/` is the skill with no directory wrapped around it, for
vendoring by hand where nobody has checked what the path should be. The build
removes its whole output tree first, so a dropped entry stops shipping instead
of lingering in the package: the GitHub distribution was still on disk after the
table lost its entry.

**Three security findings, all fixed and all with a regression test.**

The configuration merge assigned keys straight from parsed JSON, so a cloned
repository carrying a crafted config could reach `Object.prototype` through a
hook that runs automatically after every file edit. Unsafe keys are refused, and
an object whose prototype has been reassigned is no longer treated as plain and
recursed into.

Installing treated a harness configuration that would not parse as an absent
one and replaced it — a trailing comma in a settings file was enough to lose all
of it. Install now refuses, says which file and why, and leaves it untouched.
The CLI catches that refusal and prints one line instead of a stack trace.

The hook was documented in four places as never emitting file contents. That was
false: `todo-shape` quotes up to seventy characters of the line holding the
marker and `stale-marker` up to eighty of the line it matched, and those
messages pass through hook output. The claim is now precise about which checks
and what limits, rather than weakened or quietly dropped. Redacting instead was
considered and rejected: the agent reading the output already has the file open,
so redaction would cost the findings their usefulness to prevent nothing.

The frozen Python reference no longer travels in the npm package either. It
stays in the repository for one release as the specification
(`docs/decisions/0002-node-runtime.md`) and is nobody's business to download.

**This repository's own harness directories.** The symlinks and hook manifests
for removed providers are deleted, so nothing here writes into the GitHub
directory but CI. Cursor is dogfooded alongside Claude Code, and both payload
paths are excluded from this repository's audit in `.docbound/config.json`.

### Still open

- [doc-path-waivers] The two waivers below are the only ones standing, and both are about docs
  whose subject is paths outside this repository. If `dead-ref` ever learns to
  tell a path claim from a path mention, both can go.
- [provider-coverage] Four candidate providers remain undocumented in the harness sense — someone
  with Codex, Gemini CLI, Copilot, or opencode in front of them can answer the
  four questions in `docs/providers.md` and promote one.
- [comment-sentence-wrapping] The check candidate stands from two entries ago: `comment-sentence` reads the
  continuation lines of a wrapped sentence as fragments.

### Waivers

waiver: dead-ref docs/providers.md — this file's subject is where other tools
read skills from, so by construction none of the paths it names exist in this
repository. Removing the backticks would make a reference document about paths
unable to typeset a path.

waiver: dead-ref docs/decisions — records 0002 and 0007 name provider paths that
existed when they were written and were removed by
`docs/decisions/0008-verified-providers-only.md`. An accepted record is an
archive; editing it to match the present is the thing `adr-immutable` exists to
prevent.

## 2026-08-26 — Correct the Cursor provider entry and cut dead surface

Agent: claude · Branch: main

### Intent

A user working in Cursor questioned a claim in the previous task's report that
`doctor` had called Cursor installed when it was not. Checking it turned up a
real defect underneath: the Cursor entry in `cli/providers.mjs` places the
skill in the generic agent-skills directory, and Cursor reads project skills
from its own. Installing for Cursor has been putting the payload where
Cursor never looks, silently — the exact failure the previous task recorded as a
known gap and could not verify without the harness present. The harness is now
present, and its own bundled documentation is the source.

Two smaller faults come with it. The Cursor hook manifest omits the schema
version its format requires, and carries a key that format does not define.
Provider detection reads only the project directory, so a Cursor user whose
repository has no Cursor directory yet gets no detection at all.

The second half of the task is removal. The previous task left duplicated and
unreachable surface: the default configuration is written out in three places,
`cli/install.mjs` imports and re-exports a function nothing imports from it,
`copyDist` takes an option it no longer reads, several modules export helpers
that only they use, and `skills-lock.json` records the same payload hash eight
times.

### Expected to touch

- `cli/providers.mjs` — the Cursor entry, its hook manifest, and detection
- `cli/install.mjs`, `cli/index.mjs` — dead imports, dead option, lock shape
- `skill/docbound/scripts/lib/` — un-export helpers with one internal caller
- `scripts/build.mjs`, `scripts/check-dist-fresh.mjs` — one owner for the
  default config, and a lock that records each hash once
- `dist/`, `skills-lock.json` — rebuilt
- `docs/` — this entry, ARCHITECTURE's known gaps, module README decisions

### Unknowns going in

- Whether Cursor reads the generic agent-skills directory as well as its own.
  If it does, the current entry was merely redundant rather than broken.
  Nothing the harness ships mentions the generic one.
- Whether the other six provider entries have the same class of error. Only
  Claude Code, Codex, and Cursor are present on this machine to check against.

### Outcome

**The Cursor entry was wrong, and worse than reported.** Cursor reads project
skills from its own directory, and the entry in `cli/providers.mjs` named
the generic agent-skills one, so `install --providers=cursor` had been writing
the payload where Cursor never looks. Corrected, along with two faults in the same
entry: its hook manifest now carries `version: 1`, which that format requires,
and drops a key the format does not define. `cursorHooks` in
`cli/providers.mjs` is separate from `genericHooks` for that reason. The
event names and the exit-code-2 blocking contract the stop gate depends on were
already right.

The correction is sourced from the harness's own bundled documentation rather
than from a third-party summary, so Claude Code, Codex, and Cursor are now
verified entries and the remaining four are not. `docs/ARCHITECTURE.md` carries
that split, and `cli/providers.mjs` says it per entry.

**Detection read only the project directory.** A harness writes its project
directory only once it has something to keep there, so working in Cursor on a
repository with no Cursor directory was detected as no harness at all, and fell
back to the generic layout Cursor does not read. `detectProviders` in `cli/install.mjs`
now reads the home directory too.

**A second bug the new test found.** Merging a hook manifest built its result
from the existing file's top-level keys only, so every key the incoming manifest
declared was discarded — including the schema version Cursor requires. Fixed in
`mergeHooks`; the project's own keys still win over docbound's.

**Removed.** The default configuration was written out three times; the copy in
`skill/docbound/scripts/lib/config.mjs` is now the only one, imported by
`scripts/build.mjs` and `cli/install.mjs`. `skills-lock.json` recorded one
payload hash per provider, all eight identical by construction, and now records
it once. Deleted a re-export in `cli/install.mjs` that nothing imported, an
option `copyDist` had stopped reading, and five exports whose only caller was
the module that defined them.

**A third bug, from piping the verification output.** Running
`node cli/index.mjs doctor | head` crashed with an unhandled EPIPE and a stack
trace where the output should have been, because `head` closes stdout while the
command is still writing. Every command here is one someone will pipe.
`ignoreEpipe` in `skill/docbound/scripts/lib/entry.mjs` is called by
`cli/index.mjs`, `skill/docbound/scripts/audit.mjs`, and
`skill/docbound/scripts/scaffold.mjs` when each is run directly.

**Tests.** The install matrix now runs over the provider table itself rather
than a hand-written list, and asserts the payload lands at each provider's
declared path and that its hook command points there. That is the strongest
assertion available from inside the repository: it catches a payload written to
the wrong place, and cannot catch a declared path that is wrong about the world.
A regression test pipes `doctor` into `head` and fails on an EPIPE in stderr.
Four tests added, 70 passing.

### Still open

- [provider-coverage] Four provider entries remain unverified against a running harness: gemini,
  github, opencode, and the generic layout. Each needs the harness present, and
  the same method that fixed Cursor — read what the harness itself ships —
  applies to each.
- [comment-sentence-wrapping] The check candidate from the previous entry stands: `comment-sentence` reads
  the continuation lines of a wrapped sentence as fragments. Unchanged here.

## 2026-08-26 — Turn the canonical skill folder into a distributable repository

Agent: claude · Branch: main

### Intent

The docbound skill exists as a folder: `skill/docbound/SKILL.md`, four reference
files, five templates, and two Python scripts. It is usable by copying it into a
repository and nothing else. This task turns it into a repository that ships
the skill: one canonical source under `skill/docbound/`, a build that emits a
per-provider distribution under `dist/`, an `npx docbound` CLI, a Claude Code
plugin payload, provider-native hooks that run the audit inside the agent loop,
and a fixture-based test suite that pins the audit's behaviour.

The audit and scaffold scripts move from Python to Node so that one runtime
serves the hook, the CLI, and the skill scripts. The port is behaviour-first:
check IDs, levels, messages, exit codes, waiver grammar, and change-detection
semantics stay as the Python defines them, because agents in the wild write
waivers against those IDs.

The repository runs docbound on itself. `node cli/index.mjs audit` passing on
this tree is the last acceptance test, not a formality.

### Expected to touch

- `skill/docbound/` — the canonical skill; scripts ported to Node, `templates/`
  raised out of `references/`, an agent definition added
- `cli/` — new: install, update, link, audit, scaffold, adr, doctor
- `scripts/` — new: build, dist freshness check, release
- `tests/` — new: fixture repositories and four test files
- `dist/`, `plugin/`, `.claude-plugin/` — new: build output and plugin payload
- `docs/` — this worklog, ARCHITECTURE, ADRs, the check reference, the
  contributor guide, the subagent wiring guide

### Unknowns going in

- Whether the skill payload's own prose (SKILL.md, `references/`, `templates/`)
  can live inside an audited tree without tripping `template-residue` and
  `dead-ref`. In a consumer repository the payload sits under a harness
  directory the audit already excludes by name; here it does
  not, and the check set is fixed for this pass.
- Whether the Python's change detection has any behaviour the fixtures do not
  pin, which the port would silently drop.
- How much of the hook contract is stable across Claude Code, Codex, Copilot,
  and Cursor, versus per-provider.

### Outcome

**The skill.** Moved to `skill/docbound/`, its templates raised out of the
reference directory (`docs/decisions/0003-templates-location.md`), every mention
of the old path rewritten in `skill/docbound/SKILL.md` and
`skill/docbound/references/subagent-mode.md`. The Portability section now
describes a Node runtime. Added `skill/docbound/references/hooks.md` and
`skill/docbound/agents/docbound-documenter.md`. SKILL.md is 202 lines.

**The port.** `skill/docbound/scripts/audit.mjs` and
`skill/docbound/scripts/scaffold.mjs`, with twenty-one check modules under
`skill/docbound/scripts/lib/checks/` and shared machinery beside them
(`docs/decisions/0002-node-runtime.md`,
`docs/decisions/0006-check-plugin-architecture.md`). Both implementations were
run against every fixture and their JSON compared; the only intended difference
is the `new-dir-readme` message naming the template's new path. The Python is at
`skill/docbound/scripts/reference/` for one release with a README saying it is a
frozen specification.

**The gate.** `skill/docbound/scripts/hook.mjs`: a four-check subset after every
edit, the full audit on stop, exit 2 with findings on stderr
(`docs/decisions/0005-hook-blocking-default.md`). Configuration in
`.docbound/config.json`, with a gitignored per-developer override.

**Distribution.** `scripts/build.mjs` emits seven provider distributions and the
plugin payload from one source; `scripts/check-dist-fresh.mjs` and
`skills-lock.json` make drift a red build
(`docs/decisions/0004-dist-committed.md`).
`cli/providers.mjs` is the single place a provider's conventions appear.
`cli/` is `npx docbound`, and `.claude-plugin/` plus `plugin/` are the plugin.
`scripts/release.mjs` cuts a release.

**Tests.** Seventeen fixtures under `tests/fixtures/`, each asserting exact
check-ID counts, plus `tests/build.test.mjs`, `tests/cli.test.mjs`, and
`tests/scaffold.test.mjs`. 66 tests, all green.

**Three bugs the tests found, not the reading.** The entry-point guard in every
script compared `import.meta.url` against an unresolved `process.argv[1]`, so no
script ran when its path crossed a symlink — every macOS temp directory, and
every linked install. `skillRefs` in the scaffold had the same fault and
reported an in-repository skill as outside. `copyDist` wrote a provider's hook
manifest over whatever was there instead of merging into it. All three are
fixed, and `skill/docbound/scripts/lib/entry.mjs` is now the one owner of that
comparison.

**Two reporting defects found while verifying the acceptance steps.** `doctor`
called Cursor and universal installed whenever Codex was, because three
providers read the same generic skills path; it now reports one line
per payload and the hook state per provider, which is what actually differs
between them. And `--providers` rejected `claude`, which is the name the
documented install command uses; `cli/providers.mjs` now carries a small
alias table.

**Documentation.** `docs/ARCHITECTURE.md`, `docs/checks.md`, `docs/subagent.md`,
`docs/DEVELOP.md`, seven decision records, module READMEs for `skill/`, `cli/`,
`scripts/`, `tests/`, and `skill/docbound/scripts/reference/`, a generated one
for `plugin/`, plus `README.md`, `README.npm.md`, `AGENTS.md`, `CLAUDE.md`,
`CHANGELOG.md`, `NOTICE.md`, and `LICENSE`.

**What the audit caught in this task's own documentation.** 163 findings on the
first run, of which 126 were the skill payload's prose being read as this
repository's documentation — the Unknown recorded above, resolved by
`docs/decisions/0007-audit-exclude-config.md` rather than by waivers. The
remaining 37 were real defects in records written earlier the same day: bare
filenames in backticks where the writing standard asks for a path from the
repository root, and paths quoted before the file existed. Every one was fixed
rather than waived.

One waiver stands, and it is an artifact of this task's shape rather than of the
code: the decision records were opened with their Context in the first commit
and completed later, which `adr-immutable` reads as editing an archive when all
seven commits are audited as a single diff. The per-commit audit that CI and the
hook run does not see it.

### Still open

- [comment-sentence-wrapping] `comment-sentence` reads the continuation lines
  of a wrapped sentence as
  fragments, because it compares line by line. Every file in this repository
  whose header is a wrapped paragraph trips it — `scripts/build.mjs`,
  `scripts/release.mjs`, `cli/providers.mjs`, `cli/index.mjs`, and
  `cli/install.mjs` among them. The warnings are left on the record rather than
  answered by writing worse comments. A refinement — treat a run of comment
  lines as one unit before judging it a sentence — is a candidate for the next
  pass at the check set, and it is the single most useful change to the check
  set this task found.
- [provider-coverage] The provider paths and hook event names in `cli/providers.mjs` are taken
  from each harness's documentation and verified against none of them. A wrong
  path installs a skill where its harness will not look, silently. Verifying
  them needs each harness present, and `docs/ARCHITECTURE.md` lists this as a
  known gap.
- [python-reference-drift] Nothing checks automatically that the Node audit and the frozen Python still
  agree; the diff was run by hand for every fixture in this task. The Python is
  deleted next release, at which point `tests/fixtures/` is the only
  specification, so this closes itself.
- [check-candidates] Other check candidates noted and deliberately not added in this pass: a check
  that a module README's `Must not` section is non-empty, and a check that a
  `Supersedes` line names a record that exists.
- [hook-not-wired] The Claude Code hook is not wired in this repository, so contributors' local
  sessions are not gated; CI is. `docs/ARCHITECTURE.md` records the reasoning
  and the condition that would reverse it.
- [lock-per-provider] `skills-lock.json` records a payload hash per provider, and every one of them
  is the same value, because the payload is identical by construction. The
  per-provider entries are redundant until a provider needs a transformed
  payload.
- [adr-context-first] Opening a decision record with only its Context, as this task was asked to do,
  collides with `adr-immutable` as soon as the record is completed in a later
  commit and both commits land in one diff. Either the check learns that a
  record with an empty Decision section is not yet an archive, or the guidance
  says to write the record whole at the moment the decision is made. The second
  is closer to what the skill already says, and neither is a change to make
  without a decision record of its own.
- [self-referential-checks] `todo-shape` and `comment-sentence` both fire on prose *about* themselves —
  the header of `skill/docbound/scripts/lib/checks/todo-shape.mjs` names the
  markers it looks for, and is read as containing one. Warnings, and harmless
  here, but a repository whose subject matter is documentation vocabulary will
  meet them constantly.

### Waivers

waiver: adr-immutable docs/decisions — records 0002, 0003, 0005, and 0006 were
opened with their Context in this task's first commit, as the task required, and
completed in a later commit of the same task. The edits repaired quoted paths
and completed sections that were deliberately left empty; no reasoning recorded
earlier was changed. Nothing had been released, so no reader had seen the
earlier version. Applies only to auditing this task's seven commits as one diff.
