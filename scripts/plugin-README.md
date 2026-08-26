# plugin

Build output. The Claude Code plugin payload, produced by `scripts/build.mjs`
from `skill/docbound/`.

Nothing here is edited by hand. The next build removes and rewrites the whole
directory, and `scripts/check-dist-fresh.mjs` fails the build when the committed
copy stops matching its source.

## What is in it

- A skills directory holding the payload, byte-identical to `skill/docbound/`
  minus the Python reference and the agent definitions.
- An agents directory holding the documentation subagent.
- A hooks manifest wiring `PostToolUse` and `Stop`, resolved against the
  plugin root.

## Install

```
/plugin marketplace add montcao/docbound
/plugin install docbound@montcao
```

`.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json` at the
repository root are what make that work.

## Must not

- Must not contain the CLI, the tests, or the other providers' distributions. A
  plugin is downloaded on install, and everything in it is weight for every user
  who installs it.
