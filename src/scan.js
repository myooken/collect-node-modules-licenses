import path from "node:path";
import {
  makeAnchorId,
  readPackageJson,
  uniqSorted,
  walkForPackageJson,
} from "./fs-utils.js";
import {
  collectDependencyDirs,
  makePackagePathLabel,
} from "./dependency-tree.js";
import { buildPackageEntry } from "./package-entry.js";
// node_modules を走査してパッケージ情報を集約する
export async function gatherPackages(opts) {
  const allowedDirs = opts.dependenciesOnly
    ? await collectDependencyDirs(opts)
    : null;
  const packages = [];
  const seen = new Set();
  for await (const pj of walkForPackageJson(opts.nodeModules)) {
    const pkgDir = path.dirname(pj);
    if (allowedDirs && !allowedDirs.has(pkgDir)) continue;
    const pkg = await readPackageJson(pj);
    if (!pkg) continue;
    const ident = getPackageIdentity(pkg);
    if (!ident) continue;
    const baseKey = `${ident.name}@${ident.version}`;
    const seenKey = allowedDirs ? pkgDir : baseKey;
    if (seen.has(seenKey)) continue;
    seen.add(seenKey);
    const key = baseKey;
    const anchor = makeAnchorId(key);
    const { entry } = await buildPackageEntry({
      pkg,
      pkgDir,
      key,
      baseKey,
      anchor,
      opts,
    });
    packages.push(entry);
  }

  // dependency-only で同名同バージョンが複数ある場合はパスで区別する
  if (allowedDirs) disambiguateDuplicateKeys(packages, opts.nodeModules);
  const missingFiles = [];
  const missingSource = [];
  const missingLicenseField = [];
  for (const pkg of packages) {
    if (pkg.missing?.licenseFiles) missingFiles.push(pkg.key);
    if (pkg.missing?.source) missingSource.push(pkg.key);
    if (pkg.missing?.licenseField) missingLicenseField.push(pkg.key);
  }
  return {
    packages,
    missingFiles: uniqSorted(missingFiles),
    missingSource: uniqSorted(missingSource),
    missingLicenseField: uniqSorted(missingLicenseField),
    seenCount: seen.size,
  };
}
function getPackageIdentity(pkg) {
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

function disambiguateDuplicateKeys(packages, nodeModulesRoot) {
  const groups = new Map();
  for (const pkg of packages) {
    const list = groups.get(pkg.baseKey) ?? [];
    list.push(pkg);
    groups.set(pkg.baseKey, list);
  }

  for (const list of groups.values()) {
    if (list.length < 2) continue;
    for (const pkg of list) {
      const label = makePackagePathLabel(pkg.dir, nodeModulesRoot);
      const key = `${pkg.baseKey} (${label})`;
      pkg.key = key;
      pkg.anchor = `${makeAnchorId(key)}-${hashPathSuffix(pkg.dir)}`;
    }
  }
}

function hashPathSuffix(dir) {
  let hash = 5381;
  for (let i = 0; i < dir.length; i += 1) {
    hash = (hash * 33) ^ dir.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
