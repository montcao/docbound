// Waiver application and both output formats. The JSON shape is what the hook
// and the CLI parse, so its keys are an interface: root, git, changed, errors,
// warnings, waived.

import { isSource } from "./paths.mjs";

/**
 * Mark findings dismissed by a waiver line in the worklog entry. A waiver with
 * no target dismisses the whole check; one with a target dismisses that path or
 * anything beneath it.
 */
export function applyWaivers(findings, waivers) {
  for (const finding of findings) {
    for (const waiver of waivers) {
      if (waiver.check !== finding.check) continue;
      const matches =
        waiver.target === null ||
        finding.path === waiver.target ||
        finding.path.startsWith(`${waiver.target.replace(/\/+$/, "")}/`);
      if (matches) {
        finding.level = "waived";
        break;
      }
    }
  }
  return findings;
}

export function partition(findings) {
  return {
    errors: findings.filter((f) => f.level === "error"),
    warnings: findings.filter((f) => f.level === "warn"),
    waived: findings.filter((f) => f.level === "waived"),
  };
}

export function toJson(ctx, findings) {
  const { errors, warnings, waived } = partition(findings);
  return JSON.stringify(
    {
      root: ctx.root,
      git: ctx.git,
      changed: [...ctx.changed].sort(),
      errors,
      warnings,
      waived,
    },
    null,
    2,
  );
}

export function toText(ctx, findings) {
  const { errors, warnings, waived } = partition(findings);
  const sourceCount = [...ctx.changed].filter((c) =>
    isSource(c, ctx.excludes),
  ).length;
  const name = ctx.root.split("/").filter(Boolean).pop() ?? ctx.root;

  const out = [
    `docbound audit · mode=${ctx.mode} · root=${name} · ` +
      `git=${ctx.git ? "yes" : "no"} · ${ctx.changed.size} changed file(s), ` +
      `${sourceCount} source`,
  ];
  if (!ctx.git) {
    out.push("  (no git: whole tree scanned; doc-coverage not evaluated)");
  }
  for (const [label, group] of [
    ["ERROR", errors],
    ["WARN", warnings],
    ["WAIVED", waived],
  ]) {
    if (group.length === 0) continue;
    out.push(`\n${label} (${group.length})`);
    for (const f of group) out.push(`  [${f.check}] ${f.path}\n      ${f.message}`);
  }
  out.push("");
  if (errors.length > 0) {
    out.push(
      `FAIL — ${errors.length} error(s). Fix them or add a waiver line to the ` +
        "worklog entry, then re-run.",
    );
  } else {
    const tail =
      warnings.length > 0
        ? ` — ${warnings.length} warning(s) left on the record`
        : "";
    out.push(`PASS${tail}`);
  }
  return out.join("\n");
}
