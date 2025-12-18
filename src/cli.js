#!/usr/bin/env node
// CLIエントリーポイント（引数パースとファイル出力のみ担当）
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectThirdPartyLicenses, DEFAULT_OPTIONS } from "./core.js";

function parseArgs(argv) {
  const args = { ...DEFAULT_OPTIONS };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if ((a === "--node-modules" || a === "--nodeModules") && argv[i + 1]) {
      args.nodeModules = argv[i + 1];
      i += 1;
    } else if ((a === "--out" || a === "--outFile") && argv[i + 1]) {
      args.outFile = argv[i + 1];
      i += 1;
    } else if ((a === "--review-out" || a === "--reviewFile") && argv[i + 1]) {
      args.reviewFile = argv[i + 1];
      i += 1;
    } else if (a === "--fail-on-missing") {
      args.failOnMissing = true;
    } else if (a === "--no-texts") {
      args.includeTexts = false;
    } else if (a === "-h" || a === "--help") {
      showHelp();
      process.exit(0);
    }
  }
  return args;
}

function showHelp() {
  console.log(`Usage:
  third-party-notices [--node-modules <dir>] [--out <file>] [--review-out <file>]
                      [--fail-on-missing] [--no-texts]
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

    await Promise.all([
      ensureParentDir(result.options.outFile),
      ensureParentDir(result.options.reviewFile),
    ]);

    await Promise.all([
      fsp.writeFile(result.options.outFile, result.mainContent, "utf8"),
      fsp.writeFile(result.options.reviewFile, result.reviewContent, "utf8"),
    ]);

    console.log(`Generated: ${result.options.outFile}`);
    console.log(`Review:    ${result.options.reviewFile}`);
    console.log(`Packages:  ${result.stats.packages}`);
    console.log(
      `Missing LICENSE/NOTICE/COPYING: ${result.stats.missingFiles.length}`,
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
  // npmの.binシム経由でも動くように、実ファイル一致だけでなく.bin配下も許可
  const argv1 = process.argv[1];
  if (!argv1) return false;
  const self = fileURLToPath(import.meta.url);
  const resolvedArg = path.resolve(argv1);
  if (resolvedArg === self) return true;

  const base = path.basename(resolvedArg).toLowerCase();
  if (base === "third-party-notices" || base === "third-party-notices.cmd") {
    return true;
  }
  if (resolvedArg.includes(`${path.sep}.bin${path.sep}`)) return true;
  return false;
}

if (isCliExecution()) {
  // eslint-disable-next-line unicorn/prefer-top-level-await
  runCli();
}
