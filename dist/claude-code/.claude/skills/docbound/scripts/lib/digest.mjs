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

import { allDocs, readText, splitLines } from "./paths.mjs";
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

/**
 * An open item, optionally carrying a slug that gives it an identity.
 *
 * `- [check-set] comment-sentence reads wrapped sentences as fragments`
 * `- [check-set] closed: fixed by treating a run of comment lines as one unit`
 *
 * The slug is what stops the item being retyped. Without one, carrying work
 * forward means writing the sentence again, and writing it again means writing
 * it differently, which is why deduplicating prose never quite worked.
 */
const TAGGED = /^\[([a-z0-9][a-z0-9-]*)\]\s*(.*)$/;
const CLOSING = /^(closed|done|resolved)\b[:\s]\s*(.*)$/i;

export function parseOpenItem(text) {
  const tagged = TAGGED.exec(text);
  if (!tagged) return { slug: null, text, closing: false, note: text };
  const body = tagged[2].trim();
  const closing = CLOSING.exec(body);
  return {
    slug: tagged[1],
    text: body,
    closing: Boolean(closing),
    note: closing ? closing[2].trim() : body,
  };
}

/**
 * What is open now, from the whole history.
 *
 * Entries arrive newest first. An item is opened by its first appearance in
 * time and closed by any later entry that says so, which makes the log its own
 * state: no second file to keep in step with it.
 *
 * An untagged bullet cannot be tracked across entries, so it is reported
 * against the entry that wrote it and deduplicated by text as a fallback.
 */
export function openItems(entries) {
  const bySlug = new Map();
  const untagged = [];
  const seenText = new Set();

  // Oldest first, so the first sighting of a slug is the one that opened it.
  for (const entry of [...entries].reverse()) {
    for (const raw of entry.stillOpen) {
      const item = parseOpenItem(raw);
      if (item.slug === null) {
        const key = item.text.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 90);
        if (seenText.has(key)) continue;
        seenText.add(key);
        untagged.push({ ...item, entry: entry.title, date: entry.date, mentions: 1 });
        continue;
      }
      const known = bySlug.get(item.slug);
      if (!known) {
        bySlug.set(item.slug, {
          slug: item.slug,
          text: item.text,
          entry: entry.title,
          date: entry.date,
          mentions: 1,
          closed: item.closing ? { note: item.note, date: entry.date } : null,
        });
        continue;
      }
      known.mentions += 1;
      if (item.closing) known.closed = { note: item.note, date: entry.date };
      else if (known.closed === null) known.text = item.text;
    }
  }

  const tracked = [...bySlug.values()];
  return {
    open: [...tracked.filter((i) => i.closed === null), ...untagged],
    closed: tracked.filter((i) => i.closed !== null),
  };
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
    const stamped = /\bt=(\d{9,11})\b/.exec(entry);
    entries.push({
      date: dated ? dated[1] : null,
      // Unix seconds if the entry carries them. Entries written before this
      // field existed do not, so every reader treats null as "unknown age"
      // rather than filling it in.
      timestamp: stamped ? Number(stamped[1]) : null,
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
 * The documents the summary looks for that this repository does not have.
 *
 * Reported rather than apologised for. Someone running this on an undocumented
 * repository needs to know what is missing and how to create it, which is more
 * useful than a thin summary that does not say why it is thin.
 */
export function missing(root, found) {
  const absent = [];
  if (found.project === null) absent.push("README.md");
  if (found.architecture === null) absent.push("docs/ARCHITECTURE.md");
  if (found.entryCount === 0) absent.push("docs/WORKLOG.md");
  if (found.decisions.length === 0) absent.push("docs/decisions/");
  if (found.modules.length === 0) absent.push("a README.md in each package");
  return absent;
}
