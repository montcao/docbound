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

A dependency swap noted as one row in a module README's decisions table; or a local implementation choice inside one module written up as a full Architecture Decision Record (ADR).

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

## 15. The comment that stands in for a name

A comment whose whole content is the meaning of an identifier next to it.

Tell: delete the comment and the only thing lost is a definition the reader could have got from a better name.

It reads as documentation and behaves like a liability: nothing keeps it in step with the code, and the next reader trusts it. Say what the code is *for*, which a name cannot carry, and record the naming mismatch under `Still open` rather than fixing it here.

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

The comment is doing the name's job, so it will drift out of step with the code and mislead. Write what the line is *for* instead, and put the mismatch under `Still open` with the current name and what it appears to promise. This skill does not rename things.

---

The rest are sentence-level. They are what makes a document read as assembled rather than written, and each survives every check in this skill, because every one of them is a judgement about English. Adapted for technical documentation from a set of AI writing patterns; `NOTICE.md` has the attribution.

## 19. The performed contrast

"The question is not the model. It is the eval." "Not a linter. A discipline."

Tell: a sentence that defines a thing by what it is not, or a pair where the first half exists to be knocked down.

State the second half and delete the first. "The eval matters more than the model." A reader who needed the contrast to understand you needed a clearer sentence, and a reader who did not just paid for the setup.

## 20. The reveal

A short clause, a colon, then the payoff. Or the setup that promises something hidden: "the part everyone misses", "here is the thing", "what this really means".

Tell: the sentence would lose nothing if the words before the colon were deleted.

Write the plain sentence. Colons are for lists, labels, and quotes. A document that stages its own findings makes the reader wait for information they came to collect.

## 21. Commentary instead of content

"This is the important part." "Note that this matters." A trailing clause that explains the significance of the thing just said: "...highlighting the team's commitment", "...underscoring the need for care".

Tell: a sentence that describes another sentence rather than the system.

Cut it and let the fact carry the weight. If a point needs to be marked as important, it was not stated strongly enough. Replace the trailing clause with the consequence: "adds file search, so a reader finds an old draft without leaving the editor".

## 22. The kicker

A closing line that turns the section into an aphorism. "Documentation is a promise you keep." A final paragraph restating what the reader just read.

Tell: the last sentence adds no fact, and rereading the section without it loses nothing.

Delete it and end on the last concrete point, without replacing it with a better metaphor. A reader who has just finished the section does not need it summarised back to them.

## 23. Assembled rhythm

Stacked fragments. Three of them. Like this. Or the same sentence shape four paragraphs running. Or one thing called a check, then a rule, then a guard, then a gate, in four consecutive sentences.

Tell: read it aloud. If the cadence is doing work the content is not, or a term changes clothes between paragraphs, this is it.

Vary sentence length because the meaning calls for it, and repeat the correct word rather than rotating synonyms. In a document, a renamed concept reads as a second concept.

## 24. Formatting that performs

Bold sprinkled mid-sentence for emphasis. A bold phrase used as a heading over two sentences. A bullet list where two sentences of prose would read better. A heading over a section shorter than its own title.

Tell: remove every bold and every bullet, and the passage reads the same or better.

Use real headings for real sections. Bold marks a term being defined, not a sentence being insisted on. A list is for things that are genuinely a list.
