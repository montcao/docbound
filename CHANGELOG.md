# Changelog

Releases only. Task history is `docs/WORKLOG.md`, and the two do not overlap.

This project follows semantic versioning. Check IDs, check levels, the waiver
grammar, the audit's JSON shape, and its exit codes are the public interface; a
breaking change to any of them is a major version and carries a decision record.

## Unreleased

### Added

- `adr-actionable` (warn). A new decision record opens with a `## What to do`
  section: one or two lines for the reader who arrived mid-task and needs to
  know whether the decision changes what they were about to do. The ADR
  template carries the section, and `docs/decisions/README.md` indexes every
  record with what it means for a reader, asserted complete by
  `tests/build.test.mjs`.
  `docs/decisions/0045-a-record-says-what-to-do-about-it.md`.

### Fixed

- The plugin's skill directory carries the agent definitions, so a tool that
  copies `skills/docbound/` alone gets a working subagent with it. Installing
  from the public repository with `npx skills add` delivered the skill without
  the documenter. `docs/decisions/0044-the-skill-directory-is-self-contained.md`.

### Changed

- `README.md` says which install route sets up the hooks and which installs the
  skill alone. Only `npx docbound install` and the Claude Code plugin gate a
  session; the rest leave the audit to be run deliberately.

- `.github/workflows/ci.yml` and `.github/workflows/publish.yml` pin
  `actions/checkout` and `actions/setup-node` by commit rather than by tag, and
  `.github/dependabot.yml` proposes the updates weekly. `id-token: write` is
  scoped to the publish job, neither checkout persists its credentials, both
  jobs carry a timeout, and the publish job installs a pinned npm major rather
  than whatever `latest` resolves to.
  `docs/decisions/0043-actions-are-pinned-by-commit.md`.

## 0.2.0 — 2026-09-03

### Fixed

- `stale-marker` and `dead-ref` exempt every document that records the past:
  the worklog, the archives `prune` writes under `docs/worklog/`, the decision
  records, and `CHANGELOG.md`. A changelog is written in the vocabulary
  `stale-marker` matches, so every repository with one got a finding for writing
  it correctly, and archiving a worklog turned its history into blocking
  findings. `docs/decisions/0041-the-historical-set-is-every-record-of-the-past.md`.
- `dead-ref` treats a known extension as a path claim with or without a
  directory in front of it. A backticked file name that named nothing was
  reported with the advice to "write the extension", which it already carried.
  `docs/decisions/0042-a-known-extension-is-a-path-claim.md`.
- `scripts/release.mjs` checks the exit status of `git add`, `git commit`, and
  `git tag`. A failed commit left the tag on the previous commit while the
  script reported success.
- `.github/workflows/ci.yml` declares `permissions: contents: read` rather than
  inheriting the repository default.
- A comment-dense file inside the two-megabyte size cap no longer stalls the
  hook. `comments()` and `definitions()` asked for a line number per result and
  each answer counted newlines from the start of the file, so a 1 MB file of
  comments took nine seconds while the scan under it took four. It now takes 27
  milliseconds, and `tests/scan.test.mjs` holds it to a budget.
  `docs/decisions/0040-line-numbers-are-looked-up-not-counted.md`.
- `docs/checks.md` opened by counting twenty-four checks when there were
  twenty-five. The count is asserted by `tests/build.test.mjs` now, like the
  README's.
- `template-residue` matches the exact placeholder vocabulary the templates
  ship, instead of any angle-bracketed token minus an HTML allowlist. It blocked
  on ordinary prose — a TypeScript return type, an HTML element named in a style
  guide — in a repository that had never run the scaffold.
  `docs/decisions/0033-template-residue-is-a-closed-set.md`.
- The reference commit comes from refs/remotes/origin/HEAD before the guessed
  list of main and master, and the audit prints the ref it compared against. A
  clone whose default branch was neither had all 128 of its files reported as
  undocumented, with nothing in the output naming the comparison.
  `docs/decisions/0034-ask-git-for-the-default-branch.md`.
