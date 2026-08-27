# 0017. The summary describes the project, and nothing else

- Date: 2026-08-27
- Status: superseded by 0018
- Supersedes: 0012

## Context

Record 0012 established that `summary` assembles an orientation from the
documentation and never reads source. That stands, and everything in this record
assumes it.

It also decided that the output ends with what the summary cost against what
reading the source would have cost, on the grounds that a claim about token
economics nobody can check is marketing. The principle is right. Putting the
measurement in every run was not.

Someone running `summary` asked what the project is. What the command cost is a
question about the command. The footer answers a question nobody asked, at the
moment they asked a different one.

It is worse for the reader the command was built for. An agent loads this output
into its context to orient, which means paying tokens for a sentence about how
few tokens it is paying.

A later change made it worse rather than better. On a one-file repository the
figure read "about 70 tokens here, against roughly 6 in the 1 source file", a
saving that is a loss, so the line was suppressed below a ratio threshold. That
is hiding the number when it is unflattering and showing it when it flatters,
which is what a self-serving metric is. Two records earlier, build output was
removed from the source total for inflating the same ratio, and the footer was
built on that impulse throughout without anyone noticing.

## Options

### Keep the footer, keep the threshold

No work. Leaves the tool advertising in the place it is supposed to be working,
and leaves a number that appears exactly when it is flattering.

### Delete the measurement entirely

Simplest, and the output is then purely about the project. It also makes the
claim in `README.md` unreproducible, which is the failure 0012 correctly named.

### Move it behind a flag

The default output is about the project. Anyone wanting to check the README's
number runs `summary --cost` and gets it. Costs one flag.

## Decision

The footer moves behind `--cost`. Asked for, never volunteered.

The wording drops the threshold with it. A figure reported on request can be
unflattering, because the person asking wanted the figure rather than the
reassurance, and a measurement that only appears when it is good is not a
measurement.

`README.md` states the number and names the flag that reproduces it, which is
what 0012 was reaching for: a claim the reader can check rather than one they
must take.

Everything else in 0012 stands. The summary reads documentation and never
source, a thin repository is reported as thin, `--open` gives the unfinished
work, and `--json` gives the same content as data.

## Consequences

The default output ends with the project's open items, which is the last thing
worth reading rather than the first thing worth boasting about.

The measurement is now something a reader has to seek out, so the README has to
carry the claim and the way to check it. If that line goes stale nothing catches
it, which is the cost of moving the number out of the run that computes it.

Two records now describe this command. Reading 0012 alone gives a decision about
a footer that no longer exists, which is why its Status line points here.

## What would reverse this

If nobody ever runs `--cost` and the README's number goes unchecked for a
release or two, the flag is surface nobody asked for and the honest form is a
line in the README plus the two commands anyone can run to measure it
themselves.
