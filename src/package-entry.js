import path from "node:path";
import {
  getLicenseLikeFilesInFolderRoot,
  readTextFileSmart,
} from "./fs-utils.js";
import { getRepositoryUrl } from "./url.js";
import { LICENSE_FILES_LABEL } from "./constants.js";
import { formatLicense } from "./license-utils.js";

// package.json から name/version を取り出す（どちらか欠けていれば null）
export function getPackageIdentity(pkg) {
  const name =
    typeof pkg.name === "string" && pkg.name.trim().length > 0
      ? pkg.name.trim()
      : "";
  const version =
    typeof pkg.version === "string" && pkg.version.trim().length > 0
      ? pkg.version.trim()
      : "";
  if (!name || !version) return null;
  return { name, version };
}

// ライセンス情報と警告フラグをまとめてエントリ化する
export async function buildPackageEntry({
  pkg,
  pkgDir,
  key,
  baseKey,
}) {
  const source = getRepositoryUrl(pkg);
  const license = formatLicense(pkg.license);
  const flags = [];
  const missing = {
    source: false,
    licenseField: false,
    licenseFiles: false,
  };

  if (!source) {
    missing.source = true;
    flags.push("Missing Source");
  }
  if (!license) {
    missing.licenseField = true;
    flags.push("Missing package.json license");
  }

  const licFiles = await getLicenseLikeFilesInFolderRoot(pkgDir);
  const fileNames = licFiles.map((f) => path.basename(f));

  if (licFiles.length === 0) {
    missing.licenseFiles = true;
    const missingMsg = `Missing ${LICENSE_FILES_LABEL} files`;
    flags.push(missingMsg);
  }

  const licenseTexts =
    licFiles.length > 0
      ? await Promise.all(
          licFiles.map(async (filePath) => ({
            name: path.basename(filePath),
            text: await readTextFileSmart(filePath),
          }))
        )
      : [];

  return {
    key,
    baseKey: baseKey ?? key,
    source,
    license,
    fileNames,
    flags,
    licenseTexts,
    dir: pkgDir,
    missing,
  };
}
