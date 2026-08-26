// The provider table: where each harness expects a skill, and what its hook
// manifest looks like.
//
// This is the file most likely to need editing, because it encodes other
// people's conventions rather than this repository's. It is deliberately the
// only place those conventions appear: the build, the CLI, and the freshness
// check all read it, so adding or correcting a provider is one entry here.
//
// `payload` is where the skill directory lands, relative to the target
// repository root. `hookFile` and `hookManifest` are omitted for providers with
// no file-edit hook mechanism; those install the skill and nothing else.

const COMMAND = (payload, event, provider) =>
  `node ${payload}/scripts/hook.mjs --event ${event} --provider ${provider}`;

function claudeSettings(payload) {
  return {
    hooks: {
      PostToolUse: [
        {
          matcher: "Edit|Write|MultiEdit",
          hooks: [
            {
              type: "command",
              command: COMMAND(payload, "after-edit", "claude-code"),
            },
          ],
        },
      ],
      Stop: [
        {
          hooks: [
            { type: "command", command: COMMAND(payload, "stop", "claude-code") },
          ],
        },
      ],
    },
  };
}

function genericHooks(payload, provider) {
  return {
    hooks: {
      afterFileEdit: [
        {
          name: "docbound-after-edit",
          command: COMMAND(payload, "after-edit", provider),
        },
      ],
      stop: [
        {
          name: "docbound-stop",
          command: COMMAND(payload, "stop", provider),
        },
      ],
    },
  };
}

export const PROVIDERS = [
  {
    name: "universal",
    label: "Agent Skills (any harness that reads .agents/skills)",
    payload: ".agents/skills/docbound",
    detect: [".agents"],
  },
  {
    name: "claude-code",
    label: "Claude Code",
    payload: ".claude/skills/docbound",
    detect: [".claude"],
    hookFile: ".claude/settings.json",
    hookManifest: claudeSettings,
    hookNote:
      "Merged into .claude/settings.json alongside any hooks already there.",
  },
  {
    name: "codex",
    label: "Codex",
    payload: ".agents/skills/docbound",
    detect: [".codex", ".agents"],
    hookFile: ".codex/hooks.json",
    hookManifest: (payload) => genericHooks(payload, "codex"),
    hookNote: "Approve the hook once with /hooks before it runs.",
  },
  {
    name: "cursor",
    label: "Cursor",
    payload: ".agents/skills/docbound",
    detect: [".cursor"],
    hookFile: ".cursor/hooks.json",
    hookManifest: (payload) => genericHooks(payload, "cursor"),
  },
  {
    name: "gemini",
    label: "Gemini CLI",
    payload: ".gemini/skills/docbound",
    detect: [".gemini"],
  },
  {
    name: "github",
    label: "GitHub Copilot",
    payload: ".github/skills/docbound",
    detect: [".github"],
    hookFile: ".github/hooks/docbound.json",
    hookManifest: (payload) => genericHooks(payload, "github"),
  },
  {
    name: "opencode",
    label: "opencode",
    payload: ".opencode/skill/docbound",
    detect: [".opencode"],
  },
];

export const PROVIDER_NAMES = PROVIDERS.map((p) => p.name);

export function providerByName(name) {
  return PROVIDERS.find((p) => p.name === name) ?? null;
}
