# 0019. A recorded adoption commit, so an existing repository starts clean

- Date: 2026-08-27
- Status: accepted
- Supersedes: none

## Context

docbound was installed into a repository it had never seen: 107 files,
<!-- docbound-ignore-start -->
TypeScript and Go, seventeen commits, on a branch 128 files from `origin/main`.
<!-- docbound-ignore-end -->
The first run reported 97 errors.

<!-- docbound-ignore-start -->
None of them were about anything the person installing it had done. The change
set is the merge-base diff (`skill/docbound/scripts/lib/changes.mjs`), which is
the right answer for a change and the wrong one for an adoption: it treats the
whole branch as the work in progress, so every file on it owes documentation at
once. Cutting a fresh branch does not help, because the merge base does not
move. Agent worktrees make the long-lived branch the normal case rather than the
exception, and the repository in question had four of them.

<!-- docbound-ignore-end -->
The whole-repository doc checks compound it. `dead-ref`, `template-residue`,
`orphan-doc`, `duplicate-block`, and `stale-marker` read every doc in the tree,
so a repository adopting the discipline inherits every flaw in documentation
written before it, at error level, on the first run.

A tool whose first output is a wall of findings about somebody else's work is a
tool that gets uninstalled before anyone reads a finding.

## Options

### Leave it, and tell people to waive

Nothing to build. It also means an adoption begins with a worklog entry holding
ninety waivers, which is the exact opposite of what a waiver is for, and it
buries the one real finding under them for as long as they stand.

### Demote the blocking checks to warnings

Makes the first run survivable and makes every later run advisory. The audit
stops defining done, which is the only claim this project makes.

### Suppress findings on files older than some number of days

Needs no configuration. It also drifts: the same repository reports differently
next month for no reason anyone changed, and a finding that appears on its own
is worse than one that never appeared.

### Record the commit adopted at

`audit.baseline` in `.docbound/config.json`, written by `docbound baseline`.
The change set becomes everything since that commit, and the whole-repository
doc checks report only on docs that changed since it. Explicit, in review,
stable across machines, and reversible by deleting one key. It costs a step in
the install path and a concept to explain.

## Decision

`docbound baseline` writes the current commit into `audit.baseline`
(`cli/index.mjs`, `cli/install.mjs`). `detectChanges` uses it in place of the
merge base, and `ctx.docs()` in `skill/docbound/scripts/audit.mjs` narrows to
docs changed since it while `ctx.allDocs()` keeps the full corpus for the checks
that need one to answer at all.

`orphan-doc` still reads every doc, so a link from an older doc counts as a
link. `duplicate-block` still reads every doc, so an inherited duplicate is
found but reported only when one half of it is in scope.

A baseline that no longer resolves, after a rebase or in a shallow clone, is
reported on stderr and ignored. An audit that refuses to run is worse than one
that widens its scope.

An empty change set now also silences `worklog-entry`
(`skill/docbound/scripts/lib/worklog.mjs`): nothing changed, so no task
happened, so there is nothing to have logged.

## Consequences

Adopting docbound on an existing repository is two commands and a passing
audit. The verified sequence on the repository above: install, `docbound
baseline`, `PASS` with nothing in scope, then one real edit produces exactly two
findings, both about that edit.

The cost is that a repository which never runs `docbound baseline` gets the old
behaviour, and a repository which runs it and then never touches an old doc
never hears about that doc's problems. That is the trade, and it is the right
one: an inherited flaw nobody is working on is not this change's business, and
it surfaces the moment somebody edits the file.

`.docbound/config.json` becomes load-bearing rather than advisory. Deleting the
baseline key silently widens every audit in the repository.

Everything before the baseline is invisible to the audit, including a real dead
reference in a doc nobody has touched. `docbound audit --baseline HEAD~50`
is how to look at it deliberately.

## What would reverse this

If repositories set a baseline and then move it forward to dodge findings, the
mechanism is being used as a mute button and belongs behind something that
shows up in review, such as a required reason recorded beside it.

If most adoptions turn out to be new repositories rather than existing ones,
this is machinery for a case that does not arise, and the merge base alone was
enough.
