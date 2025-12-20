import fsp from "node:fs/promises";
import path from "node:path";
import { DEFAULT_OPTIONS } from "./constants.js";
import { gatherPackages } from "./scan.js";
import { renderMain, renderReview } from "./render.js";
import { makeAnchorId, uniqSorted } from "./fs-utils.js";
import {
  parseExistingMainFile,
  parseExistingReviewFile,
} from "./existing.js";

// Default warning handler (prints to console)
const defaultWarn = (msg) => {
  console.warn(`warning: ${msg}`);
};

// Public API: scan licenses and render markdown
export async function collectThirdPartyLicenses(options = {}) {
  const opts = normalizeOptions(options);
  await assertNodeModulesExists(opts.nodeModules); // fail fast when node_modules is missing

  const scanResult = await gatherPackages(opts);
  const presentPackages = withPresentUsage(scanResult.packages);

  const packages =
    opts.mode === "update"
      ? await mergeWithExistingOutputs(presentPackages, opts)
      : presentPackages;

  const sortedPackages = sortPackages(packages);

  const mainContent = renderMain(sortedPackages, opts);
  const reviewContent = renderReview(
    sortedPackages,
    opts,
    scanResult.missingFiles,
    scanResult.missingSource,
    scanResult.missingLicenseField
  );

  return {
    mainContent,
    reviewContent,
    options: opts,
    stats: {
      packages: scanResult.seenCount,
      missingFiles: uniqSorted(scanResult.missingFiles),
      missingSource: uniqSorted(scanResult.missingSource),
      missingLicenseField: uniqSorted(scanResult.missingLicenseField),
    },
  };
}

export { DEFAULT_OPTIONS } from "./constants.js";

function normalizeOptions(options) {
  return {
    nodeModules: path.resolve(
      options.nodeModules ?? DEFAULT_OPTIONS.nodeModules
    ),
    outFile: path.resolve(options.outFile ?? DEFAULT_OPTIONS.outFile),
    reviewFile: path.resolve(options.reviewFile ?? DEFAULT_OPTIONS.reviewFile),
    failOnMissing: Boolean(
      options.failOnMissing ?? DEFAULT_OPTIONS.failOnMissing
    ),
    writeMain: options.writeMain ?? true,
    writeReview: options.writeReview ?? true,
    warn: options.onWarn ?? defaultWarn,
    mode: normalizeMode(options.mode),
  };
}

function normalizeMode(mode) {
  const m = typeof mode === "string" ? mode.toLowerCase() : "";
  return m === "update" ? "update" : DEFAULT_OPTIONS.mode;
}

async function assertNodeModulesExists(dir) {
  const stat = await fsp.stat(dir).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`not found node_modules: ${dir}`);
  }
}

function withPresentUsage(packages) {
  return packages.map((pkg) => ({
    ...pkg,
    usage: "present",
    notes: "",
  }));
}

async function mergeWithExistingOutputs(currentPackages, opts) {
  const [existingMain, existingReview] = await Promise.all([
    parseExistingMainFile(opts.outFile),
    parseExistingReviewFile(opts.reviewFile),
  ]);

  // Start with previously known packages as "missing" (not found in this scan)
  const merged = new Map();
  for (const [key, prevReview] of existingReview.entries()) {
    const prevMain = existingMain.get(key);
    merged.set(key, toMissingPackage(key, prevMain, prevReview));
  }
  for (const [key, prevMain] of existingMain.entries()) {
    if (!merged.has(key)) {
      merged.set(key, toMissingPackage(key, prevMain, null));
    }
  }

  // Override with current scan (present in node_modules), keeping previous notes when available
  for (const pkg of currentPackages) {
    const prevReview = existingReview.get(pkg.key);
    merged.set(pkg.key, toPresentPackage(pkg, prevReview));
  }

  return [...merged.values()];
}

function toPresentPackage(pkg, prevReview) {
  return {
    ...pkg,
    usage: "present",
    notes: prevReview?.notes ?? "",
  };
}

function toMissingPackage(key, prevMain, prevReview) {
  return {
    key,
    anchor: makeAnchorId(key),
    source: prevMain?.source ?? prevReview?.source ?? null,
    license: prevMain?.license ?? prevReview?.license ?? null,
    fileNames: deriveFileNames(prevMain, prevReview),
    flags: [],
    licenseTexts: prevMain?.licenseTexts ?? [],
    usage: "missing",
    notes: prevReview?.notes ?? "",
  };
}

function deriveFileNames(prevMain, prevReview) {
  const names =
    (prevMain?.fileNames && prevMain.fileNames.length > 0
      ? prevMain.fileNames
      : prevReview?.fileNames) ?? [];
  return uniqSorted(names);
}

function sortPackages(packages) {
  return [...packages].sort((a, b) => a.key.localeCompare(b.key));
}
