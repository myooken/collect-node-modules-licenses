import path from "node:path";
import {
  getLicenseLikeFilesInFolderRoot,
  makeAnchorId,
  readPackageJson,
  readTextFileSmart,
  uniqSorted,
  walkForPackageJson,
} from "./fs-utils.js";
import { getRepositoryUrl } from "./url.js";

// node_modules を走査してパッケージ情報を集約する
export async function gatherPackages(opts) {
  const missingFiles = [];
  const missingSource = [];
  const missingLicenseField = [];
  const packages = [];
  const seen = new Set();

  for await (const pj of walkForPackageJson(opts.nodeModules)) {
    const pkgDir = path.dirname(pj);
    const pkg = await readPackageJson(pj);
    if (!pkg) continue;

    const name =
      typeof pkg.name === "string" && pkg.name.trim().length > 0
        ? pkg.name.trim()
        : "";
    const version =
      typeof pkg.version === "string" && pkg.version.trim().length > 0
        ? pkg.version.trim()
        : "";
    if (!name || !version) continue;

    const key = `${name}@${version}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const anchor = makeAnchorId(key);
    const source = getRepositoryUrl(pkg);
    const license = formatLicense(pkg.license); // 文字列/オブジェクト/配列すべてを受け付ける

    const flags = [];
    if (!source) {
      missingSource.push(key);
      flags.push("Missing Source");
      opts.warn(`Unknown source: ${key}`);
    }
    if (!license) {
      missingLicenseField.push(key);
      flags.push("Missing package.json license");
      opts.warn(`Missing license in package.json: ${key}`);
    }

    const licFiles = await getLicenseLikeFilesInFolderRoot(pkgDir);
    const fileNames = licFiles.map((f) => path.basename(f));

    if (licFiles.length === 0) {
      missingFiles.push(key);
      flags.push("Missing LICENSE/NOTICE/COPYING files");
      opts.warn(`Missing LICENSE/NOTICE/COPYING in ${pkgDir} (${key})`);
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

    packages.push({
      key,
      anchor,
      source,
      license,
      fileNames,
      flags,
      licenseTexts,
    });
  }

  return {
    packages,
    missingFiles: uniqSorted(missingFiles),
    missingSource: uniqSorted(missingSource),
    missingLicenseField: uniqSorted(missingLicenseField),
    seenCount: seen.size,
  };
}

// license フィールドを人間可読にまとめる（文字列/オブジェクト/配列に対応）
function formatLicense(raw) {
  const parts = [];

  const pushMaybe = (v) => {
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  };

  const handleObj = (licObj) => {
    if (!licObj || typeof licObj !== "object") return;
    const type =
      typeof licObj.type === "string" && licObj.type.trim()
        ? licObj.type.trim()
        : "";
    const url =
      typeof licObj.url === "string" && licObj.url.trim()
        ? licObj.url.trim()
        : "";
    if (type && url) {
      parts.push(`${type} (${url})`);
    } else {
      pushMaybe(type);
      pushMaybe(url);
    }
  };

  if (typeof raw === "string") {
    pushMaybe(raw);
  } else if (Array.isArray(raw)) {
    for (const lic of raw) {
      if (typeof lic === "string") pushMaybe(lic);
      else handleObj(lic);
    }
  } else {
    handleObj(raw);
  }

  if (parts.length === 0) return null;
  return [...new Set(parts)].join(" | ");
}
