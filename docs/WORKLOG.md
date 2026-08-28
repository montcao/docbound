# Worklog

Newest entry first. One entry per task. Intent is written before the first
edit; Outcome and Still open are written after the audit passes.
Entries older than a quarter can be pruned once their content is reflected
in ARCHITECTURE, module READMEs, or Architecture Decision Records (ADRs).

## 2026-08-28 - Gate the publish job and stop it racing itself

Agent: claude · Branch: main · t=1787877815

### Intent

The publish workflow runs on a push to main, which means anyone with write
access to this repository can publish to the registry by bumping a version. No
review stands between the two, and a published version cannot be taken back
after seventy-two hours. That is the largest gap in it.

GitHub environments are the control. A job naming one waits for whatever
protection rules that environment has, and a secret scoped to the environment is
not readable by any other job. Naming one costs a line and does nothing until
the environment is configured, which makes it safe to add now and useful later.

Second, two pushes close together start two publish jobs. Both read the same
version, both find it absent, and one of them fails on a version the other has
already taken. A concurrency group with queueing rather than cancelling makes
the second wait and then skip at its own guard.

Third, `scripts/release.mjs` still ends by printing `git push --follow-tags`.
The tag is a marker now and the trigger is the push to main, so that line sends
the reader to a flag that no longer matters.

### Expected to touch

- `.github/workflows/publish.yml` — the environment and the concurrency group
- `scripts/release.mjs` — the closing message
- `docs/DEVELOP.md` — what has to exist on the GitHub side

### Unknowns going in

Whether naming an environment that has not been created fails the run or creates
it implicitly with no rules. If it fails, the line cannot be added before the
environment exists and the order of the setup steps changes.

### Outcome

Three changes, none of them large, one of them the difference between a workflow
that publishes and a workflow that is allowed to.

The publish job now runs in an environment named `npm`, with the package page as
its URL so a run links to what it produced. GitHub creates an environment
implicitly on first use, so the line is safe to add before the environment
exists and blocks nothing until required reviewers are configured on it. That
answers the unknown going in: it does not fail, it starts as a label. What it
buys is a place for those reviewers to be configured and a scope for a token to
live in, so no other workflow in the repository can read it.

A concurrency group named `publish`, queueing rather than cancelling. Two pushes
close together would otherwise start two jobs that both read the same version,
both find it absent on the registry, and race for it. Queued, the second one
reaches its own guard after the first has published and skips.

`scripts/release.mjs` prints one more line, saying the push to main is what
publishes and the tag is a marker. It still refuses to push, which is right: the
mechanics are automated and the decision is not.

`docs/DEVELOP.md` gained what has to exist on the GitHub side, which is the
environment, branch protection on main, and a token scoped to the environment if
trusted publishing is not used. `scripts/README.md` says why the release script
stops short of pushing.

### Still open

- [environment-unconfigured] The `npm` environment has no protection rules,
  because it does not exist yet. Until required reviewers are set on it, a push
  to main carrying a new version publishes with nothing between the two.
- [no-branch-protection] main is unprotected, so a direct push from anyone with
  write access reaches the registry. A published version cannot be removed after
  seventy-two hours.

## 2026-08-27 - Publish from main when the version changes, not from a tag

Agent: claude · Branch: main · t=1787865686

### Intent

The publish workflow fires on a version tag. That works and it means a release
needs two things to go right: the tag has to be created, and it has to be
pushed. `git push` without `--follow-tags` publishes nothing and says nothing,
which is a failure mode with no output.

Triggering on a push to main instead is what was asked for, and it needs one
guard. A registry version is immutable, so publishing on every push to main
fails with E403 on every push that does not change the version, which is nearly
all of them. The workflow has to ask the registry whether this version exists
and stop quietly when it does.

That guard also makes the trigger idempotent. A re-run, a revert, a merge that
touches nothing about the version: all of them skip rather than fail, and the
only push that publishes is the one carrying a version the registry has not
seen. `scripts/release.mjs` already commits that bump to main, so the release
path loses a step rather than gaining one.

### Expected to touch

- `.github/workflows/publish.yml` — the trigger and the guard
- `docs/DEVELOP.md` — the release path is now one push

### Unknowns going in

Whether `npm view` distinguishes a package that has never been published from a
version of an existing package that does not exist yet. Both are the case here for the
first release and both should publish, so the guard has to treat any lookup
failure as "not published" rather than as an error.

### Outcome

The trigger is a push to main, guarded by a registry lookup.

`.github/workflows/publish.yml` reads the version out of `package.json`, asks
`npm view` whether that exact version is on the registry, and writes the answer
to a step output every later step is conditioned on. A push carrying a version
the registry already has skips everything and writes one line to the run summary.
A push carrying a new version runs the tests, the freshness check, and the audit,
prints the tarball contents, and publishes with provenance.

Measured rather than assumed: `npm view docbound@0.1.0 version` exits 1 with
empty output, and `npm view react@18.2.0 version` exits 0 and prints the version.
The unknown going in was whether a package that has never been published looks
different from a version that does not exist yet. Both fail the same way, which
is what the guard wants, since both should publish.

`workflow_dispatch` is on the workflow so a publish that failed after the version
was already bumped can be re-run without another commit.

[publish-workflow-untested] carries more weight than when it was opened. The
guard is now the piece a first release depends on, and nothing has run it.

The release path lost a step. It was `node scripts/release.mjs --version X.Y.Z`
followed by `git push --follow-tags`, where forgetting the flag published nothing
and said nothing. It is now that script followed by `git push`, and the tag it
creates is a marker rather than a trigger.

`docs/DEVELOP.md` and `CHANGELOG.md` carry the change, including why the guard is
the load-bearing part: a registry version is immutable, so the unguarded version
of this workflow fails on nearly every push.

### Still open

- [no-canary] Nothing is published between releases, so main is only installable
  at a version boundary. A prerelease published on every push under a separate
  dist-tag would change that, and would put a version on the registry for every
  commit.
- [reusable-extraction] This workflow is specific to one package name, which is
  hardcoded in the guard. Extracting it as a reusable workflow means taking the
  name and the Node version as inputs.

## 2026-08-27 - Make the repository publishable and legible to a stranger

Agent: claude · Branch: main · t=1787862681

### Intent

Nothing here has been pushed. There is no git remote, the npm name is
unregistered, and the first command in `README.md` is `npx docbound summary`,
which fails for everyone because the package does not exist. The headline call
to action is broken.

`npm pack --dry-run` shows a second problem. The tarball carries both
`README.md` and `README.npm.md`, because npm always includes a README whatever
`files` says, and the `readme` field in `package.json` is not a thing npm reads.
So npmjs.com renders the full 354-line README and the short one written for it
has never been shown to anyone. It also carried four unsupported editors until
an entry ago, which is what an unread file does.

The README's own shape is the other half. A visitor sees 354 lines of prose,
no output, and no image. The strongest asset this project has is the audit
stopping an agent mid-turn, which is six lines of terminal text and appears
nowhere near the top. The second strongest is that it runs its own audit in CI
across three Node versions, which appears nowhere at all.

And there is no `CONTRIBUTING.md`, `SECURITY.md`, issue template, or pull
request template. None of those earn attention. Their absence tells a reader
this is one person's project, which is currently true and does not need
advertising.

### Expected to touch

- `README.md` — output and proof above the fold, and `dist/` explained
- `CONTRIBUTING.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/publish.yml` — publish on a version tag
- `package.json` and `README.npm.md` — remove the file npm never reads

### Unknowns going in

Whether npm's trusted publishing can be configured for a package name that has
never been published. If it cannot, the first release is manual and every one
after it is automatic, and the plan has to say so rather than imply the whole
thing is hands-off from the start.

### Outcome

**`README.md` opens on output.** The first thing a visitor sees below the title
is the audit stopping an agent mid-turn, which is the product in six lines.
Under it, two commands that read a stranger's repository and change nothing, so
the first thing anyone can do costs nothing and needs no install. Then what the
audit checks and does not check, then a section of evidence rather than claims:
CI on three Node versions, 170 fixture-based tests, zero dependencies, 29
decision records, and the four blocking false positives found by pointing this
at repositories it had never seen.

A section near the end says why over half the files here are generated, since a
visitor meets `dist/` as the second entry in the file browser and has no way to
know it is build output that CI rebuilds and compares byte for byte.

**`README.npm.md` is gone.** `npm pack --dry-run` showed the tarball carrying
both READMEs, because npm always includes one whatever `files` says, and the
`readme` field in `package.json` is not something npm reads. npmjs.com renders
the `README.md` at the tarball root. So the short README written for the
registry was shipped in every tarball and shown to nobody, and it carried four
unsupported editors for as long as it existed. The field and the entry in
`files` went with it. `docs/decisions/0011-two-registers.md` says the adoption
register covers both files, so it carries a correction; the two registers
themselves are unchanged.