- `dep-adr` compares the dependency-bearing part of a manifest and treats any
  change to a lockfile as a dependency change. It blocked an npm script rename
  and missed `npm audit fix`, which was both directions of wrong.
  `docs/decisions/0035-dep-adr-reads-the-dependencies.md`.
- `new-dir-readme` skips a directory whose every source file is named by a
  framework rather than by a person. One Next.js application produced fifteen
  blocking findings on its first audit, each asking for a README beside a route
  handler. `docs/decisions/0036-route-directories-are-not-modules.md`.
- `npx docbound install` says what `baseline` is for when the repository has
  history, since without it the first stop after an install audits the whole
  branch. `docs/decisions/0038-install-points-at-baseline.md`.
- `doc-coverage` no longer fires when a source edit touched only comments and
  docstrings. Appending one comment line to a file blocked, with no contract
  change to document, which is how a gate gets switched off.
  `docs/decisions/0031-comment-edits-need-no-doc.md`.

### Changed

- A worklog entry is two or three lines. `Expected to touch` and `Unknowns going
  in` are gone from the template, since both were plans and the diff carries a
  plan better. `entry-length` (warn) counts prose in the newest entry and argues
  above twelve lines. This project's own log averaged 94 lines an entry while
  the skill asked for two to four sentences, so the instruction is now a count.
  `docs/decisions/0032-worklog-entries-are-short.md`.

### Added

- `CODE_OF_CONDUCT.md`, the Contributor Covenant 2.1, with reports going through
  the same private GitHub channel as a security report.
- `NOTICE.md` is inside the npm `files` whitelist, so the tarball carries the
  attribution the licence asks to travel with it. npm adds `LICENSE` and
  `README.md` on its own and adds nothing else, and `tests/package.test.mjs`
  now asserts all three are in the packed tree.
- `open-item-debt` (warn) reports a worklog carrying more than 25 open items,
  and `docbound prune` archives entries older than the newest ten under
  `docs/worklog/`, keeping every entry that still holds an open item. This
  project's own ledger reached 69 open against 8 closed in five days, and the
  advice to prune after a quarter had no command behind it.
  `docs/decisions/0039-the-ledger-needs-pressure.md`.
- The test suite asserts the README's countable claims: the decision-record
  count, that every check appears in the table its readers use, and that every
  check has a fixture producing it. Both numbers in the section headed
  "Evidence, rather than claims" had drifted within five days.
  `docs/decisions/0037-the-readme-counts-itself.md`.
- `.github/workflows/publish.yml`. Every push to main asks the registry whether
  the version in `package.json` is already there and stops quietly when it is.
  When it is not, it runs the three gates CI runs, prints the tarball contents,
  and publishes with provenance. Releasing is `node scripts/release.mjs
  --version X.Y.Z` followed by `git push`.

  A registry version is immutable, so publishing on every push without that
  guard fails with E403 on every push that does not change the version. With it,
  a re-run, a revert, and a merge that leaves the version alone all skip.

  The job runs in an environment named `npm`, which is where required reviewers
  are configured and where a token should be scoped if one is used. It also
  takes a concurrency group, so two pushes close together queue rather than
  racing for the same version number.
- `CONTRIBUTING.md`, `SECURITY.md`, three issue templates, and a pull request
  template. `SECURITY.md` carries the threat model, which is specific here: the
  hook runs automatically after every edit, over repositories nobody has read,
  so untrusted configuration, inputs that could hang it, and file contents
  reaching a transcript are the three things that matter.
- `README.md` opens on the audit stopping an agent mid-turn, then a command a
  reader can run on their own repository without installing anything, then the
  evidence. It also explains why over half the files here are generated.

### Removed

- `codex` as an npm keyword. Codex is not a supported provider, and a keyword is
  a claim to the person searching for one.
- `README.npm.md`, and the `readme` field in `package.json`. npm ignores that
  field and always renders the `README.md` at the tarball root, so the file was
  shipped in every tarball and shown to nobody. It carried four unsupported
  editors for as long as it existed, which is what an unread file does.

