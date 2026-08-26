// Reading the documentation set as data.
//
// Everything here answers one question: what does this repository already say
// about itself. It reads only documents the discipline keeps true, and never a
// source file, because reading source is the expense the summary exists to
// avoid.
//
// The parsing is deliberately shallow. A doc that does not follow the template
// yields less rather than nothing, since a repository part-way through adopting
// the discipline is the normal case and the one that most needs orienting.

import fs from "node:fs";
import path from "node:path";

import { allDocs, excluded, readText, splitLines } from "./paths.mjs";
import { sectionBody } from "./text.mjs";
import { entrySection } from "./worklog.mjs";

/** First paragraph of prose, skipping headings, badges, and blank lines. */
export function leadParagraph(text) {
  const out = [];
  for (const line of splitLines(text)) {
    const trimmed = line.trim();
    if (out.length === 0) {
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[!")) continue;
      out.push(trimmed);
      continue;
    }
    if (!trimmed) break;
    out.push(trimmed);
  }
  return out.join(" ");
}

/**
 * Bullets of a section, each rejoined into one line.
 *
 * Docs in this discipline wrap at eighty columns, so most bullets span several
 * lines. Reading only the line carrying the marker truncates them mid-sentence,
 * which is worse than dropping them: a half-sentence reads as a whole one.
 */
export function bullets(body) {
  if (!body) return [];
  const out = [];
  for (const line of splitLines(body)) {
    const trimmed = line.trim();
    if (/^[-*] /.test(trimmed)) {
      out.push(trimmed.slice(2).trim());
    } else if (out.length > 0 && /^\s+\S/.test(line)) {
      out[out.length - 1] += ` ${trimmed}`;
    } else if (!trimmed) {
      continue;
    } else if (out.length === 0) {
      continue;
    }
  }
  return out.filter(Boolean);
}

/** Every worklog entry, newest first, parsed into the fields a reader wants. */
export function worklogEntries(root) {
  const text = readText(root, "docs/WORKLOG.md");
  if (text === null) return [];

  const entries = [];
  for (const chunk of text.split(/^## /m).slice(1)) {
    const entry = `## ${chunk}`;
    const heading = splitLines(entry)[0].replace(/^##\s*/, "").trim();
    const dated = /^(\d{4}-\d{2}-\d{2})\s*[-—:]?\s*(.*)$/.exec(heading);
    entries.push({
      date: dated ? dated[1] : null,
      title: dated ? dated[2].trim() : heading,
      intent: entrySection(entry, "Intent"),
      outcome: entrySection(entry, "Outcome"),
      stillOpen: bullets(entrySection(entry, "Still open")),
    });
  }
  return entries;
}

/** Decision records: number, title, status, and the condition that reverses it. */
export function decisions(root) {
  const dir = path.join(root, "docs", "decisions");
  let names;
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith(".md")).sort();
  } catch {
    return [];
  }

  return names.map((name) => {
    const text = readText(root, `docs/decisions/${name}`) ?? "";
    const heading = /^#\s*(.+)$/m.exec(text);
    const status = /^\s*[-*]?\s*Status:\s*(.+)$/m.exec(text);
    return {
      file: `docs/decisions/${name}`,
      title: heading ? heading[1].trim() : name,
      status: status ? status[1].trim() : "unknown",
      reverses: firstSentence(sectionBody(text, "## What would reverse this") ?? ""),
    };
  });
}

/**
 * Module READMEs: what the directory owns, and what it is forbidden from doing.
 *
 * The must-not list is the reason this is worth reading at all. It is the part
 * of a module's contract that the source cannot show you, because it describes
 * what is absent.
 */
export function modules(root, excludes = []) {
  const out = [];
  for (const doc of allDocs(root, excludes)) {
    if (!doc.endsWith("/README.md")) continue;
    const text = readText(root, doc) ?? "";
    out.push({
      file: doc,
      directory: doc.slice(0, -"/README.md".length),
      purpose: leadParagraph(text),
      mustNot: bullets(sectionBody(text, "## Must not")),
      gaps: bullets(sectionBody(text, "## Known gaps")),
    });
  }
  return out;
}

/** The root README's orientation: what this is, and how it is run. */
export function project(root) {
  const text = readText(root, "README.md");
  if (text === null) return null;
  const heading = /^#\s*(.+)$/m.exec(text);
  return {
    name: heading ? heading[1].trim() : path.basename(root),
    purpose: leadParagraph(text),
    invariants: bullets(sectionBody(text, "## Invariants")),
  };
}

/** The system's own shape, as ARCHITECTURE states it. */
export function architecture(root) {
  const text = readText(root, "docs/ARCHITECTURE.md");
  if (text === null) return null;
  return {
    summary: leadParagraph(text),
    invariants: bullets(sectionBody(text, "## Invariants")),
    gaps: bullets(sectionBody(text, "## Known gaps")),
    diagram: fencedDiagram(text),
  };
}

function fencedDiagram(text) {
  const block = /^```mermaid[^\n]*\n([\s\S]*?)^```/m.exec(text);
  return block ? block[1].trimEnd() : null;
}

function firstSentence(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const stop = flat.search(/\.\s|\.$/);
  return stop === -1 ? flat : flat.slice(0, stop + 1);
}

/**
 * What the summary cost against what reading the source would have cost.
 *
 * Characters divided by four, which is the usual rough conversion for English
 * prose and code. It is an estimate and the output says so; the point is the
 * ratio, which is large enough that precision would not change a decision.
 */
export function cost(root, summaryText, excludes = []) {
  const docs = allDocs(root, excludes);
  let docChars = 0;
  for (const doc of docs) docChars += (readText(root, doc) ?? "").length;

  let sourceChars = 0;
  let sourceFiles = 0;
  walk(root, "");

  return {
    docsRead: docs.length,
    sourceFiles,
    summaryTokens: Math.round(summaryText.length / 4),
    docTokens: Math.round(docChars / 4),
    sourceTokens: Math.round(sourceChars / 4),
  };

  function walk(base, prefix) {
    let entries;
    try {
      entries = fs.readdirSync(path.join(base, prefix), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && !excluded(rel, excludes)) walk(base, rel);
        continue;
      }
      // Build output is a copy of files already counted, and counting it would
      // inflate the very ratio this function exists to report honestly.
      if (rel.endsWith(".md") || excluded(rel, excludes)) continue;
      try {
        sourceChars += fs.statSync(path.join(base, rel)).size;
        sourceFiles += 1;
      } catch {
        // A file that vanished between listing and reading is not worth failing over.
      }
    }
  }
}
