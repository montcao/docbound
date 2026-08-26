# scripts/reference

The Python implementation the Node audit was ported from. It is a
**specification, not an implementation**: it is not maintained, not shipped, and
not run by anything except a maintainer diffing behaviour.

It is here for one release. It is deleted in the release after this one; see
`docs/decisions/0002-node-runtime.md`.

## Use

Diff the two implementations on the same tree. Their JSON output is identical
except for one intended message change: `new-dir-readme` names the module
template at its current path, where the Python named the path it had before
`docs/decisions/0003-templates-location.md`.

```
python3 skill/docbound/scripts/reference/audit.py --root /some/repo --json
node   skill/docbound/scripts/audit.mjs          --root /some/repo --json
```

## Must not

- Must not be edited. A change here is a change to the specification the port
  was verified against, which makes the verification worthless. Behaviour
  changes go into the Node implementation and into a fixture.
- Must not be shipped. `scripts/build.mjs` excludes this directory, and
  `tests/build.test.mjs` asserts that no Python file reaches any distribution.

## Where the behaviour is pinned now

`tests/fixtures/` — seventeen scenarios, each asserting the exact set of check
IDs the audit produces. Those fixtures, not this directory, are what the next
port would be checked against.
