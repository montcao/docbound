// The span scanner.
//
// Nothing in the audit reads this yet, so it is judged entirely on these tests
// (`docs/decisions/0016-span-scanner-not-a-parser.md`). Two groups matter most.
//
// The cases a regular expression gets wrong are the reason the scanner exists,
// so each of them names the check that is wrong about it today. The
// pathological inputs are the reason it is safe: this runs from a hook after
// every file edit, over source from repositories nobody here has read, and a
// file that hangs it hangs a developer's session.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  BLOCK_COMMENT,
  CODE,
  LINE_COMMENT,
  MAX_BYTES,
  STRING,
  comments,
  defines,
  definitions,
  maskDocumentation,
  maskNonCode,
  scan,
  scannable,
} from "../skill/docbound/scripts/lib/scan.mjs";
import { LANGUAGES, resolve } from "../skill/docbound/scripts/lib/languages.mjs";

/** The spans as `kind:text` pairs, which is what a failure needs to show. */
function shape(text, suffix) {
  return scan(text, suffix).map((s) => [s.kind, text.slice(s.start, s.end)]);
}

describe("what a regular expression gets wrong", () => {
  test("a comment marker inside a string is not a comment", () => {
    // logic-touched strips this line wrongly today, and it is the check that
    // stops a documentation subagent editing logic.
    const text = 'const url = "http://example.com"; // real';
    assert.deepEqual(shape(text, ".js"), [
      [CODE, "const url = "],
      [STRING, '"http://example.com"'],
      [CODE, "; "],
      [LINE_COMMENT, "// real"],
    ]);
  });

  test("a hash inside a Python string is not a comment", () => {
    const text = 'x = "# not a comment"  # real';
    const spans = shape(text, ".py");
    assert.equal(spans.filter(([kind]) => kind === LINE_COMMENT).length, 1);
    assert.deepEqual(spans.at(-1), [LINE_COMMENT, "# real"]);
  });

  test("an escaped quote does not end the string", () => {
    const text = 'const s = "a \\" b"; // after';
    assert.deepEqual(shape(text, ".js").at(-1), [LINE_COMMENT, "// after"]);
  });

  test("a Python docstring is one string, hashes and all", () => {
    const text = 'def f():\n    """Doc # here."""\n    return 1  # tail';
    const spans = shape(text, ".py");
    assert.ok(spans.some(([kind, body]) => kind === STRING && body.includes("# here")));
    assert.deepEqual(spans.at(-1), [LINE_COMMENT, "# tail"]);
  });

  test("Rust block comments nest", () => {
    const text = "let a = 1; /* outer /* inner */ still */ let b = 2;";
    const spans = shape(text, ".rs");
    assert.deepEqual(spans.at(-1), [CODE, " let b = 2;"]);
    assert.equal(spans.filter(([kind]) => kind === BLOCK_COMMENT).length, 1);
  });

  test("C block comments do not nest, so the first close ends it", () => {
    const text = "int a; /* outer /* inner */ int b;";
    assert.deepEqual(shape(text, ".c").at(-1), [CODE, " int b;"]);
  });

  test("a quote inside a comment does not open a string", () => {
    const text = "// it's fine\nconst a = 1;";
    assert.deepEqual(shape(text, ".js"), [
      [LINE_COMMENT, "// it's fine"],
      [CODE, "\nconst a = 1;"],
    ]);
  });

  test("an unterminated string ends at the line, not at the file", () => {
    // One stray quote must not swallow everything below it.
    const text = "const bad = 'oops\nconst next = 1; // still a comment";
    assert.deepEqual(shape(text, ".js").at(-1), [LINE_COMMENT, "// still a comment"]);
  });

  test("a backslash before the closing backtick does not escape it in Go", () => {
    // A Go raw string takes no escapes, so the backslash is content and the
    // backtick still closes. Treating it as an escape would swallow the file.
    const text = "s := `a\\`\n// after";
    const spans = shape(text, ".go");
    assert.deepEqual(spans, [
      [CODE, "s := "],
      [STRING, "`a\\`"],
      [CODE, "\n"],
      [LINE_COMMENT, "// after"],
    ]);
  });
});