### Added

- Unix seconds, in three places. `docbound audit` prints `t=` in its header and
  a `timestamp` field in its JSON. `docbound start` writes `t=` onto the entry's
  Agent line, and the entry template carries the field for a hand-written one.
  `docbound summary` computes an age from it rather than printing a date and
  leaving the subtraction to the reader.

  This project published two claims about elapsed time that nobody measured, one
  of them describing a removal as happening months before, in a repository under
  thirty hours old. Nothing here recorded elapsed time, so an agent reading a
  worklog saw two ISO dates and reached for a phrase.
  `docs/decisions/0029-unix-timestamps-for-elapsed-time.md`.
- A `## Corrections` section appended to a decision record is now the one edit
  to its body the audit accepts, alongside the Status line. It is for a false
  statement of fact in a record whose decision still stands, where superseding
  would be wrong and leaving it would keep something untrue in an archive with
  no way to mark it. Anchored to the end so it cannot hide an edit above it.

### Fixed

- A waiver target containing a hyphen was truncated at the first one.
  `waiver: adr-immutable docs/decisions/0020-doc-local-directives.md - reason`
  parsed with a target of `docs/decisions/0020`, matched no finding, and
  dismissed nothing without saying so. Every record filename is hyphenated, so
  waiving a check against a specific record had never worked. The target is now
  one whitespace-free token and the separator needs whitespace on both sides;
  every documented form parses the same as before.
  `docs/decisions/0030-waiver-targets-hold-hyphens.md`.
- Examples in `README.md`, `docs/checks.md`, two shipped skill files, a decision
  record, and a fixture used a service name, a file name, a function name, and a
  response schema taken from repositories this project was tested against.
  Replaced with invented ones.

- `README.npm.md` advertised Codex, Gemini CLI,
  GitHub Copilot, and opencode. All four were removed in
  `docs/decisions/0008-verified-providers-only.md` and the file was never
  updated. It also gave a check count of twenty-one when there were
  twenty-three. The audit reads paths and placeholders, not a document's claims
  about the world, so nothing caught it.

### Changed

- Six sentence-level patterns went into
  `skill/docbound/references/anti-patterns.md`: the performed contrast, the
  reveal, commentary instead of content, the kicker, assembled rhythm, and
  formatting that performs. The standard already ruled out marketing and said
  nothing about prose that sounds considered while carrying nothing, which is
  the version that reaches a reader. Nothing enforces them, which is stated
  rather than hidden. `docs/decisions/0028-write-it-do-not-perform-it.md`.
- The six READMEs were edited against those patterns. Fake-strong verbs,
  puffery, metadiscourse, a heading that argued with the reader, and bold
  standing in for a heading in six places.
- Patterns 15 and 18 in `skill/docbound/references/anti-patterns.md` still told
  an agent to rename an identifier, which
  `docs/decisions/0026-docbound-does-not-recommend-logic.md` stopped this skill
  from doing and missed. Both now say to record the mismatch instead.

- **The reader is a junior engineer six months from now, not a strong engineer.**
  That line in `skill/docbound/SKILL.md` is what every instruction downstream
  follows from, and the old one produced documentation that passed every
  accuracy check while being impossible to enter. The depth is unchanged and is
  now stated as the point: a `Must not` list is a boundary, an invariant is what
  has to hold, and a reversal condition is a principal engineer saying in
  advance what would change their mind. A junior who reads a year of those
  learns to look for them.
  `docs/decisions/0027-open-plainly-then-go-deep.md`.

### Added

- `plain-opening` (warn): a README or `docs/ARCHITECTURE.md` opens with a
  sentence a reader can enter, before any identifier. Not a readability score.
  Whether prose is clear is a judgement no check can make; whether a reader was
  handed a term before a meaning is a fact about the text. Two of this
  repository's own module READMEs were reported and rewritten.

### Removed

