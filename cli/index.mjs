#!/usr/bin/env node
// npx docbound — install, update, link, audit, baseline, scaffold, adr, doctor.
//
// Zero runtime dependencies, Node 20 or later. Every interactive prompt has a
// flag equivalent, so nothing here needs a terminal to run in CI.
//
// Exit codes: 0 success, 1 findings or a failed operation, 2 usage.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PROVIDERS, PROVIDER_NAMES, providerByName } from "./providers.mjs";
import {
  copyDist,
  detectProviders,
  ensureConfig,
  installedPayloads,
  installedProviders,
  linkDist,
  mergeHookManifest,
  readLock,
  recordHookChoice,
  setBaseline,
} from "./install.mjs";
import { ignoreEpipe, isEntryPoint } from "../dist/payload/scripts/lib/entry.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = path.dirname(HERE);
export const DIST_ROOT = path.join(PACKAGE_ROOT, "dist");
export const SKILL_SCRIPTS = path.join(DIST_ROOT, "payload", "scripts");

const USAGE = `docbound — documentation discipline for coding agents

usage: docbound <command> [options]

  install    copy the skill into this project for one or more providers
  update     re-copy an installed skill and report what changed
  link       symlink the skill from a local checkout or submodule
  audit      run the audit (pass-through to the skill's audit.mjs)
  summary    what this project is, assembled from its docs and no source
  start      open a worklog entry, before the first edit
  close      close a tracked open item by its slug
  scaffold   create the initial docs structure
  prune      archive old worklog entries, keeping recent and still-open ones
  baseline   record the commit this repository adopted docbound at, so that
             work older than today is out of scope until it is touched
  adr        print the next decision-record number and create the file
  doctor     report what is installed, whether hooks are wired, and whether
             this repository passes its own audit

options:
  --providers=a,b   ${PROVIDER_NAMES.join(", ")} (default: detected)
  --scope=project|global
  --source=PATH     link only: the checkout to link from
  --title=TEXT      adr only
  --no-hooks        install without the blocking gate
  --yes             take the defaults, ask nothing
  --help, --version
`;

const HELP_FLAGS = new Set(["-h", "--help", "help"]);
const VERSION_FLAGS = new Set(["-v", "--version", "version"]);

export function parseCliArgs(argv) {
  const first = argv[0];
  // `docbound --help` and `docbound --version` are what people type first, and
  // a flag in the command position is not a command.
  const leading = HELP_FLAGS.has(first)
    ? "help"
    : VERSION_FLAGS.has(first)
      ? "version"
      : (first ?? null);
  const options = {
    command: leading,
    providers: null,
    scope: "project",
    source: null,
    title: null,
    hooks: true,
    yes: false,
    rest: [],
  };
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      options.rest.push(...argv.slice(i + 1));
      break;
    }
    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const value = () => (eq === -1 ? argv[++i] : arg.slice(eq + 1));
    switch (flag) {
      case "--providers":
        options.providers = value().split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "--scope":
        options.scope = value();
        break;
      case "--source":
        options.source = value();
        break;
      case "--title":
        options.title = value();
        break;
      case "--no-hooks":
        options.hooks = false;
        break;
      case "--yes":
      case "-y":
        options.yes = true;
        break;
      case "--help":
      case "-h":
        options.command = "help";
        break;
      default:
        options.rest.push(arg);
    }
  }
  return options;
}

function fail(message) {
  process.stderr.write(`docbound: ${message}\n`);
  return 2;
}

