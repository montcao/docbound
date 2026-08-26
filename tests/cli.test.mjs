// The CLI against real temporary projects. Every case installs into a copy of
// a fixture repository rather than a bare directory, so an install is always
// checked against a tree the audit can also run on.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, describe, test } from "node:test";

import { PROVIDERS } from "../scripts/providers.mjs";
import {
  CLI,
  buildFixture,
  removeTree,
  runAudit,
  runNode,
} from "./harness.mjs";

const built = [];
after(() => {
  for (const work of built) removeTree(work);
});

function project() {
  const fixture = buildFixture("filled-baseline");
  built.push(fixture.work);
  return fixture.repo;
}

function cli(cwd, args) {
  return runNode(CLI, args, { cwd });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

describe("docbound install", () => {
  for (const provider of PROVIDERS) {
    test(`installs for ${provider.name} at ${provider.payload}`, () => {
      const repo = project();
      const result = cli(repo, [
        "install",
        `--providers=${provider.name}`,
        "--scope=project",
        "--yes",
      ]);
      assert.equal(result.status, 0, result.stderr);
      // The payload has to land where that harness reads it. A wrong path here
      // installs a skill nothing will ever load, and nothing reports an error.
      assert.ok(
        fs.existsSync(path.join(repo, provider.payload, "SKILL.md")),
        `payload is at ${provider.payload}`,
      );
      assert.ok(
        fs.existsSync(path.join(repo, ".docbound", "config.json")),
        "writes the tracked config",
      );
      if (provider.hookFile) {
        const manifest = readJson(path.join(repo, provider.hookFile));
        const commands = JSON.stringify(manifest);
        assert.ok(
          commands.includes(`${provider.payload}/scripts/hook.mjs`),
          "the hook command points at the payload it was installed with",
        );
      }
    });
  }

  test("the Cursor manifest carries the schema version its format requires", () => {
    const repo = project();
    cli(repo, ["install", "--providers=cursor", "--yes"]);
    const manifest = readJson(path.join(repo, ".cursor/hooks.json"));
    assert.equal(manifest.version, 1);
    assert.ok(manifest.hooks.afterFileEdit[0].command.includes("--event after-edit"));
    assert.ok(manifest.hooks.stop[0].command.includes("--event stop"));
  });

  test("aliases resolve to canonical provider names", () => {
    const repo = project();
    const result = cli(repo, ["install", "--providers=claude,copilot", "--yes"]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(repo, ".claude/skills/docbound/SKILL.md")));
    assert.ok(fs.existsSync(path.join(repo, ".github/skills/docbound/SKILL.md")));
  });

  test("installs two providers at once and wires both hooks", () => {
    const repo = project();
    const result = cli(repo, [
      "install",
      "--providers=claude-code,codex",
      "--scope=project",
      "--yes",
    ]);
    assert.equal(result.status, 0, result.stderr);

    assert.ok(fs.existsSync(path.join(repo, ".claude/skills/docbound/SKILL.md")));
    assert.ok(fs.existsSync(path.join(repo, ".agents/skills/docbound/SKILL.md")));
    assert.ok(fs.existsSync(path.join(repo, ".claude/skills/docbound/scripts/audit.mjs")));

    const claude = readJson(path.join(repo, ".claude/settings.json"));
    assert.ok(claude.hooks.PostToolUse[0].hooks[0].command.includes("hook.mjs"));
    assert.ok(claude.hooks.Stop[0].hooks[0].command.includes("--event stop"));

    const codex = readJson(path.join(repo, ".codex/hooks.json"));
    assert.ok(codex.hooks.afterFileEdit[0].command.includes("hook.mjs"));
  });

  test("merging a hook manifest keeps unrelated hooks", () => {
    const repo = project();
    fs.mkdirSync(path.join(repo, ".claude"), { recursive: true });
    fs.writeFileSync(
      path.join(repo, ".claude", "settings.json"),
      JSON.stringify(
        {
          model: "opus",
          hooks: {
            PostToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo hi" }] }],
          },
        },
        null,
        2,
      ),
    );

    const result = cli(repo, ["install", "--providers=claude-code", "--yes"]);
    assert.equal(result.status, 0, result.stderr);

    const settings = readJson(path.join(repo, ".claude", "settings.json"));
    assert.equal(settings.model, "opus", "unrelated settings survive");
    const commands = settings.hooks.PostToolUse.flatMap((e) => e.hooks.map((h) => h.command));
    assert.ok(commands.includes("echo hi"), "unrelated hook survives");
    assert.ok(commands.some((c) => c.includes("docbound")), "docbound hook is added");
  });

  test("installing twice does not duplicate the hook entry", () => {
    const repo = project();
    cli(repo, ["install", "--providers=claude-code", "--yes"]);
    cli(repo, ["install", "--providers=claude-code", "--yes"]);
    const settings = readJson(path.join(repo, ".claude", "settings.json"));
    assert.equal(settings.hooks.PostToolUse.length, 1);
    assert.equal(settings.hooks.Stop.length, 1);
  });

  test("--no-hooks installs the skill and no manifest", () => {
    const repo = project();
    const result = cli(repo, [
      "install",
      "--providers=claude-code",
      "--no-hooks",
      "--yes",
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(repo, ".claude/skills/docbound/SKILL.md")));
    assert.ok(!fs.existsSync(path.join(repo, ".claude/settings.json")));
    const local = readJson(path.join(repo, ".docbound", "config.local.json"));
    assert.equal(local.hook.enabled, false, "the developer's choice is recorded");
  });

  test("an unknown provider is a usage error", () => {
    const repo = project();
    const result = cli(repo, ["install", "--providers=emacs", "--yes"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown provider/);
  });

  test("an installed project still passes its audit", () => {
    const repo = project();
    cli(repo, ["install", "--providers=claude-code,codex", "--yes"]);
    const { json, status } = runAudit(repo);
    assert.deepEqual(json.errors, []);
    assert.equal(status, 0);
  });

  test("a tracked config is never overwritten by a second install", () => {
    const repo = project();
    cli(repo, ["install", "--providers=claude-code", "--yes"]);
    const configFile = path.join(repo, ".docbound", "config.json");
    const edited = { ...readJson(configFile), hook: { blockOnStop: false } };
    fs.writeFileSync(configFile, JSON.stringify(edited, null, 2));

    cli(repo, ["install", "--providers=claude-code", "--yes"]);
    assert.equal(readJson(configFile).hook.blockOnStop, false);
  });
});

describe("docbound update", () => {
  test("reports a current install and is idempotent", () => {
    const repo = project();
    cli(repo, ["install", "--providers=claude-code", "--yes"]);

    const first = cli(repo, ["update"]);
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /current/);

    const second = cli(repo, ["update"]);
    assert.equal(second.stdout, first.stdout, "update is idempotent");
  });

  test("replaces a payload that drifted", () => {
    const repo = project();
    cli(repo, ["install", "--providers=claude-code", "--yes"]);
    const skill = path.join(repo, ".claude/skills/docbound/SKILL.md");
    fs.writeFileSync(skill, "edited by hand\n");

    const result = cli(repo, ["update"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /updated/);
    assert.notEqual(fs.readFileSync(skill, "utf8"), "edited by hand\n");
  });

  test("update with nothing installed exits 1", () => {
    const repo = project();
    const result = cli(repo, ["update"]);
    assert.equal(result.status, 1);
  });
});

describe("docbound link", () => {
  test("links the payload from a checkout path", () => {
    const repo = project();
    const source = path.dirname(path.dirname(CLI));
    const result = cli(repo, [
      "link",
      `--source=${source}`,
      "--providers=claude-code",
    ]);
    assert.equal(result.status, 0, result.stderr);

    const target = path.join(repo, ".claude/skills/docbound");
    assert.ok(fs.lstatSync(target).isSymbolicLink(), "the payload is a link");
    assert.ok(fs.existsSync(path.join(target, "SKILL.md")), "the link resolves");
    assert.ok(fs.existsSync(path.join(repo, ".claude/settings.json")), "hooks are wired");
  });

  test("link without a source is a usage error", () => {
    const repo = project();
    const result = cli(repo, ["link", "--providers=claude-code"]);
    assert.equal(result.status, 2);
  });
});

describe("docbound audit, scaffold, adr, doctor", () => {
  test("audit passes through and reports the repository's state", () => {
    const repo = project();
    const result = cli(repo, ["audit", "--root", repo]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /PASS/);
  });

  test("scaffold never overwrites an existing doc", () => {
    const repo = project();
    const before = fs.readFileSync(path.join(repo, "README.md"), "utf8");
    const result = cli(repo, ["scaffold", "--root", repo]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(path.join(repo, "README.md"), "utf8"), before);
  });

  test("adr prints the next number and writes the file", () => {
    const repo = project();
    const bare = cli(repo, ["adr"]);
    assert.equal(bare.stdout.trim(), "0002");

    const made = cli(repo, ["adr", "--title=Use a Redis backed queue"]);
    assert.equal(made.status, 0, made.stderr);
    const file = path.join(repo, "docs/decisions/0002-use-a-redis-backed-queue.md");
    assert.ok(fs.existsSync(file));
    const text = fs.readFileSync(file, "utf8");
    assert.match(text, /^# 0002\. Use a Redis backed queue/);
    assert.match(text, /## What would reverse this/);
  });

  test("doctor reports providers, config, and the audit result", () => {
    const repo = project();
    cli(repo, ["install", "--providers=claude-code", "--yes"]);
    const result = cli(repo, ["doctor"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\.claude\/skills\/docbound: current/);
    assert.match(result.stdout, /claude-code: hook wired/);
    assert.match(result.stdout, /config: .*config\.json/);
    assert.match(result.stdout, /audit: PASS/);
  });

  test("doctor exits 1 when the audit fails", () => {
    const fixture = buildFixture("undocumented-change");
    built.push(fixture.work);
    const result = cli(fixture.repo, ["doctor"]);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /audit: FAIL/);
  });

  test("detect-providers names what the project already has", () => {
    const repo = project();
    fs.mkdirSync(path.join(repo, ".cursor"), { recursive: true });
    const result = cli(repo, ["detect-providers"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /cursor/);
  });

  test("an unknown command is a usage error", () => {
    const repo = project();
    const result = cli(repo, ["frobnicate"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown command/);
  });
});
