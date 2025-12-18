import fsp from "node:fs/promises";
import path from "node:path";
import { LICENSE_LIKE_RE } from "./constants.js";

// 文字コードを安全に判定してテキストを返す
export function decodeSmart(buf) {
  if (buf.length >= 2) {
    const b0 = buf[0];
    const b1 = buf[1];
    if (b0 === 0xff && b1 === 0xfe) {
      return new TextDecoder("utf-16le").decode(buf.subarray(2));
    }
    if (b0 === 0xfe && b1 === 0xff) {
      const be = buf.subarray(2);
      const swapped = Buffer.allocUnsafe(be.length);
      for (let i = 0; i + 1 < be.length; i += 2) {
        swapped[i] = be[i + 1];
        swapped[i + 1] = be[i];
      }
      return new TextDecoder("utf-16le").decode(swapped);
    }
  }
  if (
    buf.length >= 3 &&
    buf[0] === 0xef &&
    buf[1] === 0xbb &&
    buf[2] === 0xbf
  ) {
    return new TextDecoder("utf-8").decode(buf.subarray(3));
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("latin1").decode(buf);
  }
}

// LICENSE/NOTICEなどを探す
export async function getLicenseLikeFilesInFolderRoot(pkgDir) {
  try {
    const ents = await fsp.readdir(pkgDir, { withFileTypes: true });
    return ents
      .filter((e) => e.isFile() && LICENSE_LIKE_RE.test(e.name))
      .map((e) => path.join(pkgDir, e.name))
      .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
  } catch {
    return [];
  }
}

// package.jsonを深さ優先で探す（node_modules/.binは除外）
export async function* walkForPackageJson(rootDir) {
  const stack = [rootDir];

  while (stack.length) {
    const dir = stack.pop();
    if (!dir) continue;

    let ents;
    try {
      ents = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const e of ents) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === ".bin") continue;
        stack.push(full);
        continue;
      }
      if (e.isFile() && e.name === "package.json") {
        if (full.includes(`${path.sep}.bin${path.sep}`)) continue;
        yield full;
      }
    }
  }
}

export async function readPackageJson(pjPath) {
  try {
    const txt = await fsp.readFile(pjPath, "utf8");
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

// BOM付きやUTF-16を考慮してテキストを読み込む
export async function readTextFileSmart(filePath) {
  const buf = await fsp.readFile(filePath);
  return decodeSmart(buf);
}

export function mdSafeText(s) {
  return String(s).replace(/```/g, "``\u200b`");
}

export function uniqSorted(arr) {
  return [...new Set(arr)].sort();
}

// アンカー用の安全なIDを作る
export function makeAnchorId(key) {
  return (
    "pkg-" +
    String(key)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}