async function confirm(question, assumeYes) {
  if (assumeYes || !process.stdin.isTTY) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${question} [Y/n] `);
    return answer.trim() === "" || /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

function resolveTargets(options, root) {
  if (options.providers && options.providers.length > 0) {
    const unknown = options.providers.filter((name) => !providerByName(name));
    if (unknown.length > 0) return { error: `unknown provider(s): ${unknown.join(", ")}` };
    return { providers: options.providers.map(providerByName) };
  }
  const detected = detectProviders(root);
  if (detected.length > 0) return { providers: detected, detected: true };
  // Guessing here would install the payload somewhere unverified, report
  // success, and load nothing. Naming a provider is the user's call.
  return {
    notFound:
      `no supported harness detected in ${root} or your home directory.\n` +
      `  Name one explicitly:  --providers=${PROVIDER_NAMES.join(",")}\n` +
      "  Or copy dist/payload into wherever your tool reads skills from.\n" +
      "  Candidates not yet supported are listed in docs/providers.md.",
  };
}

/** A failed operation, not malformed usage: the flags were fine. */
function notFound(message) {
  process.stderr.write(`docbound: ${message}\n`);
  return 1;
}

function targetRoot(options) {
  if (options.scope === "global") return process.env.HOME ?? process.cwd();
  if (options.scope !== "project") return null;
  return process.cwd();
}

async function commandInstall(options) {
  const root = targetRoot(options);
  if (root === null) return fail(`unknown scope: ${options.scope}`);
  const resolved = resolveTargets(options, root);
  if (resolved.error) return fail(resolved.error);
  if (resolved.notFound) return notFound(resolved.notFound);

  process.stdout.write(`docbound ${readLock(PACKAGE_ROOT).version} into ${root}\n`);
  if (resolved.detected) process.stdout.write("detected from this project:\n");
  for (const provider of resolved.providers) {
    const hook = provider.hookFile && options.hooks ? ` + ${provider.hookFile}` : "";
    process.stdout.write(`  ${provider.name}: ${provider.payload}${hook}\n`);
  }
  if (!options.hooks) {
    process.stdout.write("  hooks: skipped (--no-hooks)\n");
  }
  if (!(await confirm("Install?", options.yes))) {
    process.stdout.write("nothing installed\n");
    return 0;
  }

  for (const provider of resolved.providers) {
    const written = copyDist(DIST_ROOT, root, provider);
    process.stdout.write(`  ${provider.name}: ${written} file(s)\n`);
    if (provider.hookFile && options.hooks) {
      mergeHookManifest(root, provider);
      if (provider.hookNote) process.stdout.write(`    ${provider.hookNote}\n`);
    }
  }
  ensureConfig(root, resolved.providers);
  recordHookChoice(root, options.hooks);
  // A repository with history gets a blocking gate and a change set covering
  // its whole branch, which on a real branch means the agent's next stop attempt
  // fails on work nobody here did. `baseline` is the answer and was findable
  // only by reading the README
  // (`docs/decisions/0038-install-points-at-baseline.md`).
  if (hasHistory(root)) {
    process.stdout.write(
      "\nThis repository has history. Run `npx docbound baseline` before your\n" +
        "next task, or the first audit asks for documentation on everything\n" +
        "your branch changed.\n",
    );
  }
  process.stdout.write("\ndone. `npx docbound doctor` reports what is wired.\n");
  return 0;
}

async function commandUpdate(options) {
  const root = targetRoot(options);
  if (root === null) return fail(`unknown scope: ${options.scope}`);
  const installed = installedProviders(root);
  if (installed.length === 0) {
    process.stderr.write("nothing installed here; run `npx docbound install`\n");
    return 1;
  }
  const lock = readLock(PACKAGE_ROOT);
  let changed = 0;
  for (const { provider, current } of installed) {
    if (current === lock.payload.hash) {
      process.stdout.write(`  ${provider.name}: current\n`);
      continue;
    }
    const written = copyDist(DIST_ROOT, root, provider);
    process.stdout.write(`  ${provider.name}: updated, ${written} file(s)\n`);
    changed += 1;
  }
  process.stdout.write(
    changed === 0
      ? "everything is current\n"
      : `updated ${changed} provider(s) to ${lock.version}\n`,
  );
  return 0;
}

async function commandLink(options) {
  if (!options.source) return fail("link needs --source=PATH");
  const source = path.resolve(options.source);
  if (!fs.existsSync(source)) return fail(`no such source: ${source}`);
  const root = targetRoot(options);
  if (root === null) return fail(`unknown scope: ${options.scope}`);
  const resolved = resolveTargets(options, root);
  if (resolved.error) return fail(resolved.error);
  if (resolved.notFound) return notFound(resolved.notFound);

  for (const provider of resolved.providers) {
    const target = linkDist(source, root, provider);
    process.stdout.write(`  ${provider.name}: ${target} -> ${source}\n`);
    if (provider.hookFile && options.hooks) mergeHookManifest(root, provider);
  }
  ensureConfig(root, resolved.providers);
  recordHookChoice(root, options.hooks);
  return 0;
}

function passThrough(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { stdio: "inherit" });
  return result.status ?? 1;
}

function commandAudit(options) {
  return passThrough(path.join(SKILL_SCRIPTS, "audit.mjs"), options.rest);
}

/**
 * Write the current commit into `audit.baseline`.
 *
 * The adoption step for a repository that already has history. Run once, after
 * install: from then on the audit asks about what changed since, and the
 * hundred files somebody else wrote last year are somebody else's.
 */
function commandBaseline(options) {
  const root = gitRoot();
  if (root === null) {
    // A failed operation, not malformed usage: the flags were fine and there is
    // simply no history here. The audit already handles this case on its own,
    // scanning the whole tree with coverage not evaluated.
    return notFound(
      "not a git repository, so there is no commit to baseline at. " +
        "The audit scans the whole tree here and evaluates no coverage, " +
        "which is what a baseline would otherwise narrow.",
    );
  }
  const requested = options.rest.find((arg) => !arg.startsWith("-")) ?? "HEAD";
  const resolved = gitOutput(root, ["rev-parse", "--verify", "--quiet", `${requested}^{commit}`]);
  if (resolved === null) {
    return notFound(`${requested} is not a commit in this repository`);
  }

  const { file, commit, previous } = setBaseline(root, resolved);
  const short = commit.slice(0, 12);
  if (previous === commit) {
    process.stdout.write(`baseline already ${short} in ${path.relative(root, file)}\n`);
    return 0;
  }
  process.stdout.write(
    `baseline ${previous ? `moved to ${short}` : `set to ${short}`} in ` +
      `${path.relative(root, file)}\n` +
      "Work before it is out of scope until a change touches it. " +
      "`docbound audit` now reports on what you do next.\n",
  );
  return 0;
}

/** True when the repository has a commit older than the one being installed into. */
function hasHistory(root) {
  const result = spawnSync("git", ["-C", root, "rev-list", "--count", "HEAD"], {
    encoding: "utf8",
  });
  if (result.status !== 0) return false;
  return Number((result.stdout ?? "0").trim()) > 1;
}

function gitRoot() {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  if (result.status !== 0) return null;
  const top = (result.stdout ?? "").trim();
  return top === "" ? null : top;
}

function gitOutput(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  if (result.status !== 0) return null;
  const out = (result.stdout ?? "").trim();
  return out === "" ? null : out;
}

function commandPrune(options) {
  return passThrough(path.join(SKILL_SCRIPTS, "prune.mjs"), options.rest);
}

function commandScaffold(options) {
  return passThrough(path.join(SKILL_SCRIPTS, "scaffold.mjs"), options.rest);
}

function commandSummary(options) {
  return passThrough(path.join(SKILL_SCRIPTS, "summary.mjs"), options.rest);
}

function commandStart(options) {
  return passThrough(path.join(SKILL_SCRIPTS, "start.mjs"), options.rest);
}

function commandClose(options) {
  return passThrough(path.join(SKILL_SCRIPTS, "close.mjs"), options.rest);
}

function commandAdr(options) {
  const root = process.cwd();
  const result = spawnSync(
    process.execPath,
    [path.join(SKILL_SCRIPTS, "audit.mjs"), "--root", root, "--next-adr"],
    { encoding: "utf8" },
  );
  if (result.status !== 0) return fail("could not determine the next number");
  const number = result.stdout.trim();

  const title = options.title ?? options.rest.join(" ").trim();
  if (!title) {
    process.stdout.write(`${number}\n`);
    return 0;
  }
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const file = path.join(root, "docs", "decisions", `${number}-${slug}.md`);
  if (fs.existsSync(file)) return fail(`${file} exists already`);

  const template = fs.readFileSync(
    path.join(PACKAGE_ROOT, "skill", "docbound", "templates", "ADR.md"),
    "utf8",
  );
  const today = new Date().toISOString().slice(0, 10);
  const body = template
    .replace("# <NNNN>. <Title: the decision, as a noun phrase>", `# ${number}. ${title}`)
    .replace("- Date: <YYYY-MM-DD>", `- Date: ${today}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  process.stdout.write(`${path.relative(root, file)}\n`);
  return 0;
}

function commandDoctor(options) {
  const root = targetRoot(options) ?? process.cwd();
  const lock = readLock(PACKAGE_ROOT);
  process.stdout.write(`docbound ${lock.version} · ${root}\n\n`);

  const payloads = installedPayloads(root);
  if (payloads.length === 0) {
    process.stdout.write("skill: not installed here\n");
  } else {
    process.stdout.write("skill:\n");
    for (const { payload, current, providers } of payloads) {
      const state = current === lock.payload.hash ? "current" : "differs from this package";
      process.stdout.write(`  ${payload}: ${state}\n`);
      for (const p of providers) {
        const hook = p.hookFile
          ? `${p.hooked ? "hook wired" : "no hook manifest"} (${p.hookFile})`
          : "no hook mechanism";
        process.stdout.write(`    ${p.name}: ${hook}\n`);
      }
    }
  }

  const configFile = path.join(root, ".docbound", "config.json");
  process.stdout.write(
    `\nconfig: ${fs.existsSync(configFile) ? configFile : "using built-in defaults"}\n`,
  );

  const audit = spawnSync(
    process.execPath,
    [path.join(SKILL_SCRIPTS, "audit.mjs"), "--root", root],
    { encoding: "utf8" },
  );
  const summary = (audit.stdout ?? "").trim().split("\n").pop() ?? "";
  process.stdout.write(`audit: ${summary || "did not run"}\n`);
  return audit.status === 0 ? 0 : 1;
}

export async function main(argv) {
  const options = parseCliArgs(argv);
  switch (options.command) {
    case "install":
      return commandInstall(options);
    case "update":
      return commandUpdate(options);
    case "link":
      return commandLink(options);
    case "audit":
      return commandAudit(options);
    case "scaffold":
      return commandScaffold(options);
    case "prune":
      return commandPrune(options);
    case "baseline":
      return commandBaseline(options);
    case "summary":
      return commandSummary(options);
    case "start":
      return commandStart(options);
    case "close":
      return commandClose(options);
    case "adr":
      return commandAdr(options);
    case "doctor":
      return commandDoctor(options);
    case "detect-providers":
      for (const provider of detectProviders(process.cwd())) {
        process.stdout.write(`${provider.name}\n`);
      }
      return 0;
    case "help":
      process.stdout.write(USAGE);
      return 0;
    case "version":
      process.stdout.write(`${readLock(PACKAGE_ROOT).version}\n`);
      return 0;
    case null:
      process.stdout.write(USAGE);
      return 2;
    default:
      process.stderr.write(`${USAGE}\ndocbound: unknown command: ${options.command}\n`);
      return 2;
  }
}

export { PROVIDERS };

if (isEntryPoint(import.meta.url)) {
  ignoreEpipe();
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (err) {
    // A refusal to touch a file the user owns is an ordinary outcome here, not
    // a crash, and it reads as one.
    process.stderr.write(`docbound: ${err.message}\n`);
    process.exitCode = 1;
  }
}
