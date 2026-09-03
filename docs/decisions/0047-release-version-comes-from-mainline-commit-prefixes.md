# 0047. Release version comes from mainline commit prefixes

- Date: 2026-09-03
- Status: accepted
- Supersedes: none

## What to do

Write releasable work on `main` with Conventional Commit prefixes. `fix:` cuts a
patch, `feat:` cuts a minor, and a breaking marker cuts a major. The publish
workflow does the rest.

## Context

This repository had two release steps: `scripts/release.mjs --version X.Y.Z`
wrote the version, changelog, worklog, build output, commit, and tag; then a
maintainer pushed that commit to `main`, where `.github/workflows/publish.yml`
published the version if npm did not already have it.

That flow worked and it made version selection the one step that stayed manual.
The repository's own history already used `fix:` on releasable work, and the
request here is that a `fix:` or `feat:` landing on `main` should cut the next
npm release automatically.

The repository also claims zero dependencies. Adding `semantic-release` and its
plugins to `package.json` would have contradicted the rule the package,
skill, and docs all state. The existing release script already owns every
repository mutation a release needs.

## Options

Three real options.

### Keep choosing the version by hand

Leave `scripts/release.mjs --version` and the publish workflow as they were. The
least code, and it preserves the human checkpoint. It also leaves the one piece
of release state the commits already describe outside the workflow, which is the
manual step this task exists to remove.

### Adopt `semantic-release` and its plugins

Run a dedicated release tool in CI and let it infer the next version, publish to
npm, and possibly commit the updated manifests back to `main`. It is a standard
answer and it adds a second release engine beside `scripts/release.mjs`, plus
either package dependencies or a runtime install of a toolchain that this
repository otherwise keeps out of its own manifest.

### Derive the next version from the commits, then reuse `scripts/release.mjs`

Teach `scripts/release.mjs` to answer "what version comes next" from the commits
since the latest release tag, and let `.github/workflows/publish.yml` call the
same script to cut the release when one is due. A rerun can still publish a
tagged version already in git but not yet on npm, so the workflow keeps the
recovery path the old guard had.

## Decision

Use Conventional Commit prefixes on `main` to choose the next version, and keep
the release mutations in `scripts/release.mjs`. The script now answers
`--next`; `.github/workflows/publish.yml` either publishes an unpublished tagged
version already in git or runs `scripts/release.mjs --version <next>`, pushes
the release commit and tag, and publishes from that commit.

## Consequences

Releases now follow the commit history rather than a hand-picked version
argument. A maintainer merging `fix:` and `feat:` commits into `main` gets npm
versions cut automatically, and the workflow no longer depends on remembering to
run `scripts/release.mjs` locally first.

The release job now needs `contents: write`, because it pushes the release
commit and tag it creates. The checkout still keeps no credential on disk; the
push uses the job token through a one-shot HTTPS remote.

This also makes commit titles load-bearing. A bug fix merged without `fix:` in
its subject will not cut a patch, and a feature merged without `feat:` will not
cut a minor. That cost is acceptable here because the release logic is now
small, explicit, and testable in-repo rather than split across an external tool
and this repository's own script.

## What would reverse this

If the repository needs channels this simple commit-prefix rule cannot express —
pre-releases, package fan-out, richer release-note generation, or commit
discipline weak enough that maintainers keep overriding the inferred version —
move to a dedicated release tool and retire `scripts/release.mjs --next`.
