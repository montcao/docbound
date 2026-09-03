# docbound

Your agent cannot say it is done until the change it just made is written down.

docbound is a skill and a blocking audit. It runs inside your agent's loop, and
when the agent tries to end its turn with undocumented work behind it, the audit
stops it and says what is missing.

```
$ # the agent edits a file, then tries to finish

docbound: the task is not done — the audit reports 2 error(s).
  [worklog-entry] docs/WORKLOG.md
      missing; run `docbound scaffold` to create the docs structure, then
      `docbound start "<what you are about to do>"`
  [doc-coverage] src/billing/invoice.ts
      changed with no covering doc in the diff: touch its module README, or a
      system doc that names this file or its directory
Fix each one, or add a `waiver: <check-id> [target] - <reason>` line to the
Waivers section of the current worklog entry, then continue.
```

The agent reads that, writes the missing paragraph, and continues. The cost
lands on the agent rather than on you, usually in under a minute, because it
still has the reasoning loaded.

## Try it on your own repository, right now

Both of these read your repository and change nothing in it.

```
cd your-repo
npx docbound summary     # what is already here, according to your docs
npx docbound audit       # what the last change failed to write down
```

`summary` reads documentation and never source. A test plants a marker string
in a source file and requires it never to appear in the output, so that claim is
one you can check rather than one you have to take.

## What it checks, and what it does not

It reads the documentation for the change in front of it and asks three
questions. Did a decision get recorded when it was made. Did the doc covering a
changed file change with it. Does every path a doc mentions still exist.

It has nothing to say about whether your code works. Your tests cover that. A
green audit means the change is explained, not that it is correct, and the two
gates run independently, so your tests can pass while the audit fails and the
reverse.

## Evidence, rather than claims

- The audit runs on this repository in CI, on Node 20, 22, and 24, alongside the
  test suite and a check that the committed build output matches a fresh build.
- Every check has a small repository built for it, and the assertion is the
  exact set of check IDs the audit reports, not a subset. A test enforces that,
  so a check with no fixture fails the build.
- Zero dependencies, at runtime and for development. `package.json` has neither
  key.
- 42 decision records in `docs/decisions/`, each with the condition that would
  reverse it. Several of them record this project being wrong and what it did
  about it.
- Pointed at three repositories it had never seen, it found four blocking false
  positives in itself. Those are fixed, and
  `tests/fixtures/real-world-shapes/` holds the constructs that caused them.

## The problem it solves

You ask an agent for a feature. It builds it, maybe spawning more agents along
the way. You keep going. The project grows faster than anything you have worked
on, because most of it was not typed by you.

Then you need to decide what to build next, and you have lost track of what is
already in there. So you ask an agent what the project does.

It re-reads the source to answer. That is slow, it costs most of a context
window, and you pay it again the next time you ask. Worse, an answer
reconstructed from code can only recover what the code does. The reasoning was
never in the source to begin with, so the summary you get is a confident
description of the *what* with the *why* quietly missing.

docbound works on both ends of that. It moves the explanation inside the task
rather than after it, so the reasoning gets written down while the agent still
has it, and the agent cannot finish until it is. Then it answers "what is this
project" from those documents alone:

```
npx docbound summary
```

Purpose, shape, what each module owns and is forbidden from doing, every
decision with the condition that would reverse it, recent work, and what is
still open.

It reads no source file. A test plants a marker string in a source file and
requires it never to appear in the output, so you can check that yourself. How
much smaller it makes the answer depends on your repository, so measure it
there rather than taking a number from here.

On a repository with no documentation it says so, lists the files it looked for,
and names the command that creates them.

## What a finding looks like

`summary` on a repository that has never used docbound comes back thin, and it
says so rather than padding it. That is a true report of the state of its docs.

`audit` gives you either `PASS` or a list. On a repository with an undocumented
change, that list looks like this:

```
docbound audit · mode=author · root=your-repo · git=yes · 3 changed file(s), 2 source

ERROR (5)
  [worklog-entry] docs/WORKLOG.md
      not modified in this change set; open a new entry for this task before editing code
  [doc-coverage] billing/charge.py
      changed with no covering doc in the diff: touch its module README, or a system doc
      (root README, ARCHITECTURE, an ADR) that names this file or its directory
  [new-dir-readme] billing
      new directory with source and no README.md (templates/MODULE.md)
  [dep-adr] requirements.txt
      dependency manifest changed with no Architecture Decision Record (ADR) in the diff

FAIL — 5 error(s). Fix them or add a waiver line to the worklog entry, then re-run.
```

Every finding names a file and says what would satisfy it. Nothing is a style
opinion. Each one is a claim that a specific piece of reasoning was not written
down.

If your repository has no docs at all, lay down the structure first:

```
npx docbound scaffold
```

