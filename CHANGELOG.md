# Changelog

Releases only. Task history is `docs/WORKLOG.md`, and the two do not overlap.

This project follows semantic versioning. Check IDs, check levels, the waiver
grammar, the audit's JSON shape, and its exit codes are the public interface; a
breaking change to any of them is a major version and carries a decision record.

## Unreleased

### Added

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