<!-- docbound-ignore-start -->
- `line-length` and `mixed-indent`, and `skill/docbound/references/code-style.md`
  with them. Counting columns and comparing tabs to spaces says nothing about
  what a repository records about itself, and a formatter owns both, does them
  better, and does them on save. Twenty-two checks.
<!-- docbound-ignore-end -->

  Removing a check ID is a breaking change to a public interface. The
  deprecation path needs no code: a waiver naming a removed check is parsed,
  matches nothing, and dismisses nothing, so a repository carrying
  `waiver: line-length ...` keeps working and that line becomes inert.

### Changed

- **docbound documents; it does not recommend a change to logic, naming,
  structure, or formatting.** The skill's `description` claimed a
  code-communication standard, step 3 of the loop told an agent to try "a better
  name, then a clearer structure" before writing a comment, and
  `skill/docbound/references/style.md` called a comment "a rename that has not happened yet".
  All of it is gone. Step 3 now says to record why surprising code is that way;
  where a name misleads, the instruction is to write what the thing does and put
  the mismatch under `Still open` with the current name and what it appears to
  promise. `skill/docbound/references/subagent-mode.md` has had this rule from the start and it
  now applies in both modes.
  `docs/decisions/0026-docbound-does-not-recommend-logic.md`.

### Added

- `open-item-form` (warn): a slug is closed by the bullet form and not by prose,
  and an item already open is carried forward rather than restated. Writing
  `Closes [some-slug].` in an Outcome section reads like closing the item and
  does nothing, which is a wrong ledger with no other symptom. Both were done by
  hand in one real session before either was noticed.
  `docs/decisions/0025-the-slug-ledger-checks-itself.md`.
- `docbound baseline` records the commit a repository adopted docbound at. From
  then on the change set is everything since it, and the whole-repository doc
  checks report only on docs that changed since it. Installing docbound into a
  107-file repository it had never seen reported 97 errors, none of them about
  anything the person installing it had done; after this command the same
  repository passes, and the next real edit produces two findings about that
  edit. `docs/decisions/0019-adoption-baseline.md`.
- Two HTML comments a document can carry, for the cases no heuristic decides
  correctly. `docbound-root` names the directory a doc's relative paths are
  written against, for a doc inside a package. `docbound-ignore`, alone or as a
  start and end pair, exempts a region from `dead-ref` and `template-residue`,
  which is how a documented commit format stops reading as an unfilled
  placeholder. `docs/decisions/0020-doc-local-directives.md`.

### Changed

- `dead-ref` reports two levels. A token carrying an extension or a trailing
  slash says it is a path and still blocks when it does not resolve. A slash
  between two bare words is a warning, because a repository placeholder and a
  real directory have the same shape. A waiver against `dead-ref` dismisses
  both. `docs/decisions/0023-ambiguous-path-claims-are-warnings.md`.
- `line-length` enforces the width a repository configures and says nothing when
  it configures none. The old default of 80 was this project's preference
  wearing the check's authority, and on a TypeScript repository that had chosen
  no width it produced 45 findings in one component.
  `docs/decisions/0021-line-length-needs-a-convention.md`.
- The edit hook reports each finding once. It ran after every edit and reprinted
  everything open each time, so a forty-edit session put the same seventeen
  lines into the transcript forty times. The stop hook still restates
  everything and still blocks. `docs/decisions/0022-report-each-finding-once.md`.

### Fixed

- A URL route written `/scan` is no longer reported as a missing file.
  `pathClaim` tested for a bare word before stripping a leading slash, so the
  route passed the gate that exists to stop exactly that.
- `mixed-indent` reads through the span scanner, so a string literal is not
  indentation. A gofmt-clean Go file whose raw string held space-indented JSON
  was being called mixed.
- `dead-ref` stops reporting two shapes that are not repository paths: a
  container image reference or a scheme-less URL, whose first segment carries a
  dot, and a bare file name that exists elsewhere in the tree. A Go CLI's
  documentation produced nine warnings between them and every one was wrong.
