// The entry that governs this run. Reported from the parse in `lib/worklog.mjs`
// because the same parse produces the top entry and the waivers, which every
// later check and the report depend on.

export const id = "worklog-entry";
export const level = "error";

export function run(ctx) {
  for (const problem of ctx.worklogProblems) {
    if (problem.check === id) ctx.add(id, level, "docs/WORKLOG.md", problem.message);
  }
}
