// Where each language puts its comments and strings.
//
// This is a table of delimiters, not a grammar. Each entry answers only what
// `scan.mjs` asks: which sequences open a comment, which open a string, and how
// each one ends. A language absent from this table falls back to the line-based
// behaviour the checks had before the scanner existed, so a missing entry costs
// precision rather than correctness.
//
// Order inside a list matters. Longer openers are tried first, because `"""`
// has to win over `"` and `///` over `//`. `resolve` sorts them so an entry
// cannot get that wrong by being written in the wrong order.

/**
 * A string delimiter.
 *
 * `escape` is the character that makes the next one literal. `multiline` says
 * whether a newline is allowed inside; when it is not, an unterminated string
 * ends at the line break rather than swallowing the rest of the file, which is
 * what keeps a stray quote from ruining everything below it.
 */
const dq = { open: '"', close: '"', escape: "\\", multiline: false };
const sq = { open: "'", close: "'", escape: "\\", multiline: false };
const backtick = { open: "`", close: "`", escape: "\\", multiline: true };
const tripleDouble = { open: '"""', close: '"""', escape: "\\", multiline: true };
const tripleSingle = { open: "'''", close: "'''", escape: "\\", multiline: true };

// `doc` marks a string that carries documentation rather than data. A check
// comparing logic has to ignore a docstring and must not ignore an ordinary
// string literal, since changing one of those is the edit it exists to catch.
const docDouble = { ...tripleDouble, doc: true };
const docSingle = { ...tripleSingle, doc: true };

const C_STYLE = {
  line: ["//"],
  block: [["/*", "*/"]],
  blockNests: false,
  strings: [dq, sq],
};

const HASH_STYLE = {
  line: ["#"],
  block: [],
  blockNests: false,
  strings: [dq, sq],
};

/**
 * Patterns that name a definition.
 *
 * Run against masked code, where comments and strings are already blanked, so
 * a match cannot come from prose. Each is anchored and uses no nested
 * quantifier, because these run over text from repositories nobody here has
 * read and a pattern that can backtrack catastrophically is a way to hang a
 * hook.
 */
const JS_DEFINE = [
  /\bfunction\s+([A-Za-z_$][\w$]*)/g,
  /\bclass\s+([A-Za-z_$][\w$]*)/g,
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g,
  /^\s*([A-Za-z_$][\w$]*)\s*\([^)]{0,200}\)\s*\{/gm,
];