- `scaffold` says that it opened a worklog entry, since the next `start`
  otherwise refuses while naming an entry the caller does not know exists.
- `skill/docbound/templates/WORKLOG-entry.md` heads an entry with a hyphen, matching what
  `start` writes. The two disagreed, so a worklog holding entries from both was
  punctuated two ways.
- `todo-shape` reads a marker only at the start of a comment body, where every
  convention puts one, and not when a hyphen follows it. Prose about markers and
  a comment naming this check were both being reported as shapeless TODOs.
- An empty change set no longer asks for a worklog entry. Nothing changed, so no
  task happened, so there is nothing to have logged.
- `docbound baseline` exits 1 rather than 2 outside a git repository and when
  given a ref that is not a commit. Two is the code for malformed usage; in both
  of those the flags were fine and the operation failed. It writes nothing in
  either case.
- A baseline configured in a tree with no git is reported on stderr instead of
  being ignored silently, since the audit is then wider than the config reads.

### Changed

- `docbound summary` makes no claim about what it saved anyone. Every such claim
  rested on what reading the source would have cost, which nobody measured. The
  `--cost` flag, the ratio in the README, and the claim in the skill text are all
  gone; what replaces them is the mechanism, which a test checks by planting a
  marker in a source file and requiring the output never to contain it.
  `docs/decisions/0018-no-self-serving-metrics.md`.
- A repository with no documentation is told there is nothing to summarise,
  given the list of files that were looked for, and pointed at `scaffold`. A
  repository with some of them gets the list of what is missing.

- `docbound summary` stops ending every run with what it cost. Someone running
  it asked what their project is, and an agent loading the output pays tokens
  for a sentence about how few tokens it is paying. `--cost` reports it when
  asked. An earlier version suppressed the figure when the ratio was
  unflattering, which is worse than printing it.
  `docs/decisions/0017-summary-describes-the-project.md`.

### Fixed

- `comment-sentence` judged each comment line separately, so the continuation of
  a wrapped sentence was a fragment and every wrapped paragraph in a file tripped
  it. A run of adjacent comment lines is now judged as one comment. A directive
  or a line of commented-out code ends a run rather than joining it.
- `todo-shape` searched any line holding a comment marker, including one inside
  a string literal. It reads comments only.

- `logic-touched` reported a logic edit when a subagent reworded a comment on a
  line whose string contained a comment marker, which is an edit its own
  contract allows. It now reads the span scanner, which tells the two apart. An
  ordinary string literal is still compared, because changing one is a logic
  change.

### Added

- A span scanner that answers what kind of span a character sits in: code, line
  comment, block comment, or string. A lexer with a per-language delimiter
  table, in the manner of `tokei`, rather than a parser, so it costs no
  dependency and every install path survives. No check reads it yet; it lands
  alone so it can be judged on its own tests.
  `docs/decisions/0016-span-scanner-not-a-parser.md` records why this was built
  rather than taken from tree-sitter.

- `docbound close retry-jitter "added jitter"`: closes a tracked open item and
  refuses a slug that is not open, printing the ones that are. A mistyped slug
  was previously a second item that looked like the first.
- `open-item-typo` (warn): two `Still open` slugs within two characters of each
  other, which is the same failure reached by editing the file by hand.
- Step 5 of the loop says to check what is already open before writing a new
  item, since every open slug is one `summary --open` away.

- `docbound start "Add rate limiting"`: writes the worklog entry skeleton so an agent
  composes the Intent and nothing else. Sections come from the template, their
  guidance text does not, and it refuses to stack on an entry that has no
  Outcome yet. `docs/decisions/0014-retroactive-slugs.md` has the reasoning.

- Open items in a worklog entry can carry a slug: `- [retry-jitter] the backoff
  has no jitter`. An item with one is declared once and stays open until a later
  entry writes `- [retry-jitter] closed: ...`, so carrying work forward costs
  nothing and never means retyping it in different words. `summary` aggregates
  by slug, which is exact, rather than guessing whether two sentences mean the
  same thing. Untagged bullets keep working and are shown while their entry is
  in view. `docs/decisions/0013-tagged-open-items.md` has the reasoning.

