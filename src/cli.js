#!/usr/bin/env node
// CLIエントリーポイント（引数パースとファイル出力を担当）
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectThirdPartyLicenses, DEFAULT_OPTIONS } from "./core.js";

// 引数パース: --review / --license は最後に指定されたものを優先し、直後の値があれば出力ファイル名として扱う
function parseArgs(argv) {
  const args = { ...DEFAULT_OPTIONS };
  let outputMode = "both"; // "both" | "review" | "license"

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--node-modules" || a === "--nodeModules") {
      const dir = optionalValue(argv, i + 1);
      if (dir) {
        args.nodeModules = dir;
        i += 1;
      }
    } else if (a === "--review") {
      outputMode = "review";
      const file = optionalValue(argv, i + 1);
      if (file) {
        args.reviewFile = file;
        i += 1;
      }
    } else if (a === "--license") {
      outputMode = "license";
      const file = optionalValue(argv, i + 1);
      if (file) {
        args.outFile = file;
        i += 1;
      }
    } else if (a === "--recreate") {
      args.mode = "recreate";
    } else if (a === "--update") {
      args.mode = "update";
    } else if (a === "--fail-on-missing") {
      args.failOnMissing = true;
    } else if (a === "-h" || a === "--help") {
      showHelp();
      process.exit(0);
    }
  }
  applyOutputMode(outputMode, args);
  return args;
}

// オプションの直後にファイル名があれば取得（次のトークンが別オプションなら無視）
function optionalValue(argv, idx) {
  const v = argv[idx];
  if (!v) return null;
  return v.startsWith("-") ? null : v;
}

// 生成対象をまとめて決定（両方／レビューのみ／ライセンスのみ）
function applyOutputMode(mode, args) {
  if (mode === "review") {
    args.writeMain = false;
    args.writeReview = true;
  } else if (mode === "license") {
    args.writeMain = true;
    args.writeReview = false;
  } else {
    args.writeMain = true;
    args.writeReview = true;
  }
}

function showHelp() {
  console.log(`Usage:
  third-party-license [--node-modules <dir>] [--review [file]] [--license [file]] [--recreate|--update] [--fail-on-missing]
`);
}

async function ensureParentDir(filePath) {
  const dir = path.dirname(filePath);
  await fsp.mkdir(dir, { recursive: true });
}

export async function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  try {
    const result = await collectThirdPartyLicenses(args);

    const dirsToEnsure = [];
    if (result.options.writeMain)
      dirsToEnsure.push(ensureParentDir(result.options.outFile));
    if (result.options.writeReview) {
      dirsToEnsure.push(ensureParentDir(result.options.reviewFile));
    }
    await Promise.all(dirsToEnsure);

    const writeTasks = [];
    if (result.options.writeMain) {
      writeTasks.push(
        fsp.writeFile(result.options.outFile, result.mainContent, "utf8")
      );
    }
    if (result.options.writeReview) {
      writeTasks.push(
        fsp.writeFile(result.options.reviewFile, result.reviewContent, "utf8")
      );
    }
    await Promise.all(writeTasks);

    if (result.options.writeMain)
      console.log(`Generated: ${result.options.outFile}`);
    if (result.options.writeReview)
      console.log(`Review:    ${result.options.reviewFile}`);
    console.log(`Packages:  ${result.stats.packages}`);
    console.log(
      `Missing LICENSE/NOTICE/COPYING: ${result.stats.missingFiles.length}`
    );

    if (result.stats.missingFiles.length > 0 && result.options.failOnMissing) {
      process.exitCode = 1;
    }
  } catch (e) {
    console.error(e?.stack || String(e));
    process.exit(2);
  }
}

function isCliExecution() {
  // npmの .bin シム経由でも動作するように、実ファイル一致と .bin 配下を許可
  const argv1 = process.argv[1];
  if (!argv1) return false;
  const self = fileURLToPath(import.meta.url);
  const resolvedArg = path.resolve(argv1);
  if (resolvedArg === self) return true;

  const base = path.basename(resolvedArg).toLowerCase();
  if (base === "third-party-license" || base === "third-party-license.cmd") {
    return true;
  }
  if (resolvedArg.includes(`${path.sep}.bin${path.sep}`)) return true;
  return false;
}

if (isCliExecution()) {
  // eslint-disable-next-line unicorn/prefer-top-level-await
  runCli();
}
