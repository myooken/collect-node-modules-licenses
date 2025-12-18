#!/usr/bin/env node
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const LICENSE_LIKE_RE =
  /^(LICEN[CS]E|COPYING|NOTICE)(\..*)?$|^(LICEN[CS]E|COPYING|NOTICE)-/i;

function parseArgs(argv) {
  const args = {
    nodeModules: "node_modules",
    outFile: "THIRD-PARTY-LICENSE.md",
    reviewFile: "THIRD-PARTY-LICENSE-REVIEW.md",
    failOnMissing: false,
    includeTexts: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === "--node-modules" || a === "--nodeModules") && argv[i + 1])
      args.nodeModules = argv[++i];
    else if ((a === "--out" || a === "--outFile") && argv[i + 1])
      args.outFile = argv[++i];
    else if ((a === "--review-out" || a === "--reviewFile") && argv[i + 1])
      args.reviewFile = argv[++i];
    else if (a === "--fail-on-missing") args.failOnMissing = true;
    else if (a === "--no-texts") args.includeTexts = false;
    else if (a === "-h" || a === "--help") {
      console.log(`Usage:
  third-party-notices [--node-modules <dir>] [--out <file>] [--review-out <file>]
                      [--fail-on-missing] [--no-texts]
`);
      process.exit(0);
    }
  }
  return args;
}

function warn(msg) {
  console.warn(`warning: ${msg}`);
}