That also means a claim in this changelog was wrong. It described
`README.npm.md` as "what npmjs.com shows". It never was.

**Publishing is a tag push.** `.github/workflows/publish.yml` fires on `v*`,
checks the tag against `package.json`, runs the same three gates CI runs, prints
the tarball contents, and publishes with provenance. `id-token: write` is set so
provenance works and so trusted publishing can be used once configured. The
release path is now `node scripts/release.mjs --version X.Y.Z` and
`git push --follow-tags`, with nothing done by hand.

**Furniture.** `CONTRIBUTING.md`, `SECURITY.md`, three issue templates, a
template config pointing security reports at the private advisory form, and a
pull request template whose checklist is the four gates plus the worklog entry.
`SECURITY.md` states the threat model rather than a process, because this hook
runs automatically after every edit over repositories nobody here has read, and
the three properties that matter are untrusted configuration, input that could
hang it, and file contents reaching a transcript.

`docs/DEVELOP.md` gained the release path and the npm README behaviour.

The unknown going in was whether trusted publishing can be configured for a name
that has never been published. It cannot be answered from here, so the workflow
supports both: it publishes over an `NPM_TOKEN` secret if one exists and over
OIDC if trusted publishing is configured, and `docs/DEVELOP.md` says the first
release is manual and every one after it is not.

### Still open

- [first-publish-manual] The npm name `docbound` returns 404, so nothing has
  been published and trusted publishing cannot be configured against a package
  that does not exist. The first release is a `npm publish` from a maintainer's
  machine.
- [no-remote] There is still no git remote configured on this repository.
- [tarball-size] The package is 221 files and 943 kB, most of it three copies of
  a byte-identical payload in three layouts. Shipping one copy and a layout map
  would cut it, and would change what `install` does.
- [publish-workflow-untested] `publish.yml` has never run. Its YAML parses and
  its steps are the ones CI already runs, and that is the whole of the evidence
  behind it.

## 2026-08-27 - Timestamp the audit so elapsed time is read rather than guessed

Agent: claude · Branch: main · t=1787855693

### Intent

<!-- docbound-ignore-start -->
I wrote that four provider entries were removed "months ago" and that a check
count was "two versions stale".
<!-- docbound-ignore-end --> The first commit in this repository is
1787760161 and the most recent is 1787855275, which is 95114 seconds, or
26 hours. There has been one version, 0.1.0, and it has never been released
twice. Both claims were invented and neither was checked.

<!-- docbound-ignore-start -->
The "months ago" was in conversation. The other one is committed, in
`CHANGELOG.md`, and it is the same fault
<!-- docbound-ignore-end -->
`docs/decisions/0018-no-self-serving-metrics.md` is about: a number nobody
measured is not a number.

The reason it is worth building something for rather than resolving to be more
careful is that nothing anywhere in this repository states elapsed time. Every
date is an ISO day string in a heading. An agent reading a worklog sees
2026-08-26 and 2026-08-27 and has to subtract them to know anything, so it
reaches for a phrase instead. The number is not hard to get. It is just not
there.

So put it there. Unix seconds, because they subtract, sort, and compare without
a timezone or a parser, and every language reads them.

### Expected to touch

- `skill/docbound/scripts/audit.mjs` and `lib/report.mjs` — the run's timestamp
- `skill/docbound/scripts/start.mjs` — a timestamp on the entry it opens
- `skill/docbound/scripts/summary.mjs` — ages computed, not left to the reader
- `skill/docbound/scripts/lib/checks/stale-marker.mjs` — vague elapsed time
- `CHANGELOG.md` — the claim that started this

### Unknowns going in

Whether the entry timestamp can go on the `Agent:` line without breaking the
worklog parser, the templates, or the two checks that read entries. Whether
extending `stale-marker` covers the case, given it exempts the worklog and the
decision records by design, and those are the two documents where an agent is
<!-- docbound-ignore -->
most likely to reach for an unmeasured phrase.

### Outcome

Unix seconds in three places, and errata for the records that already got it
wrong.

`audit` prints `t=` in its header and carries `timestamp` in its JSON, which is
an addition to a documented interface. `start` writes `t=` onto the Agent line
and `skill/docbound/templates/WORKLOG-entry.md` carries the field for an entry
written by hand. `skill/docbound/scripts/lib/digest.mjs` reads it back, and
`summary` renders an age beside each entry heading, blank for the entries that
predate the field rather than filled in.

`stale-marker` gained a second fault: a span of time asserted without a number.
It runs on the worklog and the decision records for that half, unlike the
changelog-phrasing half, because an unmeasured span is a claim about the world.
Building it caught two committed fabrications immediately, one in `CHANGELOG.md`
and one in the body of `docs/decisions/0027-open-plainly-then-go-deep.md`.

The second of those had nowhere to go. A record's body is immutable, superseding
is wrong when the decision stands, and there was no mechanism for marking a
statement false. So `adr-immutable` now accepts one more edit: a `## Corrections`
section appended at the end, anchored so it cannot hide an edit above it.
Records 0027 and 0028 carry one each, and the earlier worklog entry that made
the same claim carries the same kind of note.

Two narrowings came out of testing rather than out of planning. The first
pattern included "recently", which fired on the scaffolded README line "what has
changed recently" — a phrase naming a section rather than claiming a duration.
It and its neighbours came out. And `stale-marker` did not read the
`docbound-ignore` markers, so a document quoting the phrasing it was reporting
flagged itself; it reads them now, as `dead-ref` and `template-residue` already
did.

The measurement that started this: first commit 1787760161, this entry opened at
1787855693, which is 95532 seconds. Not months, and not two versions.

170 tests, with `tests/fixtures/unmeasured-age/` covering both the asserted span
and the appended correction that `adr-immutable` allows.

### Still open

- [correction-coverage] One `## Corrections` section quiets `stale-marker` for a
  whole record, so a second false claim added later goes unreported. A record
  takes a bullet per error, and nothing enforces that.
- [worklog-errata] The worklog has no equivalent mechanism. The convention that
  emerged here is a `Correction, t=` paragraph carrying Unix seconds, above the original text
  with the original wrapped in `docbound-ignore` markers, so the claim stays
  readable and stops being reported. No check knows what that looks like.
- [phrase-coverage] The pattern lists the phrasings that have caused a real
  error here. An unmeasured span written some other way passes.
- [timestamp-backfill] Every entry written before this field has no timestamp,
  so `summary` shows no age for the existing history.

## 2026-08-27 - Edit the READMEs and the writing standard against a no-slop rule set

Agent: claude · Branch: main

### Intent

A rule set for removing AI writing patterns was pointed at this repository:
petergyang/no-ai-slop, MIT licensed. Its word lists find almost nothing here.
Scanning the six READMEs for the banned vocabulary returns seven hits and every
one is a false positive: "harness" appears in its literal sense, "just" is
temporal, and the one em dash sits inside quoted command output.

The pattern rules are a different result. The root README carries a fake-strong
verb in "docbound attacks that from both ends", importance puffery in "that is
the entire value of the tool", metadiscourse in "worth repeating here, because
this is the point where", a binary contrast in "an instruction competes and
loses, an exit code does not compete", and a kicker in "a tool that accepted one
would be helping you lie to yourself". A heading argues with the reader rather
than labelling a section: "The gate, and why it is not as bad as it sounds".
Two places use bold as a pseudo-heading followed by a colon reveal.

None of that is caught by a word list, and none of it is caught by any check
here. The existing standard, `skill/docbound/references/style.md`, asks for
"declarative, present tense, dry" and for no praise or narrative. That rules out
marketing and says nothing about the patterns above, which is why they are all
over documents that pass the audit.

Two jobs. Edit the READMEs, and put the pattern rules into the standard the
agent follows so the documents it writes from here on do not need the same pass.

The rules need adapting rather than copying. Half of that skill is about
preserving a human writer's voice through an edit, and an agent writing a module
README has no voice to preserve. What transfers is the list of patterns that
make prose sound assembled rather than written: the contrast, the reveal, the
kicker, the puffery, the metadiscourse.

### Expected to touch

- `README.md`, `README.npm.md`, and the four module READMEs
- `skill/docbound/references/style.md` and `anti-patterns.md`
- `skill/docbound/SKILL.md` — the writing standard
- `NOTICE.md` — attribution, since the source is MIT

### Unknowns going in

Whether any of this can be checked. Every pattern is a judgement about English,
and this repository decided twice already that a check reading intent out of a
sentence either warns or does not exist. The likely answer is that the rules go
in the standard and nothing enforces them, which is a weaker position than the
rest of the skill occupies and should be said rather than hidden.

### Outcome

The word lists found nothing and the pattern rules found a lot, which is the
useful half of the result.

