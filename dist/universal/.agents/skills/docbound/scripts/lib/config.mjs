// Repository configuration for the audit and the hook.
//
// `.docbound/config.json` is tracked and holds what the whole team shares.
// `.docbound/config.local.json` is gitignored and overrides it per developer,
// which is where a hook is turned off without that showing up in a review.

import fs from "node:fs";
import path from "node:path";

export const DEFAULT_CONFIG = {
  audit: { exclude: [] },
  hook: { enabled: true, fast: true, blockOnStop: true },
};

const FAST_CHECKS = [
  "worklog-entry",
  "dead-ref",
  "template-residue",
  "adr-immutable",
];

export { FAST_CHECKS };

export function loadConfig(root) {
  const merged = clone(DEFAULT_CONFIG);
  for (const name of ["config.json", "config.local.json"]) {
    const parsed = readJson(path.join(root, ".docbound", name));
    if (parsed) mergeInto(merged, parsed);
  }
  return merged;
}

function readJson(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    // A malformed config is louder than a silent default: the developer edited
    // it and expects it to take effect.
    process.stderr.write(`docbound: ignoring ${file}: ${err.message}\n`);
    return null;
  }
}

function mergeInto(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(target[key])) {
      mergeInto(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