export const LANGUAGES = {
  ".py": {
    line: ["#"],
    block: [],
    blockNests: false,
    // Triple quotes first: a docstring is a string, and the scanner has to see
    // all three characters before it sees one.
    strings: [docDouble, docSingle, dq, sq],
    define: [/\bdef\s+(\w+)/g, /\bclass\s+(\w+)/g, /^(\w+)\s*=/gm],
  },
  ".js": { ...C_STYLE, strings: [dq, sq, backtick], define: JS_DEFINE },
  ".mjs": { ...C_STYLE, strings: [dq, sq, backtick], define: JS_DEFINE },
  ".cjs": { ...C_STYLE, strings: [dq, sq, backtick], define: JS_DEFINE },
  ".ts": { ...C_STYLE, strings: [dq, sq, backtick], define: JS_DEFINE },
  ".go": {
    ...C_STYLE,
    // A raw string in Go ignores escapes entirely.
    strings: [dq, { open: "`", close: "`", escape: null, multiline: true }],
    define: [/\bfunc\s+(?:\([^)]{0,120}\)\s*)?(\w+)/g, /\btype\s+(\w+)/g],
  },
  ".rs": {
    ...C_STYLE,
    // Rust block comments nest, which is the one place the depth counter earns
    // its keep.
    blockNests: true,
    define: [/\bfn\s+(\w+)/g, /\bstruct\s+(\w+)/g, /\benum\s+(\w+)/g, /\btrait\s+(\w+)/g],
  },
  ".java": { ...C_STYLE, define: [/\bclass\s+(\w+)/g, /\binterface\s+(\w+)/g] },
  ".kt": { ...C_STYLE, define: [/\bfun\s+(\w+)/g, /\bclass\s+(\w+)/g] },
  ".c": { ...C_STYLE, define: [/^\w[\w *]{0,80}?\b(\w+)\s*\(/gm] },
  ".cc": { ...C_STYLE, define: [/^\w[\w *:]{0,80}?\b(\w+)\s*\(/gm] },
  ".cpp": { ...C_STYLE, define: [/^\w[\w *:]{0,80}?\b(\w+)\s*\(/gm] },
  ".h": { ...C_STYLE, define: [/^\w[\w *]{0,80}?\b(\w+)\s*\(/gm] },
  ".hpp": { ...C_STYLE, define: [/^\w[\w *:]{0,80}?\b(\w+)\s*\(/gm] },
  ".cs": { ...C_STYLE, define: [/\bclass\s+(\w+)/g, /\binterface\s+(\w+)/g] },
  ".swift": { ...C_STYLE, define: [/\bfunc\s+(\w+)/g, /\bclass\s+(\w+)/g, /\bstruct\s+(\w+)/g] },
  ".scala": { ...C_STYLE, define: [/\bdef\s+(\w+)/g, /\bclass\s+(\w+)/g, /\bobject\s+(\w+)/g] },
  ".dart": { ...C_STYLE, define: [/\bclass\s+(\w+)/g] },
  ".php": {
    line: ["//", "#"],
    block: [["/*", "*/"]],
    blockNests: false,
    strings: [dq, sq],
    define: [/\bfunction\s+(\w+)/g, /\bclass\s+(\w+)/g],
  },
  ".rb": {
    line: ["#"],
    block: [["=begin", "=end"]],
    blockNests: false,
    strings: [dq, sq],
    define: [/\bdef\s+([\w?!]+)/g, /\bclass\s+(\w+)/g, /\bmodule\s+(\w+)/g],
  },
  ".sh": { ...HASH_STYLE, define: [/^\s*(?:function\s+)?(\w+)\s*\(\s*\)/gm] },
  ".bash": { ...HASH_STYLE, define: [/^\s*(?:function\s+)?(\w+)\s*\(\s*\)/gm] },
  ".zsh": { ...HASH_STYLE, define: [/^\s*(?:function\s+)?(\w+)\s*\(\s*\)/gm] },
  ".lua": {
    line: ["--"],
    block: [["--[[", "]]"]],
    blockNests: false,
    strings: [dq, sq],
    define: [/\bfunction\s+([\w.:]+)/g],
  },
  ".sql": { line: ["--"], block: [["/*", "*/"]], blockNests: false, strings: [sq, dq], define: [] },
  ".hs": { line: ["--"], block: [["{-", "-}"]], blockNests: true, strings: [dq], define: [] },
  ".ex": { ...HASH_STYLE, strings: [docDouble, dq], define: [/\bdef\s+(\w+)/g, /\bdefmodule\s+([\w.]+)/g] },
  ".exs": { ...HASH_STYLE, strings: [docDouble, dq], define: [/\bdef\s+(\w+)/g, /\bdefmodule\s+([\w.]+)/g] },
  ".proto": { ...C_STYLE, define: [/\bmessage\s+(\w+)/g, /\bservice\s+(\w+)/g] },
  ".graphql": { ...HASH_STYLE, define: [/\btype\s+(\w+)/g] },
};

// Deliberately absent, and each for a reason worth stating.
//
// .tsx and .jsx nest a second syntax inside expressions, so a scanner reads
// their attribute strings and text nodes wrongly. .vue and .svelte hold three
// languages in one file. .clj, .erl, and .ml have delimiter rules this table
// cannot express. All fall back to the line-based path, which is what those
// checks did before this existed.

/** The entry for a file suffix, or null when nothing is known about it. */
export function resolve(suffix) {
  const spec = LANGUAGES[suffix];
  if (!spec) return null;
  return {
    ...spec,
    line: [...spec.line].sort(byLengthDescending),
    block: [...spec.block].sort((a, b) => byLengthDescending(a[0], b[0])),
    strings: [...spec.strings].sort((a, b) => byLengthDescending(a.open, b.open)),
    define: spec.define ?? [],
  };
}

function byLengthDescending(a, b) {
  return b.length - a.length;
}