**The READMEs were edited, not rewritten.** `README.md` lost a fake-strong verb
("attacks that from both ends"), puffery ("that is the entire value of the
tool"), metadiscourse ("worth repeating here, because this is the point where"),
a contrast built to be knocked down ("an instruction competes and loses; an exit
code does not compete"), a closing aphorism about helping the reader lie to
themselves, and six places where bold stood in for a heading. The heading "The
gate, and why it is not as bad as it sounds" argued with the reader and is now
"The gate". `tests/README.md` opened on a fragment and now opens on a sentence.

<!-- docbound-ignore-start -->
Correction, t=1787856400: this entry says the file "gave a check count two
versions stale". There has been one version, 0.1.0, released once. The file said
twenty-one checks where there were twenty-three. The original claim was never
measured.
<!-- docbound-ignore-end -->

<!-- docbound-ignore-start -->
**`README.npm.md` was worse than stylistically off.** It advertised Codex,
Gemini CLI, GitHub Copilot, and opencode, four editors removed in
`docs/decisions/0008-verified-providers-only.md`, and gave a check count two
versions stale. That file is what npmjs.com renders.
<!-- docbound-ignore-end --> Nothing caught it because
the audit reads paths and placeholders rather than a document's claims about the
world. Rewritten, with `baseline` and `summary` added to the command list.

**Six patterns went into the standard**, numbers 19 to 24 of
`skill/docbound/references/anti-patterns.md`, each with a tell in the format
that file already uses. Fourteen rules in the source collapsed to six because
they are one disease. `skill/docbound/references/style.md` carries the rule and
the portability test, and `skill/docbound/SKILL.md` carries two bullets pointing
at both. `NOTICE.md` attributes the source, which the MIT licence requires and
which also marks where the adaptation stops: the half of that skill about
preserving a human writer's voice does not apply to a document an agent writes
from a diff.

Writing the new text against its own rules caught two instances. The paragraph
introducing the portability test was itself a colon reveal, and the section
about closing aphorisms closed on one.

**Patterns 15 and 18 of that file still told an agent to rename an identifier**,
which `docs/decisions/0026-docbound-does-not-recommend-logic.md` stopped this
skill from doing three entries ago and missed. Both now say to record the naming
mismatch under `Still open`.

No check was added, and `docs/decisions/0028-write-it-do-not-perform-it.md` says
why: every one of these is a judgement about English, and this project decided
twice already that such a check either warns or does not exist.

### Still open

- [prose-rules-unenforced] Nothing holds patterns 19 to 24. An agent that
  ignores them produces documents that pass the audit, and the only signal is a
  person reading them. The same hole as the rules in records 0018 and 0026, and
  all three were found by reading rather than by running anything.
- [npm-readme-unchecked] `README.npm.md` claimed four unsupported editors for
  two releases. No check reads a document's claims about what the software
  supports, and the provider list is the one claim that could be compared
  against `cli/providers.mjs` mechanically.
- [anti-patterns-size] That reference is 24 patterns and 200 lines. It loads on
  demand rather than with the skill, so the cost is bounded, but a reference
  nobody reaches the end of is a reference with a tail nobody follows.

## 2026-08-27 - Aim the documentation at a junior engineer being trained

Agent: claude · Branch: main

### Intent

Line 12 of `skill/docbound/SKILL.md` names the reader every doc is written for:
a strong engineer joining in six months. Every downstream instruction follows
from it, including a writing standard whose word for the target register is
"dry". The result is accurate and closed to anyone who is not already senior.

A module README this skill produced on a Go repository yesterday opens with
"`catalog.LookupProduct` returns a project type string, the lockfile it
matched on, and an error when nothing matches". True, useful to a senior, and it
teaches a junior nothing because nothing before it says what the package is for.

The reader should be a junior engineer, and the documentation should train them.
That is a better target than the one it has, and it does not mean writing less.
The senior thinking is already in these documents: a `Must not` list is a
boundary, an invariant is what must always hold, and a decision record's
reversal condition is a principal engineer saying in advance what would change
their mind. A junior who reads those for a year learns to think that way. They
just have to be able to get through the first paragraph.

So the change is the door, not the house. Every README and ARCHITECTURE opens
with a sentence a reader can enter, before any identifier appears. Then the
depth stays exactly as it is.

### Expected to touch

- `skill/docbound/SKILL.md` — the reader, the writing standard, the check table
- `skill/docbound/references/style.md` — what a plain opening is, with examples
- `skill/docbound/templates/` — the slot exists; say who it is for
- a new check, its fixture, `docs/checks.md`, `README.md`

### Unknowns going in

Whether a check can tell a plain sentence from a dense one without firing on
good writing. The only honest signal is that the opening contains a sentence
with no identifiers in it, which is crude and might be enough. It is also a
twenty-third check in a repository that was just told its complexity is the
problem, so it has to earn the slot or not exist.

### Outcome

The reader changed and almost nothing else did, which was the point.

`skill/docbound/SKILL.md` now opens on who it is writing for: a junior engineer
six months from now, with two needs. Act correctly today, and learn to think
like a senior from a year of reading these documents. The section says outright
that the second need is not extra writing, because the material is already
there: a `Must not` list is a boundary, an invariant is what has to hold, and a
reversal condition is a principal engineer saying in advance what would change
their mind. It also names the failure mode, which is not writing too little but
writing something correct that a junior cannot get into.

Three rules went into the writing standard. Open plainly, with the first
paragraph carrying no identifier. Say an unfamiliar word once, in a clause, the
first time it appears. Put the constraint before the feature, which is both the
clearer order and the one that teaches.

`plain-opening` holds the first of those. It reads the first paragraph after the
title of a root README or `docs/ARCHITECTURE.md` and asks for one sentence of
five words or more with no backticks in it, skipping badges, HTML comments, and
a `Status:` line. A document opening straight into a heading or a list is
reported too. It checks a fact about the text rather than a judgement about
prose, which is the only version of this check that can be right.

`skill/docbound/references/style.md` carries the worked example, before and
after, since the failure is easy to write and hard to see. The three templates
say who the opening sentence is for.

Two of this repository's own module READMEs were reported and rewritten rather
than waived: `scripts/README.md` and `skill/README.md` both opened with a
two-word fragment and went straight into paths. Then the same check was run
against the Go repository from the previous entry, flagged the two READMEs this
skill had written there, and both were rewritten to open with a sentence
somebody outside the project could read. That is the shortest description of
what this change does.

169 tests, with `tests/fixtures/plain-opening/` carrying the real failing
opening and a near-miss that names identifiers and passes because it also has a
plain sentence. `docs/decisions/0027-open-plainly-then-go-deep.md`,
`docs/checks.md`, `README.md`, and `CHANGELOG.md` all updated.

The unknown going in was whether a check could tell a plain sentence from a
dense one. It cannot, and it does not try. What it can tell is whether a reader
was handed a term before a meaning, and that turned out to be enough to catch
every real case put in front of it.

### Still open

- [plain-opening-proxy] The check measures whether the opening contains a
  sentence without backticks, which a paragraph of filler satisfies. If
  repositories start doing that, it is buying nothing and the rule belongs in
  the skill text alone.
- [depth-untested] Nothing checks the second half of the brief. Whether a year
  of reading these documents actually trains anybody is not measurable here, and
  the argument for it rests on the material already being present rather than on
  evidence that it lands.
- [teaching-register] The rules added here cover the door. The body of a
  document is still written in the register the skill has always asked for, and
  whether that is right for a junior three paragraphs in has not been looked at.

## 2026-08-27 - Remove every recommendation docbound makes about logic

Agent: claude · Branch: main

### Intent

docbound documents a repository. Somewhere in writing it, it also started
telling people how to write their code, and that is not the same job.

Three places say so outright. The skill's own `description` claims
"code-communication standards (clear code before comments; naming, structure,
context, then comments)". Step 3 of the loop tells an agent that code which
would surprise a reader wants "first a better name, then a clearer structure"
before a comment, which is an instruction to rename and restructure. And
`references/code-style.md` is a code standard with no documentation in it,
ending on a line that claims four checks are derived from it.

Two of those four are pure formatting. `line-length` counts columns and
`mixed-indent` compares tabs to spaces, and neither says anything about what a
repository records about itself. A formatter already owns both, does it better,
and does it on save.

The other two are not the same thing. A comment and a docstring are
documentation that happens to live in a source file, which is exactly what the
spectrum in this skill argues: names, then comments, then API docs, then
READMEs, one continuum. `todo-shape`, `comment-sentence`, and
`restating-comments` read what a comment says, never what the code does, and
they stay.

The line is between a recommendation about documentation and a recommendation
about logic. The first is the job. The second was never asked for, and
`skill/docbound/references/subagent-mode.md` already states the rule for one mode: naming is
the coder's first mechanism, it is not yours. It should have been the rule for
both.

### Expected to touch

- `skill/docbound/scripts/lib/checks/line-length.mjs` and `mixed-indent.mjs` — deleted
- `skill/docbound/references/code-style.md` — deleted
- `skill/docbound/SKILL.md` — the description, the foundation, the spectrum, step 3, the check table, the writing standard
- `docs/checks.md`, `README.md`, `NOTICE.md`, `docs/ARCHITECTURE.md`
- `tests/fixtures/code-style/`, `tests/fixtures/code-style-editorconfig/`

### Unknowns going in

Removing a check ID is a breaking change to a public interface, and this
repository's own rules require a deprecation path rather than a commit. What
that path is for a check that no longer exists is not obvious: a waiver naming
it has nothing to dismiss, and whether that is silent or an error has not been
checked.

### Outcome

**The boundary is now the first thing the skill says.**
`skill/docbound/SKILL.md` gained a section before the loop: it documents, and it
never recommends a change to logic, naming, structure, or formatting. The
`description` no longer claims a code-communication standard. Step 3's row for
surprising code said "first a better name, then a clearer structure" and now
says to record why the code is that way, and not to rename or restructure it.
The spectrum's Names row said to try renaming before writing a comment and now
says to read names and never change one to make a document easier to write.
`skill/docbound/references/style.md` called a comment "a rename that has not
happened yet"; it now says a name carries more per character than a sentence
about it, which is a reason to write fewer comments rather than to change a
name. Where a name misleads, the instruction everywhere is to write what the
thing does and put the mismatch under `Still open` with what it appears to
promise.

**Two checks and a reference file are gone.** `line-length` counted columns and
`mixed-indent` compared tabs to spaces; neither says anything about what a
repository records about itself, and a formatter owns both. The code standard
went with them, and `NOTICE.md` no longer attributes a file that does not exist.
Twenty-two checks.

`todo-shape`, `comment-sentence`, and `restating-comments` stayed. They are the
only three that open a source file, and each reads what a comment says rather
than what the code does. That is the line the removals draw: a comment is
documentation that happens to live in a source file.

The unknown going in was the deprecation path for a removed check ID. It needs
no code. A waiver naming a check that no longer exists is parsed, matches
nothing, and dismisses nothing, so a repository carrying
`waiver: line-length ...` keeps working and that line goes inert. Verified by
reading `skill/docbound/scripts/lib/report.mjs`, which matches waivers against
findings and never the other way round.

**The audit then found a problem the change created**, which is the part worth
keeping. `docs/decisions/0021-line-length-needs-a-convention.md` names the check
file I had just deleted, and a record's body is immutable, so that error could
never be fixed: the only routes were editing an archive or carrying a waiver
forever. The worklog has the same shape for the same reason. Both now report a
missing path as a warning rather than an error
(`skill/docbound/scripts/lib/checks/dead-ref.mjs`), which is precisely the
exemption `stale-marker` already makes for those two documents. 0021 is
superseded by 0026, whose decision it was the narrower version of.

Fixtures: `tests/fixtures/code-style-editorconfig/` existed only for
`line-length` and is deleted. `code-style` and `test-file-exempt` kept their
samples and now assert that the long lines and mixed indentation in them are
reported by nothing, which is the removal stated as a test rather than as a
sentence. 168 tests.

`docs/checks.md`, `README.md`, `docs/ARCHITECTURE.md`, `scripts/README.md`,
`tests/README.md`, and `CHANGELOG.md` all updated.
`skill/docbound/references/subagent-mode.md` had this rule from the start and
now says so: stating it there is a reminder rather than an extra restriction.

### Still open

- [boundary-unenforced] Nothing checks that a finding recommends documentation
  rather than logic, because a check cannot tell the two apart when both are
  English. Held by reading, the way ADR 0018's rule about self-serving metrics
  is held.
- [formatter-gap] A repository that used docbound for line width or indent
  consistency now has neither. The answer is a formatter, and nothing in the
  install path says so.
- [historical-warn-volume] Exempting the worklog from blocking means a long
  worklog accumulates dead-reference warnings for every file the project ever
  deleted. Fourteen already, and it only grows.

## 2026-08-27 - Fix what a real documentation session found

Agent: claude · Branch: main

### Intent

docbound was pointed at a second unfamiliar repository, a 31-file Go CLI with a
README and no other documentation, and the whole loop was run twice in it: an
adoption task that wrote the structure, then a task that fixed a real bug the
first task surfaced. Both audits passed. Six things went wrong along the way,
and none of them were caught by anything.

`dead-ref` warned nine times and every warning was wrong. Two shapes account for
all of them. A bare file name carrying a known extension is resolved only at the
repository root, so a document naming `package.json` as a kind of file gets a
finding even though four of them exist in the tree. And a container image
reference has slashes and dots in it, so it reads as a path that never existed.
Neither blocks, and both teach a reader to skim a check, which is the failure
`docs/decisions/0021-line-length-needs-a-convention.md` argued about a different
check three days ago.

Writing `Closes [nginx-python-default].` in an Outcome section did nothing. The
closing grammar is a bullet, `- [slug] closed: ...`, and prose naming the slug
is silently not it. The item stayed open, `summary --open` still listed it, and
no check said a word. That is the single worst finding of the session: the
ledger is only as good as an exact syntax, and getting it wrong is invisible.

Two items were also restated as fresh declarations in the second entry rather
than left to carry forward. `summary --open` reports them as restated, which
means the information to warn about it already exists.

Then three smaller things. `scaffold` writes a worklog entry and does not
mention it, so the next `start` refuses with a message about an entry the user
did not know they had. `start` writes `Agent: agent`, which is a placeholder
wearing the clothes of a real value. And `start` heads an entry with a hyphen
where the template uses an em dash, so two entries in one file are punctuated
differently.

### Expected to touch

- `skill/docbound/scripts/lib/refs.mjs` — the two shapes that are not paths
- a new check for the slug ledger, and `skill/docbound/scripts/audit.mjs`
- `skill/docbound/scripts/scaffold.mjs`, `skill/docbound/scripts/start.mjs`
- `docs/checks.md`, `skill/docbound/SKILL.md`, `CHANGELOG.md`, tests

### Unknowns going in

Whether resolving a bare file name anywhere in the tree is cheap enough to do on
every audit, or whether it needs the index built once and cached. Whether the
slug check can tell "closing this in prose" from "mentioning a slug in a
sentence" without firing on ordinary writing.

### Outcome

Two loops were run end to end in a 31-file Go CLI that had a README and nothing
else: an adoption task that wrote `docs/ARCHITECTURE.md` and three module
READMEs, then a task that fixed a real bug the first one surfaced. Both audits
passed and both produced documentation worth reading, which is the part that
was never tested before. What follows is what went wrong while doing it.

**`dead-ref` warned nine times and was wrong nine times.** Two shapes,
`skill/docbound/scripts/lib/refs.mjs` for both. A first path segment carrying a
dot that is not its first character is a host, so a container image reference
and a scheme-less URL are no longer claims about a path, while
`.github/workflows/ci.yml` still is. And a bare file name is now satisfied by a
file of that name anywhere in the tree, built once per process behind a name
index, because prose naming `package.json` means a kind of file and the
repository held four of them. Both shapes are in
`tests/fixtures/real-world-shapes/`, which gained sample projects and the
decision record `dep-adr` correctly asked for when two manifests arrived with
them.

**`Closes [nginx-python-default].` in an Outcome section did nothing, silently.**
The closing form is a bullet, prose naming the slug is not it, and the item
stayed open while the audit passed. The same session restated two slugs that
were already carrying forward. `open-item-form`
(`skill/docbound/scripts/lib/checks/open-item-form.mjs`, warn) reports both, on
the newest entry only, with the form to write instead in the message.
`docs/decisions/0025-the-slug-ledger-checks-itself.md` records why it warns
rather than blocks: it is reading intent out of a sentence.

It then fired on the test repository's own Intent, which opened with "Closing
[nginx-python-default]." beside a correct closing bullet. That is ordinary
writing, so an entry that closes an item with the bullet may now name it in
prose freely. The fixture carries the case.

**`scaffold` opened a worklog entry without saying so**, so the next `start`
refused while naming an entry the caller did not know existed. It now says what
it opened and that filling the documents is the task it describes.

**The template and `start` disagreed about the dash** in an entry heading. The
existing test asserted a hyphen and gave a reason, so I counted: this repository
had seventeen hyphens and six em dashes, and the template was the outlier.
`skill/docbound/templates/WORKLOG-entry.md` now writes a hyphen; `start` is
unchanged.

**`Agent: agent` was looked at and left.** `start.mjs` writes it when no
`--agent` is given, and the obvious fix is a placeholder that `template-residue`
demands be filled. That file's own header argues against exactly that, and the
argument holds: creating a finding so an agent can clear it is busywork. The
field is already tracked as [start-agent-name].

Also confirmed working and not changed: the baseline made adoption a passing
first run on a second unfamiliar repository; `summary` on a README-only project
named the four things it looked for; every audit blocked on something true and
nothing else. `doc-coverage` accepted a module README touched in an earlier
commit on the same branch, which is what "in the same diff" means when the diff
is a branch, and is recorded below rather than changed.

Tests 168 to 169, with `tests/fixtures/open-item-form/` new and
`tests/fixtures/real-world-shapes/` extended. `docs/checks.md` gained an entry
and the two ref rules, `skill/docbound/SKILL.md` gained a table row and a
correction to what step 5 says about closing an item.

### Still open

- [branch-length-coverage] `doc-coverage` is satisfied by a doc touched anywhere
  in the change set, so on a long branch one edit to a module README covers
  every later change to that module. That is what "in the same diff" means when
  the diff is a branch, and it is a hole a per-commit mode would close at the
  cost of the working-tree workflow.
- [prose-slug-mentions] `open-item-form` still reads a slug beside a closing word
  as an attempt to close it when the entry does not close that item, so an entry
  discussing one it is not finishing gets a warning it does not deserve.
- [worklog-read-cost] `open-item-form` is the first check whose cost grows with
  the worklog's length rather than with the diff.
- [name-index-scope] The bare-name index skips a fixed list of vendor
  directories. A repository keeping dependencies somewhere else has them in the
  index, which can satisfy a reference that should have failed.

## 2026-08-27 - Correct baseline's exit code and say what it does without git

Agent: claude · Branch: main

### Intent

Every command was run in a directory with no git repository in it: audit,
summary, scaffold, start, install, doctor, and the hook on both events. Nothing
crashed. The audit reports `git=no`, scans the whole tree, and says that
coverage is not evaluated; the hook writes its cache and still exits 2 on stop.

Two things are wrong rather than broken.

`docbound baseline` exits 2 when it is run outside a git repository, and again
when the ref it is given is not a commit. Two is the code for malformed usage,
and `cli/README.md` says so: 0 success, 1 findings or a failed operation, 2
usage. In both of these the flags were fine and the operation failed, which is
1. `notFound` in `cli/index.mjs` exists for exactly this and carries a comment
saying so. It was not reached for.

The other is silence. A `.docbound/config.json` carrying a baseline in a
directory with no git is ignored without a word, because `detectChanges`
returns before it reads the key. That configuration is stale, most likely
copied in from a repository that had history, and the audit is quietly wider
than the file says. There is already a warning for a baseline that does not
resolve, and this is the same situation.

### Expected to touch

- `cli/index.mjs` — the two exit codes
- `skill/docbound/scripts/lib/changes.mjs` — the ignored-baseline warning
- `README.md`, `cli/README.md`, `docs/checks.md` — what baseline does without git
- `tests/cli.test.mjs` — the exit codes, and the no-git case

### Unknowns going in

Whether the same exit-code mistake is elsewhere in `cli/index.mjs`. Three other
calls to `fail` look like failed operations rather than usage errors, and they
predate this work.

### Outcome

No git means no crash. Every command was exercised in a directory with no
repository in it and all of them behaved: the audit reports `git=no`, walks the
tree, and says coverage is not evaluated; `scaffold`, `summary`, `start`,
`install`, and `doctor` work unchanged; the hook writes its cache, reports each
finding once, and still exits 2 on stop.

Two corrections rather than repairs.

`commandBaseline` in `cli/index.mjs` now returns `notFound` in both of its
failure paths, so running it outside a git repository or handing it a ref that
is not a commit exits 1 rather than 2. The message in the first case also says
what happens instead, since a directory with no history is not a problem to
solve. `cli/README.md` and `README.md` say the same.

`detectChanges` in `skill/docbound/scripts/lib/changes.mjs` writes a line to
stderr when a baseline is configured in a tree with no git, instead of returning
before it reads the key. That configuration is stale, and without the line the
audit is quietly wider than `.docbound/config.json` reads.

`docs/ARCHITECTURE.md` and `docs/checks.md` gained the no-git paragraph.
`tests/cli.test.mjs` gained two cases and tightened a third from "not zero" to
1, for 168 tests. Nothing deleted, no waivers, no decision record: neither
change alters what the audit decides, only how a failure is reported.

### Still open

- [cli-exit-codes] Three other calls to `fail` in `cli/index.mjs` read as failed
  operations rather than usage errors and still exit 2: a missing `--source`
  target, an ADR file that exists already, and a next-number lookup that failed.
  They predate this work and are left alone rather than swept into it.

## 2026-08-27 - Fix four false positives, add an adoption baseline, and test against real repositories

Agent: claude · Branch: main

### Intent

docbound was installed into a 107-file repository it had never seen, a
TypeScript and Go monorepo, and audited on a first run. It reported 97 errors,
and four of the classes behind them were the check being wrong rather than the
repository being undocumented.

<!-- docbound-ignore-start -->
`dead-ref` calls `pathClaim`, the loose reader, where `isPathShaped`, the strict
one, sits beside it in the same file with a comment describing this exact
failure. So a URL route written `/scan` and a prose placeholder written
`owner/repo` were both reported as missing files. `pathClaim` also tests for a
bare word before it strips a leading slash, so `/scan` passes a gate that exists
to stop it. A doc inside a Go module wrote paths relative to that module and had
nowhere to say so. `template-residue` read the `<type>` in a documented
Conventional Commits format as an unfilled placeholder. Every one of these is
error level, so every one blocks.
<!-- docbound-ignore-end -->

Two warnings were wrong for one shared reason: `mixed-indent` and `line-length`
read raw lines, so three space-indented lines inside a Go raw string made a
gofmt-clean file mixed, and a column count included text inside string literals.
The scanner that answers this exactly was built for it and never wired in.

Underneath all of it is one adoption problem that is larger than any single
check. The change set is the merge-base diff, so a repository adopting docbound
on a branch that is 128 files from main owes documentation for all 128 on the
first run. Cutting a fresh branch does not help, because the merge base does not
move. There is no way to say "start counting here".

The reason none of this was caught is that all 22 fixtures are shell scripts
that build small synthetic repositories, written by the same hand as the checks,
so each one contains the constructs its check expects. The suite measures
internal consistency. Nothing in it has ever touched code this project did not
write.

### Expected to touch

- `skill/docbound/scripts/lib/refs.mjs` — order of the bare-word test, and an anchor for module-relative paths
- `skill/docbound/scripts/lib/checks/dead-ref.mjs` — the strict reader
- `skill/docbound/scripts/lib/checks/template-residue.mjs` — a documented format is not a placeholder
- `skill/docbound/scripts/lib/checks/mixed-indent.mjs` and
  `skill/docbound/scripts/lib/checks/line-length.mjs` — through the scanner
- `skill/docbound/scripts/lib/changes.mjs`, `cli/index.mjs` — the baseline
- `skill/docbound/scripts/hook.mjs` — stop repeating findings that did not change
- `tests/` — a real-source corpus, and fixtures for each fix

### Unknowns going in

Whether a corpus of real files can be committed here without a dependency and
without vendoring somebody else's licence. Whether the baseline belongs in
config, where it is shared and reviewable, or in a git ref, where it is
per-clone. Whether `line-length` through the scanner still has anything to say
about a JSX file, or whether the default of 80 is the real problem and the
scanner only hides it.

### Outcome

Nine fixes, five decision records, and the first fixture in this repository
whose contents came from code nobody here wrote.

**The adoption problem, which was larger than any check.** `docbound baseline`
(`cli/index.mjs`, `cli/install.mjs`) writes the current commit into
`audit.baseline`. `detectChanges` uses it in place of the merge base, and
`ctx.docs()` narrows to docs changed since it while the new `ctx.allDocs()`
keeps the full corpus for `orphan-doc` and `duplicate-block`, which cannot
answer without one. An empty change set now also silences `worklog-entry`
(`skill/docbound/scripts/lib/worklog.mjs`): nothing changed, so no task
happened. Verified end to end on the 107-file repository that started this:
install, baseline, PASS, then one real edit producing exactly two findings about
that edit. `docs/decisions/0019-adoption-baseline.md`.

**Four blocking false positives.** `pathClaim` in
`skill/docbound/scripts/lib/refs.mjs` normalises a leading slash before testing
for a bare word, so a URL route is no longer a missing file. `dead-ref` reports
two levels, blocking on a token that carries an extension or a trailing slash
and warning on a slash between two bare words. `resolves` takes a third base
from a `docbound-root` anchor, so a doc inside a package can write paths the way
that package does. `stripIgnored` in `skill/docbound/scripts/lib/text.mjs` gives
a document a way to exempt a region, which is how a documented commit format
stops reading as an unfilled placeholder. Records 0020 and 0023.

**Two checks that were guessing.** `mixed-indent` reads through the span
scanner, so the space-indented JSON inside a Go raw string is not indentation;
this is the fourth check to adopt the scanner and closes half of
`[scanner-adoption]`. `line-length` enforces the width a repository configures
and says nothing when it configures none, since a default was this project's
preference wearing the check's authority. `docs/decisions/0021-line-length-needs-a-convention.md`.

**The hook's cost.** It ran after every edit and reprinted everything open each
time: 0.92 seconds and the same seventeen findings, forty times in a forty-edit
session. It now reports each finding once, remembering fingerprints under
`.docbound/`, and the stop event clears the memory and restates everything.
`docs/decisions/0022-report-each-finding-once.md`.

**Two more false positives, both found by this repository's own audit while
writing the above.** A comment naming `todo-shape` was read as a TODO, because
every check ID beginning with a marker word matched. Then, with that fixed, the
check reported its own header, which is a sentence about what a TODO is.
`todo-shape` now reads a marker only at the start of a comment body, where every
convention puts one, and not when a hyphen follows it. Both were caught by
running the audit on a change that touched the file, which is the whole argument
for this repository running its own tool.

**Tests.** 154 to 166. `tests/fixtures/adoption-baseline` and
`tests/fixtures/real-world-shapes` are new, the two `code-style` fixtures were
repointed at the two branches `line-length` now has, and `tests/hook.test.mjs`
is a new file because the script that can stop a session had no test of its own.
`docs/decisions/0024-a-fixture-of-real-world-shapes.md` records why the corpus is
distilled rather than vendored, and says plainly what that does not cover.

**Docs.** `README.md` gained the adoption step. `docs/checks.md` gained a Scope
section, the directive syntax, and rewrites of the `dead-ref`, `line-length`,
and `mixed-indent` entries. `docs/ARCHITECTURE.md` gained the config file as a
named boundary and one row in its decisions table. `docs/DEVELOP.md` documents
`allDocs()`, the two-level rule, and the instruction to point a new check at an
unfamiliar repository. `cli/README.md` says why `baseline` is not a
pass-through. `tests/README.md` records that the suite had met unfamiliar code
exactly once. `skill/docbound/SKILL.md` gained an adoption section and two
rewritten table rows, at 227 lines of its 300.

Nothing was deleted. No waivers.

### Still open

- [corpus-vendoring] `tests/fixtures/real-world-shapes/` holds shapes distilled
  from one repository rather than real vendored code, so it catches the four
  constructs somebody was already bitten by and not the fifth. The way to find
  more is to install docbound into an unfamiliar repository and read the first
  run, which costs about five minutes and has no schedule attached to it.
- [baseline-drift] Nothing stops a repository moving its baseline forward to
  dodge findings. It is a tracked file, so the move shows up in review, and that
  is the whole of the defence.
- [directive-density] Decision records about checks quote the tokens they are
  about, so this change added `docbound-ignore` regions to six docs in a
  repository that had none. That is denser than
  `docs/decisions/0020-doc-local-directives.md` says the markers should be, and
  whether it is the category or the mechanism is not yet clear.
- [hook-memory-lifetime] A finding reported once can scroll out of an agent's
  context and not be mentioned again until the stop hook blocks. If that happens
  in practice the memory should expire on a timer rather than lasting a session.
- [nested-directives] `docbound-ignore` regions do not nest; the first end
  marker closes the region. This was found by nesting two of them by accident
  while writing the records above.

## 2026-08-27 - Remove every self-serving metric, and say when there is nothing to summarise

Agent: claude · Branch: main

### Intent

The cost footer moved behind a flag in the previous entry, which treated the
symptom. Searching for the rest of the pattern finds four places where this
project measures its own virtue: the ratio in `README.md`, a claim in
`skill/docbound/SKILL.md` about the difference between a few thousand tokens and
re-reading the tree, the `--cost` output, and the `cost` function computing it.

Every one of them rests on a counterfactual the tool invented about itself: what
reading the source *would have* cost. Nobody measured that. It is a number
chosen to make a comparison come out well, and a flag does not fix that, it just
makes it opt-in.

What is verifiable is the mechanism. The summary reads documentation and never
source, and a test proves it by planting a marker in a source file and requiring
the output never to contain it. That claim a reader can check. Anyone wanting to
know the size of the output can measure it, and does not need this project's
arithmetic to do so.

Second: on a repository with no documentation the summary prints a heading and a
paragraph of apology. It should say plainly that there is nothing, name the files
it looked for, and give the command that creates them. A developer trying this
for the first time most likely has an undocumented repository, so that path is
the first impression, not the edge case.

### Expected to touch

- `skill/docbound/scripts/summary.mjs` - drop `--cost`, report what is missing
- `skill/docbound/scripts/lib/digest.mjs` - drop `cost`, add what was not found
- `README.md`, `skill/docbound/SKILL.md` - claim the mechanism, not a ratio
- `docs/decisions/` - a record superseding 0017
- `tests/summary.test.mjs`

### Unknowns going in

- Whether anything else in the repository is shaped the same way. The two found
  so far were both caught by reading rather than by a check, so the search has
  to be by hand.

### Outcome

**All four removed.** `--cost`, the `cost` function, the ratio in `README.md`,
and the claim in `skill/docbound/SKILL.md` about a few thousand tokens against
re-reading the tree. Each rested on what reading the source *would have* cost,
which nobody measured.

What replaces them is the mechanism: the summary reads documentation and never
source. `README.md` says so and points at the test that proves it, by planting a
marker in a source file and requiring the output never to contain it. How much
that saves depends on the repository, and the reader has one.

**The empty case says so plainly.** A repository with nothing gets
`## Nothing to summarise`, the list of files that were looked for, and the
command that creates them. A repository with some of them gets `## Not found`
and the list, without the apology, since it does have something.

**The rule this generalises to**, in
`docs/decisions/0018-no-self-serving-metrics.md`: a metric this project reports
about itself must be something a reader could measure without it. Sizes, counts,
and findings qualify. A comparison against work that was never done does not.

**The first test I wrote for this was wrong.** It scanned the whole summary of
this repository for the word "token" and failed, because the summary faithfully
quotes an open item and a record title containing it. The summary was reproducing
content, not making a claim. Narrowed to the fixture for the broad check and to
the removed footer's exact phrasings for the real one.

`docs/decisions/0017-summary-describes-the-project.md` is superseded, its Status
line changed and its body untouched. Third supersession, and the chain reads
0012 built it, 0017 hid it, 0018 removed it.

### Still open

- [self-serving-metrics] closed: all four removed, and
  `docs/decisions/0018-no-self-serving-metrics.md` states the rule that would
  catch the next one. Nothing checks for it, which the record says outright,
  because a check would have to recognise a counterfactual.
- [readme-cost-figures] closed: the figures are gone rather than kept accurate.
- [empty-repo-guidance] The summary now names the files it looked for, and
  `scaffold` creates all of them at once. Someone with a partially documented
  repository has no command that creates only what is missing.
- [token-estimates] closed: the token figures are gone; the summary makes no claim about what it saved

## 2026-08-27 - Take the cost footer out of the summary

Agent: claude · Branch: main

### Intent

`summary` ends every run with what it cost against what reading the source would
have cost. That footer answers a question nobody asked at the moment they ran
the command. They asked what the project is.

It is also read by an agent loading the output into context, which pays tokens
for a sentence about how few tokens it is paying. The tool talking about itself,
in the output meant to talk about the project.

The previous entry made it worse rather than better. Finding the figure absurd
on a one-file repository, I suppressed it below a ratio threshold, which means
hiding the number when it is unflattering and showing it when it flatters. That
is what a self-serving metric is. Two entries earlier I removed build output
from the source total for inflating the same ratio and did not notice the footer
was built on that impulse throughout.

The measurement should stay reachable, because
`docs/decisions/0012-summary-from-docs.md` is right that a claim about token
economics nobody can check is marketing. Reachable is a flag. Unconditional is
advertising.

That record's Decision section says the output ends with the cost line, so
reading it alone would now mislead. It is superseded rather than edited.

### Expected to touch

- `skill/docbound/scripts/summary.mjs` - the footer moves behind `--cost`
- `docs/decisions/` - a record superseding 0012, and 0012's Status line
- `README.md` - the claim, with how to reproduce it
- `tests/summary.test.mjs` - both paths

### Unknowns going in

- Whether a flag is the right home or whether the measurement belongs in the
  README alone. A flag lets a reader reproduce the README's number, which is the
  part worth keeping.

### Outcome

The footer moved behind `--cost`. Asked for, never volunteered. The default
output now ends with the project's open items, which is the last thing worth
reading rather than the first thing worth boasting about.

The threshold went with it. A figure reported on request can be unflattering,
because the person asking wanted the figure rather than the reassurance, and a
measurement that appears only when it is good is not a measurement. `--cost` on
a one-file repository says the summary cost more than the source would have, and
that is the correct answer.

`README.md` carries the claim and names the flag that reproduces it, which is
what `docs/decisions/0012-summary-from-docs.md` was reaching for. Its numbers
were stale as well, quoting 2,400 against 69,000 where it is now roughly 5,000
against 88,000.

`docs/decisions/0017-summary-describes-the-project.md` supersedes 0012, whose
Decision section says the output ends with the cost line and would now mislead
anyone reading it alone. Its Status line changed and its body did not. Second
supersession in this repository.

The test that asserted the footer was there now asserts it is not, and that
`--cost` reports the number on a small repository as well as a large one.

### Still open

- [readme-cost-figures] The numbers in `README.md` are measured by hand and
  nothing checks them. Moving the measurement out of the run that computes it is
  what created that gap, and it is the cost named in the record.
- [stale-marker-changelog] `stale-marker` exempts the worklog and the decision
  records because both are historical by design, and does not exempt
  `CHANGELOG.md`, which is the most historical document a repository has. Past
  tense is what a changelog is for. One warning stands on that file, and
  rewording every past-tense sentence to avoid it is arguing with the tool
  rather than fixing it.
- [self-serving-metrics] Twice now a measurement in this project has been shaped
  by what it would make the project look like: build output counted into a
  source total, and a ratio suppressed when unflattering. Both were caught by
  reading rather than by any check. Worth remembering that the direction of an
  error is evidence about its cause.

## 2026-08-27 - Fix what a newcomer sees on their first run

Agent: claude · Branch: main

### Intent

Running the tool against a bare repository, the way someone trying it would,
shows two things that make the first minute worse than it needs to be.

`summary` ends with what it cost against what reading the source would have
cost. On a repository with one file that reads "about 70 tokens here, against
roughly 6 in the 1 source file", which is a saving that is a loss. The figure is
honest and printing it there is not useful.

The first finding anyone sees is `worklog-entry` saying the worklog is missing
and to open an entry from the worklog template by a path relative to the skill
payload, which a reader at their own repository root cannot find. The
actionable answer is one command, and the message should say it.

### Expected to touch

- `skill/docbound/scripts/summary.mjs` - print the comparison when it is one
- `skill/docbound/scripts/lib/worklog.mjs` - a message a newcomer can act on

### Unknowns going in

- Whether rewording a check message costs anything. `docs/checks.md` describes
  when this check fires rather than quoting it, so probably not, but the message
  is the part a user actually reads and a fixture might pin it.

### Outcome

`summary` prints the comparison only when the source is more than twice the
summary. Below that it says what it read and stops, because a saving that is a
loss is not a saving and printing it invites the reader to distrust the figure
where it is real. On this repository the comparison still prints.

`worklog-entry` names the two commands that fix it rather than a path relative
to a payload the reader cannot see from their own root. It is the first
finding anyone gets on a bare repository, so it is the message most worth
getting right.

Neither change moved a fixture: expectations record check IDs and counts rather
than message text.

### Still open

- [first-run] Nothing tests the first-run experience end to end. Both of these
  were found by running the tool against a bare repository by hand, which is not
  a thing the suite does. A fixture that asserts on the *text* a newcomer sees,
  rather than on which checks fire, would have caught them.

## 2026-08-27 - Move comment-sentence and todo-shape onto the scanner

Agent: claude · Branch: main

### Intent

`comment-sentence` reads one line at a time, so the continuation of a wrapped
sentence is judged as its own comment and found to be a fragment. Every file in
this repository whose header is a wrapped paragraph trips it. The item has been
restated in six entries, which is more than any other, and it is the clearest
evidence the check is wrong rather than the code.

The scanner makes the fix structural rather than another heuristic. A run of
adjacent comment lines is one thing a reader reads, so it is one thing to judge.
`todo-shape` moves at the same time because it currently searches any line
containing a comment marker, which includes a marker inside a string.

The counts in the existing fixtures must not move. If they do, either the
grouping is wrong or a fixture was passing for a reason nobody checked.

### Expected to touch

- `skill/docbound/scripts/lib/scan.mjs` - comment bodies, opener stripped
- `skill/docbound/scripts/lib/checks/comment-sentence.mjs` - judge runs
- `skill/docbound/scripts/lib/checks/todo-shape.mjs` - read comment spans
- `tests/` - a fixture for the wrapped sentence
- `docs/` - the check reference and this entry

### Unknowns going in

- What breaks a run. A directive and a line of commented-out code are not prose
  and should not be swallowed into a paragraph beside them, but deciding that
  means classifying each line before grouping rather than after.
- Whether grouping changes the ratio the fragment finding is based on. Fewer,
  longer units means a different denominator, and the threshold was chosen
  against the old one.

### Outcome

**`comment-sentence` judges runs.** `runsOf` classifies each comment first, then
groups the prose ones that sit on adjacent lines. Classification comes first so
a directive or a line of commented-out code ends a run rather than being
absorbed into the paragraph beside it, which would change what that paragraph
appears to say.

**The counts did not move.** `code-style`, `code-style-editorconfig`,
`test-file-exempt`, and the subagent fixtures all report exactly what they
reported before. The denominator changes, since runs are fewer than lines, but
the finding does not, which is what the Unknown asked about.

**The payoff is on this repository.** Every `comment-sentence` warning it was
carrying is gone. That is the item restated in six entries, and the warnings
were the check being wrong rather than the comments being bad.

**`todo-shape` reads comments only**, so a marker inside a string literal is no
longer a TODO. It now reports two warnings against
`skill/docbound/scripts/lib/checks/todo-shape.mjs`, whose own prose names the
markers it looks for. That is [self-referential-checks], already open, and it is
the check being right about text that happens to be about itself.

**The fixture is evidence.** `wrapped-comment` holds two wrapped paragraphs
across five comment lines. Run through the old line-based path directly: five
comments, five fragments, fires. Through runs: two sentences, silent.

186 tests.

### Still open

- [comment-sentence-wrapping] closed: `comment-sentence` groups adjacent comment
  lines into a run and judges the run, so a wrapped sentence is one sentence.
- [scanner-adoption] `restating-comments` is the last check reading source with
  a regular expression. It compares a comment against whichever line sits
  nearby, and moving it means deciding what a comment is attached to, which is
  a question the scanner does not answer.

## 2026-08-27 - Move logic-touched onto the scanner

Agent: claude · Branch: main

### Intent

`logic-touched` is the check that stops a documentation subagent editing logic,
names, or tests. It compares the coder's end state against the subagent's with
comments stripped, and it strips them with a regular expression that cannot tell
a comment marker inside a string from a comment.

The failure is demonstrable. A Python line reading
`URL = "https://x.com/#frag"  # the fragment is ignored` keeps its trailing
comment after stripping, because the heuristic sees a quote earlier on the line
and gives up. Edit only that comment, which the subagent is explicitly allowed
to do, and the check reports that logic moved. It is a false accusation from the
one check whose job is trust.

The scanner landed in the previous entry with nothing reading it. This is the
first check to move, chosen because the correctness win is unambiguous and the
check is a warning, so being wrong in a new way costs a line of output rather
than a blocked task.

One thing has to be got right rather than assumed. `maskNonCode` blanks strings
as well as comments, and a string literal is logic: changing one is exactly the
edit this check exists to catch. So the mask this check needs is narrower, the
documentation-bearing spans only, which means comments everywhere plus
triple-quoted strings in the languages that use them as docstrings.

### Expected to touch

- `skill/docbound/scripts/lib/scan.mjs` - a mask for documentation spans
- `skill/docbound/scripts/lib/languages.mjs` - which strings carry docs
- `skill/docbound/scripts/lib/checks/logic-touched.mjs` - read the scanner
- `tests/fixtures/` - a fixture for the case that is wrong today
- `docs/ARCHITECTURE.md` - the known gap this closes

### Unknowns going in

- Whether blanking rather than deleting makes a comment's length significant. It
  does, so the comparison has to normalise, and getting that wrong turns a
  reworded comment into a finding.
- Whether the two existing subagent fixtures still produce identical output. If
  they do not, either the change is wrong or the fixture was passing for the
  wrong reason.

### Outcome

**`logic-touched` reads the scanner.** `logicOf` in
`skill/docbound/scripts/lib/checks/logic-touched.mjs` masks documentation and
falls back to the old regular expression for a language the table has no entry
for, so nothing degrades below where it was.

**The mask had to be narrower than the one that already existed.** `maskNonCode`
blanks strings, and a string literal is logic: blanking it would hide exactly
the edit this check exists to catch. `maskDocumentation` blanks comments plus
strings a language uses as docstrings, which the table now marks with `doc`, and
keeps ordinary literals. Three behaviours, each a test: rewording a comment is
not a change, moving a string literal is, adding a docstring is not.

**Blanking made a comment's length significant**, exactly as the Unknown
predicted. A longer sentence left more spaces and read as a different program.
The mask trims trailing whitespace per line and drops empty lines, which is what
the regular expression did by deleting rather than blanking.

**The fixture is evidence rather than decoration.** `subagent-comment-in-string`
has a subagent reword one comment on a line whose string contains a `#`. Running
both paths over that input directly: the regular expression reports a
difference, the scanner does not. Without checking that, a passing fixture would
only have shown the check staying quiet, which it could do for the wrong reason.

The three existing subagent fixtures produce identical output, which is the
other half of the evidence.

`docs/ARCHITECTURE.md` loses the known gap about a comment marker inside a
string literal and gains the ones the scanner actually has: no entry for the
JSX-shaped languages, and template literal interiors read as string.

180 tests.

### Still open

- [scanner-adoption] Three checks still read source with regular expressions:
  `comment-sentence`, `restating-comments`, and `todo-shape`. Moving
  `comment-sentence` also closes [comment-sentence-wrapping], since a run of
  comment lines is one span to the scanner.
- [suite-runtime] Measured rather than assumed: 151 tests in 11 seconds,
  including `npm pack`. I had claimed the suite was past a minute, which came
  from the timeouts I set around it rather than from timing it. Nothing to fix,
  and worth remembering that a number nobody measured is not a number.

## 2026-08-27 - Add a span scanner, with no check depending on it yet

Agent: claude · Branch: main

### Intent

Four checks read source with regular expressions and each is approximate in a
way that shows. `logic-touched` strips comments with a regex, so a comment
marker inside a string literal is misread, which `docs/ARCHITECTURE.md` lists as
a known gap. `comment-sentence` reads line by line and calls the continuation of
a wrapped sentence a fragment. A doc citing `src/app.py:refresh()` has its path
checked and its symbol thrown away, so the style guide asks for a reference the
audit never verifies.

All of that wants one capability, and it is smaller than it looks: knowing what
kind of span a character sits in. Code, line comment, block comment, or string.
That is a lexer with a per-language delimiter table, which is how `tokei` and
`cloc` work, and not a parser. Tree-sitter builds a concrete syntax tree because
editors need one; nothing here does.

Buying it instead would cost a native module or a WASM runtime plus a grammar
per language, which ends `cp -R dist/payload` as an install path and ends the
claim of no dependencies. It would also make a finding depend on what someone
installed, and a check that reports differently on two machines is worse than
one that is consistently approximate.

This lands the scanner alone. No check reads it yet, so the audit behaves
identically and every fixture keeps its current expectations. The scanner is
judged on its own tests before anything depends on it.

Two things shape the implementation rather than decorate it. The hook runs this
after every file edit, over source from repositories nobody here has read, so a
pathological input must not hang a developer's session: hard caps, guaranteed
forward progress, and no backtracking-prone matching in the loop. And an
unsupported language degrades to today's behaviour rather than to a worse guess.

### Expected to touch

- `skill/docbound/scripts/lib/scan.mjs` - the state machine
- `skill/docbound/scripts/lib/languages.mjs` - the delimiter table
- `tests/scan.test.mjs` - including the cases regular expressions get wrong
- `docs/decisions/` - the build-versus-buy record
- `skill/README.md` - what the new surface is for

### Unknowns going in

- How many languages are worth a table entry before the table becomes the
  maintenance burden the dependency was going to be.
- Whether interpolated strings need handling in this pass. Treating the inside
  of a template literal as string rather than code is the safer error, since it
  suppresses a finding rather than inventing one.

### Outcome

**The scanner**, `skill/docbound/scripts/lib/scan.mjs`, with the delimiter table
in `skill/docbound/scripts/lib/languages.mjs`. A state machine over the text
emitting contiguous spans of code, line comment, block comment, or string.
Twenty-six languages in the table; anything else returns null and the caller
keeps the line-based path.

Four surfaces on top of it. `maskNonCode` blanks non-code while keeping length
and line breaks, so a pattern run over the result reports a line number that
matches the original file. `comments` returns comment spans with their line.
`definitions` reads names from masked code, so prose cannot supply one.
`defines` answers the question a doc reference asks.

**Nothing reads it.** No check imports it, the check count is unchanged at
nineteen and four, and every fixture keeps its expectations. That was the point
of landing it alone.

**It gets right what the regular expressions get wrong.** A comment marker
inside a string, a hash inside a Python string, an escaped quote, a Python
docstring containing a hash, nesting Rust block comments against non-nesting C
ones, a quote inside a comment, and a backslash before a Go raw string's closing
backtick. Each of those is a test naming the check that is wrong about it today.

**The safety properties are tested, not asserted.** Every iteration advances, so
an unterminated block comment, a file of unbalanced quotes, and twenty thousand
nested comment openers all terminate. Input above two megabytes is declined. The
loop compares strings at an index and runs no backtracking-capable pattern over
untrusted text, and a test asserts no definition pattern nests a quantifier.
This runs from a hook after every file edit, so a file that hangs it hangs a
developer's session.

One test was wrong rather than the scanner: my Go sample opened a second raw
string, and the scanner had handled it correctly.

`docs/decisions/0016-span-scanner-not-a-parser.md` records why this was built
rather than taken, and the rule that keeps the two apart: an optional dependency
may add checks, and may never change what an existing check reports.

145 tests.

### Still open

- [scanner-interpolation] The scanner reads the inside of a template literal or
  an f-string as string rather than code. That suppresses a finding rather than
  inventing one, which is the safer error, and it is still wrong.
- [scanner-jsx] The TSX, JSX, Vue, and Svelte extensions are deliberately
  absent from the table, since each nests a second syntax. They fall back to
  the line-based path.
- [scanner-regex-literal] A JavaScript regex literal containing a quote or a
  comment marker is read wrongly. Telling a regex literal from division needs a
  parser.
- [symbol-refs] `dead-ref` still discards the symbol half of a reference. The
  scanner now makes checking it cheap, and that is the next check to move.

## 2026-08-27 - Make slugs findable, close them by command, and scan for secrets

Agent: claude · Branch: main

### Intent

Creating a slug costs nothing. Reusing one costs remembering an exact string,
and getting it slightly wrong opens a second item instead of continuing the
first, silently. That is a memory burden the design does not need to impose:
every open slug is one command away, and nothing in the loop tells anyone to
look.

Three changes, cheapest first. The loop says to check what is open before
writing a new item. `docbound close` takes a slug, refuses one that does not
exist, and appends the closing line, so a typo becomes an error rather than a
second item. A new check warns when two slugs are close enough to be a typo of
each other, which is insurance for the case where someone edits the file by
hand.

This repository also goes to a public host after this task, so the same pass
scans for anything that should not travel and brings `.gitignore` up to what a
published repository needs.

### Expected to touch

- `skill/docbound/scripts/close.mjs` - new, with the CLI pass-through
- `skill/docbound/scripts/lib/checks/open-item-typo.mjs` - new check
- `skill/docbound/SKILL.md` - the loop, and the check table
- `tests/` - the command, the check, and a fixture for it
- `.gitignore`, `docs/` - the publication pass

### Unknowns going in

- Whether a similarity check on slugs produces false positives on this
  repository's own set, where several share a prefix. If it does, the threshold
  is wrong rather than the idea.
- Whether anything sensitive has already been committed. History matters more
  than the working tree, since a push publishes all of it.

### Outcome

**The loop points at the list.** Step 5 of `skill/docbound/SKILL.md` says to run
`summary --open` before writing a new item. Free, and it removes the assumption
that anyone was holding twenty-six strings in their head.

**`docbound close` validates the slug.** `skill/docbound/scripts/close.mjs`
refuses one that is not open and prints the ones that are, so a typo through the
command is an error naming the alternatives rather than a second item. It writes
the closing line into the newest entry, because closing something belongs to the
task that closed it.

**`open-item-typo` covers the hand-edited case**, warning when two slugs sit
within two edits of each other. Zero findings against this repository's own
twenty-six slugs, which is the evidence its threshold is not obviously loose. It
says nothing about being too tight, and a three-character typo still passes.

**One real bug, found by its own test.** The section scan in `appendToStillOpen`
broke at the first `## ` heading it met, which is the newest entry's own
heading, so it never reached the section it was looking for and reported that
none existed.

**Publication pass.** No credential-shaped string in the working tree or in any
commit; every hit for "token" is the word in parser prose. No sensitive path has
ever existed in history, and no home directory appears in any added line.
`.gitignore` now covers credentials, npm pack tarballs, editor and operating
system noise, and logs, and nothing already tracked became ignored.

`docs/decisions/0015-slugs-must-be-findable.md` records why the answer was to
make the slug findable rather than to generate one or drop it.

### Still open

- [three-char-typo] `open-item-typo` compares within two edits. A slug three
  characters wrong still opens a second item silently, and raising the
  threshold would start matching genuinely different slugs.
- [close-writes-newest] `docbound close` writes into the newest entry, so a
  closing is recorded where it was noticed rather than beside the item it
  closes. A reader following one item reads two entries.
- [slug-typos] closed: docbound close refuses an unknown slug, and open-item-typo warns on a near miss

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