describe("spans cover the text exactly", () => {
  const samples = [
    [".js", 'const a = "x"; // c\n/* b */ const d = 1;'],
    [".py", '"""doc"""\nx = 1  # c'],
    [".rb", "=begin\nblock\n=end\ndef f; end # c"],
    [".sh", "# c\necho \"hi\"  # d"],
    [".lua", "--[[ block ]] local a = 'x' -- line"],
  ];

  for (const [suffix, text] of samples) {
    test(`${suffix} spans are contiguous and lossless`, () => {
      const spans = scan(text, suffix);
      assert.equal(spans[0].start, 0);
      assert.equal(spans.at(-1).end, text.length);
      for (let i = 1; i < spans.length; i += 1) {
        assert.equal(spans[i].start, spans[i - 1].end, "no gap between spans");
      }
      assert.equal(
        spans.map((s) => text.slice(s.start, s.end)).join(""),
        text,
        "the spans reassemble the original",
      );
    });
  }
});

describe("maskNonCode", () => {
  test("keeps length and line breaks so offsets still point at the file", () => {
    const text = 'const a = "secret"; // note\nconst b = 2;';
    const masked = maskNonCode(text, ".js");
    assert.equal(masked.length, text.length);
    assert.equal(masked.split("\n").length, text.split("\n").length);
    assert.ok(!masked.includes("secret"), "string content is gone");
    assert.ok(!masked.includes("note"), "comment content is gone");
    assert.ok(masked.includes("const a ="), "code survives");
    assert.ok(masked.includes("const b = 2;"), "code on the next line survives");
  });

  test("a line number taken from the mask matches the original", () => {
    const text = 'x = "a"\n# c\ndef target():\n    pass';
    const masked = maskNonCode(text, ".py");
    const line = masked.slice(0, masked.indexOf("def target")).split("\n").length;
    assert.equal(line, 3);
  });
});

describe("maskDocumentation", () => {
  const source = (comment, url = "x.com") =>
    `URL = "https://${url}/#frag"  # ${comment}\ndef f():\n    return URL`;

  test("rewording a comment on a line whose string holds a marker is not a change", () => {
    // The case logic-touched was wrong about: the regular expression kept that
    // trailing comment, so rewording it read as a logic edit.
    assert.equal(
      maskDocumentation(source("the fragment is ignored"), ".py"),
      maskDocumentation(source("fragments are dropped by the server"), ".py"),
    );
  });

  test("changing a string literal is a change, because it is logic", () => {
    assert.notEqual(
      maskDocumentation(source("same", "x.com"), ".py"),
      maskDocumentation(source("same", "y.com"), ".py"),
    );
  });

  test("adding a docstring is not a change", () => {
    const without = "def f():\n    return 1";
    const with_ = 'def f():\n    """Added."""\n    return 1';
    assert.equal(maskDocumentation(with_, ".py"), maskDocumentation(without, ".py"));
  });

  test("renaming a function is a change", () => {
    assert.notEqual(
      maskDocumentation("def one():\n    return 1", ".py"),
      maskDocumentation("def two():\n    return 1", ".py"),
    );
  });

  test("an unknown language answers null so the caller can fall back", () => {
    assert.equal(maskDocumentation("anything", ".tsx"), null);
  });
});

describe("comments", () => {
  test("returns each comment with the line it starts on", () => {
    const text = "const a = 1; // one\n/* two */\n// three";
    const found = comments(text, ".js");
    assert.deepEqual(
      found.map((c) => [c.line, c.text]),
      [[1, "// one"], [2, "/* two */"], [3, "// three"]],
    );
  });
});

describe("definitions", () => {
  test("finds names, and ignores ones that only appear in prose", () => {
    const text = [
      "# def not_a_function is only mentioned here",
      'note = "def also_not_one"',
      "def real_one():",
      "    pass",
      "class RealClass:",
      "    pass",
    ].join("\n");

    const names = definitions(text, ".py").map((d) => d.name);
    assert.ok(names.includes("real_one"));
    assert.ok(names.includes("RealClass"));
    assert.ok(!names.includes("not_a_function"), "a comment cannot define a name");
    assert.ok(!names.includes("also_not_one"), "a string cannot define a name");
  });

  test("defines answers the question a doc reference asks", () => {
    const text = "export function refresh() {}\n";
    assert.equal(defines(text, ".js", "refresh"), true);
    assert.equal(defines(text, ".js", "totally_invented"), false);
  });

  test("an unknown language answers null rather than guessing", () => {
    assert.equal(definitions("anything", ".tsx"), null);
    assert.equal(defines("anything", ".tsx", "x"), null);
    assert.equal(scan("anything", ".tsx"), null);
    assert.equal(scannable("a/b.tsx"), false);
    assert.equal(scannable("a/b.py"), true);
  });
});

