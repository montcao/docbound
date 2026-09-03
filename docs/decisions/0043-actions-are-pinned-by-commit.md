# 0043. Workflow actions are pinned by commit, and the release token is scoped to the job that needs it

- Date: 2026-09-02
- Status: accepted
- Supersedes: none

## Context

This package publishes from GitHub Actions with npm provenance, so the workflow
holds an identity the registry trusts. Two things reached that identity without
being examined.

`actions/checkout@v4` and `actions/setup-node@v4` are tags, and a tag is a name
its owner can move. Whoever controls those repositories, or anyone who gains
control of them, chooses what code runs in a job that can mint a publishing
identity for this package. Both are GitHub's own actions, which lowers the
probability and does not change the shape.

`id-token: write` was declared at the top of `publish.yml`, so it applied to
every job in the file. There is one job today. A second job added later would
inherit the permission without anybody deciding it should.

Two smaller things in the same job. `actions/checkout` writes its token into
`.git/config` by default, where every later step can read it, and nothing here
pushes. And the publish step ran `npm install -g npm@latest`, which installs
whatever was published to the registry most recently — an unreviewed upgrade
inside the one job that cannot be taken back.

## Options

### Trust the tags

What every getting-started example does, and it is one supply-chain incident
away from publishing somebody else's code under this name.

### Pin and leave them

Removes the mutable reference and replaces it with a stale one. A pinned action
never gets its security fixes, and nothing says so.

### Pin, and automate the unpinning

A commit pin plus a bot that opens a pull request when the action moves. The pin
is reviewed on the way in, like any other change to what runs here.

## Decision

Both actions are pinned to full commit SHAs in `.github/workflows/ci.yml` and
`.github/workflows/publish.yml`, each carrying the tag it was resolved from and
the date. `.github/dependabot.yml` watches the `github-actions` ecosystem
weekly and proposes the moves. No npm ecosystem is configured, because there
are no dependencies to update.

`id-token: write` moves from the workflow to the `publish` job.
`persist-credentials: false` on both checkouts. `npm@latest` becomes `npm@12`.
Both jobs take a `timeout-minutes`, since a hung publish holds the concurrency
group and blocks every release behind it.

## Consequences

Upgrading an action is now a pull request rather than an invisible change, which
is the point and is also friction: an action that fixes a bug in itself does not
reach this repository until somebody merges the bot's pull request.

The pinned SHAs are v4 while v7 of both actions exists. Pinning what is already
running keeps this change to one thing; the upgrade arrives as Dependabot's
first pull request and is verified by CI rather than by assertion.

`npm@12` will go stale the same way. Trusted publishing needs a recent npm, so
this pin is load-bearing and a major version behind will eventually fail the
publish rather than silently misbehave.

## What would reverse this

If Dependabot's pull requests go unmerged for long enough that the pins are the
security problem rather than the tags were, the honest answer is to un-pin the
actions published by GitHub itself and keep the pins for everything else.
