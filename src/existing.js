import fsp from "node:fs/promises";
import { makeAnchorId, uniqSorted } from "./fs-utils.js";
import { LICENSE_FILES_LABEL } from "./constants.js";

export function parseExistingMainFile(filePath) {
  return parseExistingFile(filePath, parseMainBlock);
}

export function parseExistingReviewFile(filePath) {
  return parseExistingFile(filePath, parseReviewBlock);
}

// ファイルを読み、## 単位のブロックを parseBlock で Map化する
async function parseExistingFile(filePath, parseBlock) {
  const content = await readFileSafe(filePath);
  if (!content) return new Map();

  const map = new Map();
  for (const { key, body } of splitPackageBlocks(content)) {
    map.set(key, parseBlock(key, body));
  }
  return map;
}

async function readFileSafe(filePath) {
  try {
    return await fsp.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

// Renderers always emit package keys as "name@version" (or
// "name@version (path)"), so a real package key contains "@" beyond a
// possible leading scope "@". Headings that fail this test — the review
// file's "Missing summary" section and ghost blocks injected by a past
// bug — are not packages.
function looksLikePackageKey(key) {
  return key.indexOf("@", 1) !== -1;
}

// Split content into package blocks at ## headings, except:
// - ## lines inside ``` fences are not boundaries (embedded license texts;
//   fences within the texts are escaped by mdSafeText, so toggling is safe)
// - headings that don't look like package keys are dropped with their body
function splitPackageBlocks(content) {
  const blocks = [];
  const pushBlock = (current, end) => {
    if (!current) return;
    if (!looksLikePackageKey(current.key)) return;
    blocks.push({ key: current.key, body: content.slice(current.start, end) });
  };

  let current = null;
  let inFence = false;
  let offset = 0;

  for (const rawLine of content.split(/(?<=\n)/)) {
    const line = rawLine.replace(/\r?\n$/, "");
    if (line.startsWith("```")) {
      inFence = !inFence;
    } else if (!inFence) {
      const m = /^##\s+(.+)$/.exec(line);
      if (m) {
        pushBlock(current, offset);
        current = { key: m[1].trim(), start: offset };
      }
    }
    offset += rawLine.length;
  }

  pushBlock(current, content.length);
  return blocks;
}

function parseMainBlock(key, body) {
  const source = pickLine(body, /^- Source:\s*(.+)$/m);
  const license = pickLine(body, /^- License:\s*(.+)$/m);
  const usage = pickLine(body, /^- Usage:\s*(.+)$/m);

  const licenseTexts = [];
  const licRe = /###\s+(.+?)\s*\r?\n```text\r?\n([\s\S]*?)```/g;
  let licMatch;
  while ((licMatch = licRe.exec(body))) {
    licenseTexts.push({
      name: licMatch[1].trim(),
      text: licMatch[2],
    });
  }

  const fileNames = [];
  for (const m of body.matchAll(/^- (.+)$/gm)) {
    const val = m[1].trim();
    if (
      val.startsWith("Source:") ||
      val.startsWith("License:") ||
      val.startsWith("Usage:")
    ) {
      continue;
    }
    if (
      val.startsWith("(no LICENSE/NOTICE/COPYING files)") ||
      val.startsWith(`(no ${LICENSE_FILES_LABEL} files)`)
    ) {
      continue;
    }
    fileNames.push(val);
  }

  const derivedNames =
    fileNames.length > 0 ? fileNames : licenseTexts.map((x) => x.name);

  return {
    key,
    anchor: makeAnchorId(key),
    source: source || null,
    license: license || null,
    fileNames: uniqSorted(derivedNames),
    flags: [],
    licenseTexts,
    usage: usage || "",
    notes: "",
  };
}

function parseReviewBlock(key, body) {
  const source = pickLine(body, /^- Source:\s*(.+)$/m);
  const license = pickLine(body, /^- License:\s*(.+)$/m);

  const lines = body.split(/\r?\n/);
  const fileNames = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith("- Files:")) continue;

    let j = i + 1;
    while (j < lines.length && lines[j].startsWith("  -")) {
      fileNames.push(lines[j].replace(/^  -\s*/, ""));
      j += 1;
    }
    i = j - 1;
  }

  let notes = "";
  const notesIdx = lines.findIndex((l) => l.startsWith("- Notes:"));
  if (notesIdx !== -1) {
    const noteLines = [];
    for (let i = notesIdx + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.startsWith("## ")) break;
      if (line.startsWith("- ")) break;
      if (line.startsWith("---")) break;
      if (line.startsWith("  ")) {
        noteLines.push(line.slice(2));
        continue;
      }
      if (line.trim() === "") {
        noteLines.push("");
        continue;
      }
      break;
    }
    notes = noteLines.join("\n").replace(/\s+$/, "");
  }

  return {
    key,
    anchor: makeAnchorId(key),
    source: source || null,
    license: license || null,
    fileNames: uniqSorted(fileNames),
    flags: [],
    licenseTexts: [],
    usage: "",
    notes,
  };
}

function pickLine(body, re) {
  const m = body.match(re);
  return m ? m[1].trim() : "";
}
