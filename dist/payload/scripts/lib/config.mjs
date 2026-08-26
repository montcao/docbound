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

// Keys that reach the prototype chain rather than the object. `JSON.parse`
// preserves them as ordinary-looking keys, and assigning one walks out of the
// object being built.
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Merge parsed configuration into a target, key by key.
 *
 * The config file is whatever the cloned repository carried, and the hook that
 * reads it runs automatically after every file edit — so this is untrusted
 * input on an automatic path, and it is treated that way.
 */
function mergeInto(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (UNSAFE_KEYS.has(key)) {
      process.stderr.write(`docbound: ignoring unsafe config key '${key}'\n`);
      continue;
    }
    if (isPlainObject(value) && isPlainObject(target[key])) {
      mergeInto(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    // A parsed object whose prototype was reassigned is not a plain object, and
    // recursing into it would merge into whatever it now points at.
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
