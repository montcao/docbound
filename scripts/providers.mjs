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
// `detect` names the directories whose presence implies the harness is in use,
// looked for in the project first and then in the user's home directory.
//
// Verified against the harness itself: claude-code, codex, cursor. Taken from
// documentation and unverified: gemini, github, opencode. `docs/ARCHITECTURE.md`
// carries that split as a known gap, because a wrong path here installs a skill
// where its harness will never look and nothing reports an error.

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
        { name: "docbound-stop", command: COMMAND(payload, "stop", provider) },
      ],
    },
  };
}

// Cursor's hooks file is versioned and its entries carry no name, so it does
// not share `genericHooks`. Both events exist in its vocabulary, and a command
// hook that exits 2 blocks the action, which is what the stop gate relies on.
function cursorHooks(payload) {
  return {
    version: 1,
    hooks: {
      afterFileEdit: [
        { command: COMMAND(payload, "after-edit", "cursor") },
      ],
      stop: [{ command: COMMAND(payload, "stop", "cursor") }],
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
    payload: ".cursor/skills/docbound",
    detect: [".cursor"],
    hookFile: ".cursor/hooks.json",
    hookManifest: cursorHooks,
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

// Names people reach for that are not the canonical ones. Cheaper than an error
// message, and the canonical name is what gets printed back either way.
const ALIASES = {
  claude: "claude-code",
  claudecode: "claude-code",
  copilot: "github",
  "github-copilot": "github",
  agents: "universal",
  "gemini-cli": "gemini",
};

export function providerByName(name) {
  const canonical = ALIASES[name] ?? name;
  return PROVIDERS.find((p) => p.name === canonical) ?? null;
}
