import path from "node:path";
import { DEFAULT_OPTIONS } from "./constants.js";
import { gatherPackages } from "./scan.js";
import { renderMain, renderReview } from "./render.js";
import { uniqSorted } from "./fs-utils.js";

// 警告の出力先（デフォルトはconsole）
const defaultWarn = (msg) => {
  console.warn(`warning: ${msg}`);
};

// 公開API: ライセンス情報を収集し、マークダウン文字列を返す
export async function collectThirdPartyLicenses(options = {}) {
  const opts = normalizeOptions(options);
  const result = await gatherPackages(opts);

  const mainContent = renderMain(result.packages, opts);
  const reviewContent = renderReview(
    result.packages,
    opts,
    result.missingFiles,
    result.missingSource,
    result.missingLicenseField,
  );

  return {
    mainContent,
    reviewContent,
    options: opts,
    stats: {
      packages: result.seenCount,
      missingFiles: uniqSorted(result.missingFiles),
      missingSource: uniqSorted(result.missingSource),
      missingLicenseField: uniqSorted(result.missingLicenseField),
    },
  };
}

export { DEFAULT_OPTIONS } from "./constants.js";

function normalizeOptions(options) {
  return {
    nodeModules: path.resolve(options.nodeModules ?? DEFAULT_OPTIONS.nodeModules),
    outFile: path.resolve(options.outFile ?? DEFAULT_OPTIONS.outFile),
    reviewFile: path.resolve(
      options.reviewFile ?? DEFAULT_OPTIONS.reviewFile,
    ),
    failOnMissing: Boolean(
      options.failOnMissing ?? DEFAULT_OPTIONS.failOnMissing,
    ),
    includeTexts: options.includeTexts ?? DEFAULT_OPTIONS.includeTexts,
    warn: options.onWarn ?? defaultWarn,
  };
}