That writes template files full of placeholders, and the audit fails on those
placeholders on purpose. An empty heading under a filled-in title reads as
documentation from a distance and answers nothing up close.

## What changes about your day

Once the skill is installed your agent runs these five steps, not you.

1. **Orient.** Before writing code, read the docs that already exist for the
   area being touched, and notice anything that has stopped being true.
2. **Declare.** Open an entry in `docs/WORKLOG.md` saying what you are about to
   do, before the first edit. An entry written beforehand is a prediction, which
   is the only version worth reading later.
3. **Work.** When a change alters behaviour or a contract, the doc covering it
   changes in the same commit. Not batched to the end.
4. **Decide.** The moment you pick option A over option B is the only moment you
   fully know why. Big choices get a file in `docs/decisions/`. Small ones get a
   row in a table.
5. **Reconcile.** Delete what has stopped being true, run the audit, and when it
   exits 0, stop. There is no extra credit for polishing past that.

Steps 2 and 4 are the unfamiliar ones. Both capture something that stops being
available once the work is finished.

## The gate

Installing wires two hooks into your editor.

After every file edit, four cheap checks run and print anything they find. They
never block.

When your agent tries to end its turn, the full set runs. If it fails, the hook
exits with code 2, which your editor reads as *do not stop, here is why*. The
agent gets the findings at the exact moment it believed it was done, and keeps
working.

An instruction that says "please document this" competes with everything else in
the agent's context and usually loses. An exit code is not in that competition,
which is why the hook does the work the instruction could not.

The audit reads documentation and nothing else, so a failing gate is not a
verdict on your code. Wire your tests into the same stop hook if you want that
gate too.

In practice the agent adds a paragraph to a README, writes two sentences in the
worklog, and continues. Usually under a minute, because it still has the
reasoning loaded. The cost lands on the agent rather than on you.

## When you think a finding is wrong

Sometimes it is. A generated file has no meaningful doc to write, and you say so
in one line in the worklog entry:

```
waiver: doc-coverage src/generated/api_types.ts - emitted by the codegen step;
the contract lives in the schema, not in this file.
```

The finding stops blocking, and it stays visible in the output under `WAIVED`
so a reviewer sees the exception and the reason next to it.

Waivers apply to the current worklog entry only, so one does not outlive the task
that justified it, and they need a reason a reviewer would accept. "Not relevant"
teaches everyone to skim the section that most needs reading.

Writing waivers in more than one task out of five means the checks are mistuned
for your repository. That threshold is written into the adoption record the tool
generates.

## The checks

Errors block. Warnings print and do not block, but leaving one is a choice
recorded in the output.

| ID | Level | What it means |
|---|---|---|
| `worklog-entry` | error | You started work without saying what you were about to do |
| `worklog-closed` | error | The entry has no outcome, or nothing under Still open |
| `entry-length` | warn | A worklog entry long enough that nobody will read it |
| `doc-coverage` | error | A source file changed and no doc covering it changed with it. Comment-only edits are exempt |
| `new-dir-readme` | error | A new package arrived with no README |
| `dead-ref` | error | A doc points at a file path that does not exist |
| `diagram-refs` | error | A Mermaid diagram has a box naming a path that does not exist |
| `dep-adr` | error | A dependency changed with no record of why |
| `adr-shape` | error | A decision record does not say what would reverse it |
| `adr-immutable` | error | An accepted decision record was edited below its Status line |
| `template-residue` | error | A scaffolded placeholder was left in a doc |
| `plain-opening` | warn | A README or ARCHITECTURE opens with a sentence someone new can read |
| `orphan-doc` | warn | A doc nothing links to |
| `duplicate-block` | warn | The same paragraph has two owners |
| `stale-marker` | warn | Changelog phrasing where current truth belongs |
| `restating-comments` | warn | Comments repeating what the code already says |
| `todo-shape` | warn | A TODO with no problem, no action, or no owner |
| `comment-sentence` | warn | Commented-out code, or comments written as notes to self |
| `open-item-form` | warn | A slug closed in prose rather than by the bullet, or restated when it was already open |
| `open-item-typo` | warn | Two open-item slugs one typo apart, so one item became two |
| `open-item-debt` | warn | So much open work on the ledger that nobody reads the list |

Four more apply in subagent mode. `docs/checks.md` covers every check: what it
detects, what is exempt from it, and a waiver a reviewer would accept.

Start with `doc-coverage` if you only read one. It produces most of the value
and most of the friction, and understanding what counts as covering a
file explains the shape of everything else.

## Installing it

```
npx docbound install
```

It looks for the editors your project already uses, copies the skill where each
one reads skills from, and merges its hook into whatever config is there
already. It will not overwrite settings you have. If it cannot find a supported
editor it stops and says so, rather than guessing at a path.

Name one explicitly if you prefer:

```
npx docbound install --providers=claude-code,cursor
```

Check what happened:

```
npx docbound doctor
```

## If your repository already has history

Run this once, right after installing:

```
npx docbound baseline
```

It records the commit you adopted at. From then on the audit asks about what
changed since, and the hundred files somebody wrote last year are not your
first run's problem.

Without it, docbound compares your branch against `main` and asks for
documentation on everything that differs, which on a real branch is most of the
repository. Measured on a 107-file project: 97 errors before this command, and a
passing audit after it, with the next real edit producing exactly two findings
about that edit (`docs/decisions/0019-adoption-baseline.md`).

A brand new repository does not need it. There is no history to hold apart, and
neither does a directory that is not a git repository at all: docbound scans the
whole tree there and evaluates no coverage, which is what a baseline would
otherwise narrow.

## Turning it down, or off

Adopt this in the order that suits you. Each of these is supported and tested.

### Run the checks by hand, with no hooks

```
npx docbound install --no-hooks
```

### Keep the hooks but stop the blocking

Set `hook.blockOnStop` to `false` in the gitignored local override beside
`.docbound/config.json`. That file is per developer and nobody reviews it.

### Ignore a whole directory

Add it to `audit.exclude` in `.docbound/config.json`, which is tracked, so the
exclusion is reviewed like any other change to what the repository considers
documented.

### Run it in CI only

`npx docbound audit` exits 0, 1, or 2, so it drops into a workflow without the
editor integration.

Keep the per-developer override out of git with a marker block in `.gitignore`:

```
# docbound-ignore-start
.docbound/config.local.json
.docbound/cache/
# docbound-ignore-end
```

## Supported editors

Claude Code and Cursor. Both were verified against the editor itself, against
the files it ships rather than a description of them, and each entry in
`cli/providers.mjs` records what that evidence was.

Nothing else ships. A provider entry written from a guess fails silently: the
files copy, the install prints success, the editor reads a different path, and
the skill never loads. There is no error to search for. A missing editor is a
feature request; a broken one wastes an afternoon.

`docs/providers.md` lists the candidates and the four questions each needs
answered before it can be added. Answering them for your editor is a good first
contribution.

Any other tool can still use docbound by hand. `dist/payload/` is the skill with
no path claim attached, ready to copy wherever that tool reads skills from.

## Other ways to install

### As a Claude Code plugin

```
/plugin marketplace add montcao/docbound
/plugin install docbound@montcao
```

### As a submodule

Keeps the skill a checkout you update with git.

```
git submodule add https://github.com/montcao/docbound .docbound-src
npx --prefix .docbound-src docbound link --source=.docbound-src
```

### As a copy, with no toolchain

```
cp -R dist/payload .claude/skills/docbound
```

## Subagent mode

One agent writes the code and a second one documents it afterwards. The second
agent never had the moment where the decision was made, so it works under
stricter rules: every reconstructed reason is marked `Inferred:` and queued for
a human to confirm, and it may edit comments but never logic or names. A missing
handoff from the first agent is an error the second one is not allowed to paper
over. `docs/subagent.md` has the wiring.

## What this is built on

Node 20 or later. No dependencies at runtime and none for development. The skill
is plain Markdown plus a few scripts, and the audit falls back to scanning the
whole tree if there is no git repository.

## Status

0.1.0. The audit, the hooks, and the CLI are covered by a test suite that packs
the real npm tarball and installs from it. Editor support is deliberately
narrow; see `docs/providers.md`.

## What is in this repository

`skill/docbound/` is the only place skill content is edited. Everything under
`dist/` and `plugin/` is a copy of it produced by `node scripts/build.mjs`, and
those copies are committed on purpose: they are what `npx docbound install`
copies into your project, and a build that runs at install time would be a
build you have to trust. CI rebuilds from source on every push and fails if the
committed copies differ by a byte.

That is why over half the files here are generated. `cli/` is the command line
tool, `scripts/` is tooling that never ships, `tests/` holds the fixtures, and
`docs/` holds the reference and the decision records.

## Where to go next

- `docs/checks.md`: every check, what satisfies it, and a waiver example
- `docs/ARCHITECTURE.md`: how the pieces fit, with a diagram
- `docs/providers.md`: supported editors, and what a candidate still needs
- `docs/subagent.md`: wiring the documentation subagent
- `docs/DEVELOP.md`: building, testing, releasing, and how to add a check
- `docs/decisions/`: why things are shaped this way, oldest first
- `docs/decisions/0012-summary-from-docs.md`: why the summary never reads code
- `skill/docbound/SKILL.md`: the skill your agent reads

## License

Apache-2.0. See `LICENSE` and `NOTICE.md`, both of which ship in the npm
tarball. Contributing is `CONTRIBUTING.md`, under `CODE_OF_CONDUCT.md`.
