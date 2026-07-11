import path from "node:path";
import {
  createRealPathResolver,
  makeAnchorId,
  mdSafeLine,
  readPackageJson,
  uniqSorted,
  walkForPackageJson,
} from "./fs-utils.js";
import {
  collectDependencyDirs,
  makePackagePathLabel,
} from "./dependency-tree.js";
import { buildPackageEntry, getPackageIdentity } from "./package-entry.js";
import { LICENSE_FILES_LABEL } from "./constants.js";
// Cache realpath resolutions to avoid repeated fs calls during large scans.
const toRealPath = createRealPathResolver();
// node_modules を走査してパッケージ情報を集約する
export async function gatherPackages(opts) {
  const nodeModulesReal = await toRealPath(opts.nodeModules);
  const allowedDirs = opts.dependenciesOnly
    ? await collectDependencyDirs(opts)
    : null;
  const packages = [];
  const seen = new Set();
  for await (const pj of walkForPackageJson(opts.nodeModules)) {
    const pkgDir = await toRealPath(path.dirname(pj));
    if (allowedDirs && !allowedDirs.has(pkgDir)) continue;
    const pkg = await readPackageJson(pj);
    if (!pkg) continue;
    const ident = getPackageIdentity(pkg);
    if (!ident) continue;
    const baseKey = `${ident.name}@${ident.version}`;
    if (seen.has(pkgDir)) continue;
    seen.add(pkgDir);
    const entry = await buildPackageEntry({
      pkg,
      pkgDir,
      key: baseKey,
      baseKey,
    });
    packages.push(entry);
  }

  // 同名同バージョンが複数ある場合はパスで区別する
  disambiguateDuplicateKeys(packages, nodeModulesReal);
  for (const pkg of packages) {
    pkg.anchor = makeAnchorId(pkg.key);
  }
  ensureUniqueAnchors(packages, nodeModulesReal);
  const missingFiles = [];
  const missingSource = [];
  const missingLicenseField = [];
  for (const pkg of packages) {
    if (pkg.missing?.licenseFiles) {
      missingFiles.push(pkg.key);
      opts.warn(`Missing ${LICENSE_FILES_LABEL} in ${pkg.dir} (${pkg.key})`);
    }
    if (pkg.missing?.source) {
      missingSource.push(pkg.key);
      opts.warn(`Unknown source: ${pkg.key}`);
    }
    if (pkg.missing?.licenseField) {
      missingLicenseField.push(pkg.key);
      opts.warn(`Missing license in package.json: ${pkg.key}`);
    }
  }
  return {
    packages,
    missingFiles: uniqSorted(missingFiles),
    missingSource: uniqSorted(missingSource),
    missingLicenseField: uniqSorted(missingLicenseField),
    seenCount: seen.size,
  };
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
      // Directory names may contain line breaks on some filesystems;
      // keys must stay single-line markdown
      const key = mdSafeLine(`${pkg.baseKey} (${label})`);
      pkg.key = key;
    }
  }
}

function hashStableSuffix(value) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function ensureUniqueAnchors(packages, nodeModulesRoot) {
  const groups = new Map();
  for (const pkg of packages) {
    const list = groups.get(pkg.anchor) ?? [];
    list.push(pkg);
    groups.set(pkg.anchor, list);
  }

  for (const list of groups.values()) {
    if (list.length < 2) continue;
    for (const pkg of list) {
      const label = makePackagePathLabel(pkg.dir, nodeModulesRoot);
      pkg.anchor = `${pkg.anchor}-${hashStableSuffix(label)}`;
    }
  }
}
