# 0036. A route directory is not a module

- Date: 2026-08-31
- Status: accepted
- Supersedes: none

## Context

`new-dir-readme` treats a new directory holding source as a new module and asks
for a README beside it. In a file-system router that premise does not hold: the
directory is a URL segment, and the file inside it is named by the framework
rather than by whoever wrote it.

One Next.js application produced fifteen blocking findings on its first audit.
Every one of them asked for a README next to a route handler. Writing fifteen
READMEs describing the contract of a URL segment is not documentation, and the
alternative on offer was excluding half the repository from the audit.

Next.js, Remix, SvelteKit, and Nuxt all work this way, so the shape is common
enough to be worth recognising rather than leaving to per-repository
configuration.

## Options

### Let the repository exclude the route tree

`audit.exclude` already does this. It requires the user to hit fifteen errors
first, decide the tool is wrong, and edit configuration to silence it, and it
excludes real modules that happen to live under the route tree too.

### Detect the framework

Read the project's manifest, find Next or SvelteKit, and apply a per-framework
rule. Accurate, and it makes a documentation check depend on a dependency graph
it otherwise never reads.

### Recognise the reserved filenames

A directory whose entire source content is files the framework locates by name
is routing structure. The names are a small, stable, framework-independent set.

## Decision

`routeDirectory` in `skill/docbound/scripts/lib/checks/new-dir-readme.mjs`
holds the reserved basenames — route, page, layout, error, middleware, the
SvelteKit `+` forms, and the rest — and the check skips a new directory whose
every changed source file is one of them.

A directory that holds a route file beside anything else is still a module and
still asks for a README, because the thing that was chosen rather than dictated
is the part with a contract.

## Consequences

A directory whose only source file is named `index` is now exempt everywhere,
not only under a router. That is the cost of not detecting the framework: some
real modules are named that way, and this will miss them.

The set is a list of names that frameworks chose, so it dates. A framework that
adds a reserved file gets a stale answer until the list is updated, and the
failure is silent in the safe direction: an unrecognised name means the check
still asks for a README.

## What would reverse this

If a real module boundary is reported as missed because its entry file was named
`index`, narrow the exemption: require more than one reserved file, or require
a router marker at the repository root before applying it at all.
