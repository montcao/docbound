# Anti-patterns

Things to refuse to write, with the tell that identifies each. Most agent-written documentation is one of these.

## 1. Restating the code

The doc or comment says what the code visibly does.

Tell: the sentence could be regenerated from the function signature. "Returns a list of users." "Initializes the client." "This class represents a request."

Refuse it. If the code needs explanation to be understood, the code is the problem. Write the *why* or write nothing.

## 2. The docstring carpet

Every function gets a docstring, every docstring is one line, every line is pattern 1. Produces the appearance of thoroughness and zero information.

Tell: docstring count equals function count; no docstring mentions an argument restriction, an error condition, a side effect, or a gotcha.

This is not an argument against docstrings. Public-surface docstrings are the contract and belong there — arguments, returns, errors, restrictions, tested. The carpet is what happens when the same treatment is applied to private helpers and the content is the signature read aloud. Write real contracts on the public surface; write nothing on the rest unless it surprises.

## 3. Changelog-as-documentation

The doc accumulates "Update (2026-03): X now does Y" paragraphs instead of being rewritten to be true now.

Tell: a section has more than one tense, or contains the word "now," "previously," "formerly," "as of," "used to."

The worklog is the changelog. Everything else is a statement of current truth. Rewrite the paragraph.

## 4. End-of-task summary posing as architecture

Written after the code, describes the diff, gets filed as ARCHITECTURE.md.

Tell: the doc's structure mirrors the task's structure, not the system's. It mentions "this change" or "this PR." It explains what was added without explaining what the added thing must not do.

Architecture describes the system as it stands. If you find yourself writing "added X to Y," you are writing a worklog entry; put it there.

## 5. The confident vague

"Handles edge cases." "Robust error handling." "Optimized for performance." "Clean separation of concerns."

Tell: an adjective doing the work of a fact. No path, no number, no condition.

Replace with the specific: which edge cases, what happens on error, what was measured, which concerns are separated and by what mechanism.

## 6. The orphan decision

"We chose X." Nothing about the alternative, nothing about what would change the choice.

Tell: a decision with one option in it.

A decision with no rejected alternative is a fact, not a decision, and does not need a record. If it was a real choice, the rejected option and the reversal condition are the whole point.

## 7. Documentation by tone

Warm, reassuring, marketing-adjacent. "Getting started is easy!" "This powerful module lets you…" "Simply run…"

Tell: exclamation marks, "simply," "just," "powerful," "seamless," any sentence that would be at home on a landing page.

The reader is a colleague under pressure. Dry and exact is the respectful register.

## 8. The stub

A section header with "TBD," "Coming soon," or a template placeholder under it.

Tell: `template-residue` fails.

Either write the section or delete the header. A header with nothing under it tells the reader the doc is unreliable, which contaminates the sections that are filled in.

## 9. Line-number references

"See line 142 of `foo.py`."

Tell: a digit after a filename.

Rots on the next edit. Reference a symbol: `foo.py:parse_header()`.

## 10. The note-leaver's append

"Note: this was changed in task 47 to use the new API. The old behavior is described above." Left at the bottom of a section that is now false.

Tell: a doc that contradicts itself and resolves the contradiction with a footnote.

You are the owner of every doc you touch. Rewrite the section so it is true, then delete the note.

## 11. Documenting the obvious layout

A module README that lists its own files: "`utils.py` — utilities. `models.py` — models. `tests/` — tests."

Tell: the README is `ls` with prose.

The reader can run `ls`. Say what the module owns, what it must not do, and where its seams are.

## 12. Decision recorded at the wrong tier

A dependency swap noted as one row in a module README's decisions table; or a variable-naming choice written up as a full Architecture Decision Record (ADR).

Tell: cost of reversal does not match ceremony of the record.

Structural (dependency, schema, interface, boundary, hard to reverse, security/perf tradeoff) gets an ADR file. Local and cheap gets a table row. When unsure, ADR.

## 13. Editing the archive

An accepted ADR gets its body rewritten to match what the code does now.

Tell: `adr-immutable` fails; or an ADR whose Date is a year old and whose Decision section describes last week's code.

Design docs are archives once the code exists. Write a superseding ADR, point it at the old one, and change the old one's Status line. The old reasoning stays intact so the next reader can see what was believed and when.

## 14. The local copy

A paragraph — setup steps, a constraint, an explanation — copied from another doc, a wiki, or a vendor's guide into this one so the reader "has it here."

Tell: `duplicate-block` fires; or a doc restates something a link would have covered.

Link. If the canonical version is wrong, fix it there. Two copies will diverge, and the reader will not know which one is lying.

## 15. The comment that should be a name

`# user's primary email address` above `e = ...`.

Tell: the comment is a noun phrase and the identifier beside it is one to three characters or a generic word.

Rename the identifier. Delete the comment.

## 16. The TODO that is a shrug

`# TODO: fix this` / `// FIXME later` / `# TODO handle errors`.

Tell: `todo-shape` fires; fewer than six words after the marker, no owner, ticket, or reference.

A TODO is a message to a specific future reader about a specific problem. State the problem, what needs to be done, and who or what owns it — and mirror it under `Still open` in the worklog so it is visible without grepping. If you cannot say what needs doing, it is not a TODO, it is a known gap for the module README.

## 17. Fossil code

A block of commented-out code left "in case we need it."

Tell: comment lines that parse as code — assignments, calls, braces, semicolons.

Delete it. Version control is the archive. A reader cannot tell whether a fossil is a plan, a warning, or trash, and every one of them costs attention.

## 18. The comment that repairs a bad name

`x = load(p)  # x is the parsed manifest, p is the manifest path`.

Tell: a comment that defines the identifiers on its own line.

Rename: `manifest = load(manifest_path)`. Delete the comment. Naming is the first mechanism; comments are the fourth.
