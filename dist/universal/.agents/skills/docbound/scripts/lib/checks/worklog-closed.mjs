// Outcome and Still open decide whether the task was closed, not merely begun.

export const id = "worklog-closed";
export const level = "error";

export function run(ctx) {
  for (const problem of ctx.worklogProblems) {
    if (problem.check === id) ctx.add(id, level, "docs/WORKLOG.md", problem.message);
  }
}