describe("input that must not hang a hook", () => {
  // Each of these gets a generous budget rather than a tight one. The assertion
  // is that it terminates at all; a wall-clock number would be a flaky test on
  // a loaded machine.
  const BUDGET_MS = 4000;

  function timed(run) {
    const started = Date.now();
    run();
    return Date.now() - started;
  }

  test("declines a file above the size cap instead of scanning it", () => {
    const huge = "a".repeat(MAX_BYTES + 1);
    assert.equal(scan(huge, ".js"), null);
    assert.equal(maskNonCode(huge, ".js"), null);
  });

  test("an unterminated block comment terminates", () => {
    const text = `/*${"x".repeat(200_000)}`;
    assert.ok(timed(() => scan(text, ".js")) < BUDGET_MS);
    assert.equal(scan(text, ".js").at(-1).kind, BLOCK_COMMENT);
  });

  test("a file of unbalanced quotes terminates", () => {
    const text = '"'.repeat(100_000);
    assert.ok(timed(() => scan(text, ".js")) < BUDGET_MS);
  });

  test("deeply nested Rust comments terminate", () => {
    const text = "/*".repeat(20_000);
    assert.ok(timed(() => scan(text, ".rs")) < BUDGET_MS);
  });

  test("a trailing escape at end of file does not run past the end", () => {
    assert.doesNotThrow(() => scan('const a = "x\\', ".js"));
    assert.doesNotThrow(() => scan("\\", ".js"));
  });

  test("a long line of definition-shaped text terminates", () => {
    // The definition patterns run over untrusted text, so they are bounded and
    // free of nested quantifiers on purpose.
    const text = `${"const a = ".repeat(20_000)}1;`;
    assert.ok(timed(() => definitions(text, ".js")) < BUDGET_MS);
  });

  test("empty and one-character inputs are spans, not crashes", () => {
    assert.deepEqual(scan("", ".js"), []);
    assert.deepEqual(shape("a", ".js"), [[CODE, "a"]]);
    assert.deepEqual(shape("#", ".py"), [[LINE_COMMENT, "#"]]);
  });
});

describe("what the checks read through the scanner", () => {
  // The finding that sent the scanner into this check: a gofmt-clean Go file
  // whose raw string holds space-indented JSON was called mixed-indent.
  test("space-indented JSON inside a Go raw string is not indentation", () => {
    const go = [
      "package main",
      "",
      "const Schema = `{",
      '  "verdict": "...",',
      '  "evidence": []',
      "}`",
      "",
      "func Route() string {",
      '\treturn "/scan"',
      "}",
      "",
    ].join("\n");

    const code = maskNonCode(go, ".go");
    const indents = code
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => (line.startsWith("\t") ? "tab" : line.startsWith("  ") ? "space" : "none"));

    assert.equal(indents.includes("space"), false);
    assert.equal(indents.includes("tab"), true);
  });
});

describe("the language table", () => {
  test("every entry has the shape the scanner reads", () => {
    for (const [suffix, spec] of Object.entries(LANGUAGES)) {
      assert.ok(Array.isArray(spec.line), `${suffix} line`);
      assert.ok(Array.isArray(spec.block), `${suffix} block`);
      assert.ok(Array.isArray(spec.strings), `${suffix} strings`);
      for (const string of spec.strings) {
        assert.ok(string.open && string.close, `${suffix} delimiter`);
      }
    }
  });

  test("longer openers are tried first, whatever order they were written in", () => {
    const python = resolve(".py");
    assert.equal(python.strings[0].open, '"""');
    const php = resolve(".php");
    assert.equal(php.line[0], "//", "two characters before one");
  });

  test("a definition pattern carries no nested quantifier", () => {
    // A pattern that can backtrack catastrophically is a way to hang the hook.
    for (const [suffix, spec] of Object.entries(LANGUAGES)) {
      for (const pattern of spec.define ?? []) {
        assert.ok(
          !/\([^)]*[+*][^)]*\)[+*]/.test(pattern.source),
          `${suffix}: ${pattern.source} nests a quantifier`,
        );
      }
    }
  });
});