- `docbound summary`: what a project is, assembled from the documentation and
  no source at all. Purpose, shape, each module's contract and must-not list,
  every decision with its reversal condition, recent work, and what is still
  open. Ends with what it cost against what reading the source would have cost,
  measured rather than asserted. `--open` for unfinished work across every
  entry, `--json` for the same content as data.
  `docs/decisions/0012-summary-from-docs.md` has the reasoning.

- An architecture diagram, in Mermaid, seeded by `scaffold` from the top-level
  directories holding source and drawn the rest of the way by whoever knows why
  the edges are there.
- `diagram-refs` (error): a node label that names a path must name a path that
  exists. Only path-shaped tokens count: a file with a known extension, or a
  directory with a trailing slash. An ordinary label stays prose.
  `docs/decisions/0010-mermaid-architecture-diagram.md` has the reasoning,
  including why the diagram is not generated from the code.

## 0.1.0 (2026-08-26)

### Added

- The skill: `skill/docbound/SKILL.md`, five reference files, five templates,
  and a documentation subagent definition.
- `skill/docbound/scripts/audit.mjs`: twenty-one checks, seventeen in author
  mode and four more in subagent mode, with a waiver grammar honoured for the
  current worklog entry.
- `skill/docbound/scripts/scaffold.mjs`: bootstraps the doc structure from
  templates, never overwriting.
- `skill/docbound/scripts/hook.mjs`: a fast subset after every edit, the full
  audit on stop, exiting 2 with the findings so the agent is told why it is not
  done.
- `npx docbound`: install, update, link, audit, scaffold, adr, doctor,
  detect-providers.
- Distributions for Claude Code and Cursor, plus `dist/payload/` for vendoring
  by hand, built from one canonical source and committed so the submodule, copy,
  and plugin installs need no toolchain.
- A Claude Code plugin payload and marketplace manifest.
- Seventeen fixtures asserting exact check-ID sets.

### Supported providers

Claude Code and Cursor, each verified against the harness itself and each
recording that evidence in `cli/providers.mjs`.

Codex, Gemini CLI, GitHub Copilot, opencode, and the generic Agent Skills layout
are **not** supported. Entries for them existed during development and were
written from inference; checking them against harnesses that were available
showed the inference was wrong every time it could be tested. A wrong entry
installs the payload where the harness never reads, reports success, and loads
nothing, so none of them ship. `docs/providers.md` records what each candidate
still needs, and `docs/decisions/0008-verified-providers-only.md` records the
policy.

### Packaging

The published package is what `tests/package.test.mjs` checks: it packs the real
tarball, unpacks it, installs from it, and runs the installed audit and stop
hook. Two files the CLI reads at runtime were missing from the npm whitelist and
would have made the first command fail; the test now covers every future
omission rather than those two. `docs/decisions/0009-package-is-the-artifact.md`
records the rule that came with it: nothing under `cli/` imports from
`scripts/`, which is not published.

### Security

Three findings from a pre-release review, each fixed with a regression test:

- The configuration merge assigned keys straight from parsed JSON, so a
  repository carrying a crafted `.docbound/config.json` could reach
  `Object.prototype` through a hook that runs after every file edit. Unsafe keys
  are refused, and an object with a reassigned prototype is no longer recursed
  into.
- Installing treated a harness configuration that would not parse as an absent
  one and replaced it. A trailing comma was enough to lose a settings file. It
  now refuses, names the file, and leaves it untouched.
- The hook was documented as never emitting file contents. Two checks quote a
  truncated line inside their own message; the documentation now says which
  ones and what the limits are.

Nothing in docbound makes a network request, and it has no dependencies at
runtime or for development.

### Notes for anyone reading the commit history

The repository was built in one sitting and its history shows the corrections as
they happened, including provider entries that shipped wrong before being
removed. `docs/WORKLOG.md` carries the reasoning for each.
