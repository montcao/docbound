# Writing standard

## Reader

A strong engineer who joins in six months. No chat history, no access to whoever wrote the code, under time pressure, about to change something. They read a doc to find out what will break if they do. Write for that moment.

## Voice

Declarative. Present tense. Dry. The doc states what is, not what was intended or how the author felt about it.

- Not: "We decided to go with Redis here because it seemed like the simplest option."
- But: "The queue is Redis-backed (`worker/queue.py`). Chosen over an in-process queue so workers survive restarts. See `docs/decisions/0004-redis-queue.md`."

No second person addressed to the reader ("you'll want to"), no first person plural narrative ("we then"), no hedging ("should probably"), no praise ("elegant," "clean," "robust"), no intensifiers ("simply," "just," "very," "easily").

## Order of information

1. What must be true — invariants, constraints, contracts.
2. What must never happen — the "must not" list. This is the highest-value section in any module doc and the one nobody writes.
3. Where the seams are — what this module depends on, what depends on it, what crosses the boundary.
4. Why it is shaped this way — decisions, with what was rejected.
5. How to run, test, or exercise it.
6. Known gaps.

Features and capabilities are visible in the code. Put them last or leave them out.

## Every claim points somewhere

A doc sentence that cannot be checked against a file is an opinion. Attach a path, and a symbol when it helps: `see auth/session.py:refresh()`. The audit checks that referenced paths exist; that is the mechanism that keeps docs and code tethered.

Paths are relative to repo root, in backticks. Line numbers are forbidden — they rot on the next edit.

## Length

Shorter and true beats longer and partly true. Before adding a paragraph, ask whether deleting one would serve the reader better. A module README that fits on one screen and has a complete "must not" list is finished. A five-page one that omits the invariants is not started.

## Link, never copy

One owner per fact. If a constraint, procedure, or explanation already exists in another doc, link to it. If the existing version is wrong or missing, fix it there — take ownership of the canonical location — rather than writing a local copy. Two copies of a fact are one fact and one future lie.

## Decisions

Every decision record, whatever tier, answers three things:

1. What was the situation that forced a choice.
2. What was chosen, and what was rejected.
3. What would make us reverse it.

An accepted Architecture Decision Record (ADR) is an archive of the decision as it was made. It is never edited. If the decision changes, a new ADR supersedes it and the old one's status line changes to say so. A design doc that is half-updated to match new code is worse than one that is honestly historical.

The third is the one that gets skipped and the one that matters most. "Reverse if p99 latency exceeds 200ms under 10k concurrent sessions" is a decision that can be revisited. "We chose X" is a decision that will be re-litigated from scratch.

## Names before comments

The first tier of documentation is the identifier. A comment that exists to say what a variable, function, file, or directory is, is a rename that has not happened yet. Before writing any comment or doc sentence that explains *what* something is, try renaming it so the sentence is unnecessary. This applies at every level: local variable, function, class, file, directory.

## API docstrings — the contract

The docstring or header comment on a public function, method, class, or module is the contract of how the code must behave. Its audience is the future engineer who will call it or change it. It says:

- What the arguments are and any restrictions on them
- What is returned
- What errors or exceptions it raises, and when
- Gotchas: ordering requirements, side effects, thread-safety, cost

It does not say *why* the code behaves that way — that is an inline comment — and it does not restate the signature. "This is a hammer; use it to pound nails." Any behavior stated in a contract docstring should have a test that verifies it; if you cannot write the test, reconsider whether the claim is true.

Private helpers get no docstring unless they do something surprising. A docstring on every function is noise that hides the ones that matter.

Class and module docstrings give a short overview and, when there is more than one way to use the thing, examples — simplest first.

## Inline comments

Comments explain *why*, never *what*. If a comment could be deleted and the code would be equally understandable, delete it. If the code is so unclear that it needs a *what* comment, fix the code.

Legitimate comment triggers: a non-obvious constraint, a workaround for a specific bug elsewhere (link it), an ordering that looks wrong but is required, a performance choice that sacrifices readability, a security boundary.

## Good / bad pairs

**Module purpose**

- Bad: "This module handles user authentication and provides various utilities for managing sessions."
- Good: "Issues and validates session tokens. Owns the token format (`auth/token.py`). Must not read the user table directly — it goes through `users.Repo` so the audit log is complete."

**Architecture claim**

- Bad: "The system uses a microservices architecture with clean separation of concerns."
- Good: "Three processes: `api/` (HTTP, stateless), `worker/` (queue consumer), `scheduler/` (cron). They share a Postgres database and nothing else. Cross-process calls go through the queue, never HTTP; see `docs/decisions/0002-no-internal-http.md`."

**Decision**

- Bad: "We chose PostgreSQL for the database."
- Good: "Postgres over SQLite. SQLite would have been sufficient for load but the deployment target runs three replicas and SQLite has no story for that. Reverse if we consolidate to a single node."

**Contract docstring**

- Bad: `"""Create the app from config."""` on `create_app(config)`.
- Good: `"""Build an App. `config` is a JSON string; raises ValueError on malformed JSON and KeyError if `port` is missing. Safe to call more than once; each call is independent."""`

**Inline comment**

- Bad: `# increment the retry counter` above `retries += 1`
- Good: `# Sleep before the first retry too: the upstream rate-limiter counts the failed call.` above a `sleep()` that looks misplaced.

**Worklog outcome**

- Bad: "Implemented the feature and tests pass."
- Good: "Replaced `worker/queue.py` in-memory queue with Redis-backed. Retry policy unchanged. `worker/README.md` rewritten; ADR 0004 added. Removed the stale claim in ARCHITECTURE that workers were stateless — they were not since 0003."

**Known gap**

- Bad: "Some edge cases may not be handled."
- Good: "Token refresh during a concurrent logout is unhandled; the logout wins and the refresh returns 401. Not fixed because it requires the session store to support compare-and-swap. See `docs/decisions/0005-session-store.md`."
