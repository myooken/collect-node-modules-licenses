import fsp from "node:fs/promises";
import path from "node:path";
import { readPackageJson, uniqSorted } from "./fs-utils.js";
// Cache realpath resolutions to keep dependency traversal fast.
const realpathCache = new Map();
// dependencies/optionalDependencies から到達可能なパッケージのディレクトリを収集
export async function collectDependencyDirs(opts) {
  const nodeModulesReal = await toRealPath(opts.nodeModules);
  const projectDir = path.dirname(path.resolve(opts.nodeModules));
  const projectRootBoundary = projectDir;
  const projectPackageJson = path.join(projectDir, "package.json");
  const rootPkg = await readPackageJson(projectPackageJson);
  if (!rootPkg) {
    throw new Error(`package.json not found: ${projectPackageJson}`);
  }
  const rootDeps = collectDependencyNames(rootPkg);
  if (rootDeps.length === 0) {
    opts.warn("No dependencies found in package.json; output will be empty.");
    return new Set();
  }
  const allowed = new Set();
  const visitedDirs = new Set();
  const stack = [];
  for (const depName of rootDeps) {
    const depDir = await resolvePackageDir(
      projectDir,
      depName,
      nodeModulesReal,
      projectRootBoundary
    );
    if (!depDir) {
      opts.warn(`Dependency not found in node_modules: ${depName}`);
      continue;
    }
    stack.push(depDir);
  }
  while (stack.length > 0) {
    const pkgDir = stack.pop();
    if (!pkgDir || visitedDirs.has(pkgDir)) continue;
    visitedDirs.add(pkgDir);
    const pkg = await readPackageJson(path.join(pkgDir, "package.json"));
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
    allowed.add(pkgDir);
    for (const depName of collectDependencyNames(pkg)) {
      const depDir = await resolvePackageDir(
        pkgDir,
        depName,
        nodeModulesReal,
        projectRootBoundary
      );
      if (!depDir) {
        opts.warn(
          `Dependency not found in node_modules: ${depName} (required by ${name}@${version})`
        );
        continue;
      }
      stack.push(depDir);
    }
  }
  return allowed;
}
// node_modules からの相対パスで同名同バージョンの区別をつける
export function makePackagePathLabel(pkgDir, nodeModulesRoot) {
  const rel = path.relative(nodeModulesRoot, pkgDir).replace(/\\/g, "/");
  return rel || path.basename(pkgDir);
}
function collectDependencyNames(pkg) {
  const deps =
    pkg?.dependencies && typeof pkg.dependencies === "object"
      ? Object.keys(pkg.dependencies)
      : [];
  const optionalDeps =
    pkg?.optionalDependencies && typeof pkg.optionalDependencies === "object"
      ? Object.keys(pkg.optionalDependencies)
      : [];
  return uniqSorted([...deps, ...optionalDeps]);
}
async function resolvePackageDir(
  fromDir,
  depName,
  nodeModulesRoot,
  projectRootBoundary
) {
  const rootParent = path.dirname(nodeModulesRoot);
  const boundary = path.resolve(projectRootBoundary);
  let dir = fromDir;
  while (true) {
    const nmDir = path.join(dir, "node_modules");
    const candidateDir = path.join(nmDir, depName);
    const candidatePkg = path.join(candidateDir, "package.json");
    const stat = await fsp.stat(candidatePkg).catch(() => null);
    if (stat && stat.isFile()) return toRealPath(candidateDir);
    if (dir === rootParent) break;
    if (path.resolve(dir) === boundary) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

async function toRealPath(targetPath) {
  const cached = realpathCache.get(targetPath);
  if (cached) return cached;
  try {
    const resolved = await fsp.realpath(targetPath);
    realpathCache.set(targetPath, resolved);
    return resolved;
  } catch {
    const resolved = path.resolve(targetPath);
    realpathCache.set(targetPath, resolved);
    return resolved;
  }
}
