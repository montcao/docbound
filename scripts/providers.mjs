// The provider table: where each harness expects a skill, and what its hook
// manifest looks like.
//
// Every entry here has been verified against the harness itself — its own
// bundled documentation or its own files on disk — and each records that
// evidence in `verified`. Nothing ships on inference.
//
// That rule exists because a wrong entry fails silently and expensively. The
// payload lands somewhere the harness never reads, the install reports success,
// the skill never loads, and the user has no error to search for. An entry
// written from a guess is worse than a missing one: a missing provider is a
// feature request, and a wrong one is a bug report that reads as a false claim.
//
// `docs/providers.md` holds the candidates that do not ship and the evidence
// each still needs. Adding a provider means moving it from that file to this
// one, carrying the evidence with it.
//
// `payload` is where the skill directory lands, relative to the target
// repository root. `detect` names the directories whose presence implies the
// harness is in use, looked for in the project first and then in the user's
// home directory.

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

// Cursor's hooks file is versioned and its entries carry no name, so it shares
// nothing with the Claude Code shape. A command hook that exits 2 blocks the
// action, which is what the stop gate relies on.
function cursorHooks(payload) {
  return {
    version: 1,
    hooks: {
      afterFileEdit: [{ command: COMMAND(payload, "after-edit", "cursor") }],
      stop: [{ command: COMMAND(payload, "stop", "cursor") }],
    },
  };
}

export const PROVIDERS = [
  {
    name: "claude-code",
    label: "Claude Code",
    payload: ".claude/skills/docbound",
    detect: [".claude"],
    hookFile: ".claude/settings.json",
    hookManifest: claudeSettings,
    hookNote:
      "Merged into .claude/settings.json alongside any hooks already there.",
    verified:
      "Skills directory and settings file confirmed on disk; hook schema " +
      "matches a published plugin's own hooks file and the events observed " +
      "while running under Claude Code.",
  },
  {
    name: "cursor",
    label: "Cursor",
    payload: ".cursor/skills/docbound",
    detect: [".cursor"],
    hookFile: ".cursor/hooks.json",
    hookManifest: cursorHooks,
    hookNote: "Cursor reloads hooks.json on save; there is no approval step.",
    verified:
      "Paths, manifest schema version, event names, and the exit-code-2 " +
      "blocking contract all taken from the create-skill and create-hook " +
      "skills Cursor itself ships.",
  },
];

export const PROVIDER_NAMES = PROVIDERS.map((p) => p.name);

// Only aliases of providers that ship. An alias for something unsupported would
// report success and install nothing.
const ALIASES = {
  claude: "claude-code",
  claudecode: "claude-code",
};

export function providerByName(name) {
  const canonical = ALIASES[name] ?? name;
  return PROVIDERS.find((p) => p.name === canonical) ?? null;
}