function decodeSmart(buf) {
  // BOM優先（UTF-16混入対策）
  if (buf.length >= 2) {
    const b0 = buf[0],
      b1 = buf[1];
    if (b0 === 0xff && b1 === 0xfe)
      return new TextDecoder("utf-16le").decode(buf.subarray(2));
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

async function readTextFileSmart(filePath) {
  const buf = await fsp.readFile(filePath);
  return decodeSmart(buf);
}

function mdSafeText(s) {
  return String(s).replace(/```/g, "``\u200b`");
}

async function getLicenseLikeFilesInFolderRoot(pkgDir) {
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

// O(N)で素直に走査（node_modules/.binは除外）
async function* walkForPackageJson(rootDir) {
  const stack = [rootDir];

  while (stack.length) {
    const dir = stack.pop();
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

async function readPackageJson(pjPath) {
  try {
    const txt = await fsp.readFile(pjPath, "utf8");
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function getRepositoryUrl(pkg) {
  const repo = pkg?.repository;
  if (!repo) return null;
  if (typeof repo === "string") return repo;
  if (typeof repo === "object" && typeof repo.url === "string") return repo.url;
  return null;
}

function uniqSorted(arr) {
  return [...new Set(arr)].sort();
}

// 本体の「追記箇所リンク」を安定させるアンカーID
function makeAnchorId(key) {
  return (
    "pkg-" +
    String(key)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const nodeModules = path.resolve(args.nodeModules);
  const outFile = path.resolve(args.outFile);
  const reviewFile = path.resolve(args.reviewFile);

  const stat = await fsp.stat(nodeModules).catch(() => null);
  if (!stat || !stat.isDirectory())
    throw new Error(`not found node_modules: ${nodeModules}`);

  const seen = new Set();

  // 不足チェック集計
  const missingFiles = [];
  const missingSource = [];
  const missingLicenseField = [];

  // レビュー用：各パッケージの「ファイル名」を記録する
  const reviewItems = []; // { key, anchor, source, license, files: string[], flags: string[] }

  // メイン出力
  const mainLines = [];
  const wMain = (s = "") => mainLines.push(s);

  wMain("# Third-Party Licenses");
  wMain("");
  wMain(`Generated from: ${nodeModules}`);
  wMain("");

  for await (const pj of walkForPackageJson(nodeModules)) {
    const pkgDir = path.dirname(pj);
    const pkg = await readPackageJson(pj);
    if (!pkg) continue;

    if (typeof pkg.name !== "string" || !pkg.name.trim()) continue;
    if (typeof pkg.version !== "string" || !pkg.version.trim()) continue;

    const key = `${pkg.name}@${pkg.version}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const anchor = makeAnchorId(key);
    const src = getRepositoryUrl(pkg);
    const licField = pkg.license ?? null;

    const flags = [];
    if (!src) {
      missingSource.push(key);
      flags.push("Missing Source");
      warn(`Unknown Source: ${key}`);
    }
    if (!licField) {
      missingLicenseField.push(key);
      flags.push("Missing package.json license");
      warn(`not found license in package.json: ${key}`);
    }

    const licFiles = await getLicenseLikeFilesInFolderRoot(pkgDir);
    const fileNames = licFiles.map((f) => path.basename(f));

    if (licFiles.length === 0) {
      missingFiles.push(key);
      flags.push("Missing LICENSE/NOTICE/COPYING files");
      warn(`not found: LICENSE/NOTICE/COPYING, ${key} (searched: ${pkgDir})`);
    }

    // レビュー用に記録
    reviewItems.push({
      key,
      anchor,
      source: src,
      license: licField,
      files: fileNames,
      flags,
    });

    // ---- メインファイル（追記箇所としてのアンカー付き）----
    wMain(`<a id="${anchor}"></a>`);
    wMain(`## ${key}`);
    wMain(`- Source: ${src ?? "(missing) ⚠️"}`);
    wMain(`- License: ${licField ?? "(missing) ⚠️"}`);

    if (fileNames.length === 0) {
      wMain(`- (no LICENSE/NOTICE/COPYING files) ⚠️`);
      wMain("");
      wMain("_No LICENSE/NOTICE/COPYING file found in package directory._");
      wMain("");
      continue;
    }

    for (const n of fileNames) wMain(`- ${n}`);
    wMain("");

    if (args.includeTexts) {
      for (const f of licFiles) {
        const name = path.basename(f);
        const text = await readTextFileSmart(f);

        wMain(`### ${name}`);
        wMain("```text");
        wMain(mdSafeText(text).replace(/\s+$/, ""));
        wMain("```");
        wMain("");
      }
    }
  }

  // ---- レビュー用ファイル ----
  const reviewLines = [];
  const wRev = (s = "") => reviewLines.push(s);

  const mainBase = path.basename(outFile);

  wRev("# THIRD-PARTY-LICENSE-REVIEW");
  wRev("");
  wRev(`Generated from: ${nodeModules}`);
  wRev(`Main file: ${mainBase}`);
  wRev("");

  for (const it of reviewItems.sort((a, b) => a.key.localeCompare(b.key))) {
    wRev(`## ${it.key}`);
    // ✅ 本体の追記箇所へ飛べるリンク
    wRev(`- Main: ${mainBase}#${it.anchor}`);
    wRev(`- Source: ${it.source ?? "(missing) ⚠️"}`);
    wRev(`- License: ${it.license ?? "(missing) ⚠️"}`);

    wRev(`- Files:`);
    if (it.files.length === 0) {
      wRev(`  - (none) ⚠️`);
    } else {
      for (const f of it.files) wRev(`  - ${f}`);
    }

    // “OK”断定はしない。常に人が見る前提に寄せる
    if (it.flags.length === 0) {
      wRev(`- Status: Check manually`);
    } else {
      wRev(`- Status: ⚠️ ${it.flags.join(" / ")}`);
    }

    // ✅ 追記前提のメモ欄
    wRev(`- Notes:`);
    wRev("");
  }

  // 末尾にまとめ（サマリ）
  wRev("---");
  wRev("");
  wRev("## Missing summary");
  wRev("");

  const writeList = (title, arr) => {
    wRev(`### ${title}`);
    wRev("");
    const xs = uniqSorted(arr);
    if (xs.length === 0) wRev("- (none)");
    else for (const x of xs) wRev(`- ${x}`);
    wRev("");
  };

  writeList("Missing Source", missingSource);
  writeList("Missing package.json license field", missingLicenseField);
  writeList("Missing LICENSE/NOTICE/COPYING files", missingFiles);

  await fsp.writeFile(outFile, mainLines.join(os.EOL) + os.EOL, {
    encoding: "utf8",
  });
  await fsp.writeFile(reviewFile, reviewLines.join(os.EOL) + os.EOL, {
    encoding: "utf8",
  });

  console.log(`Generated: ${outFile}`);
  console.log(`Review:    ${reviewFile}`);
  console.log(`Packages:  ${seen.size}`);
  console.log(
    `Missing LICENSE/NOTICE/COPYING: ${uniqSorted(missingFiles).length}`
  );

  if (uniqSorted(missingFiles).length > 0 && args.failOnMissing) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(2);
});
