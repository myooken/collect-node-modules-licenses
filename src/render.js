import os from "node:os";
import path from "node:path";
import { mdSafeText, uniqSorted } from "./fs-utils.js";
import { LICENSE_FILES_LABEL } from "./constants.js";

// メインのTHIRD-PARTY-LICENSE.mdを描画する
export function renderMain(packages, opts) {
  const lines = [];
  const push = (s = "") => lines.push(s);

  push("# Third-Party Licenses");
  push("");
  push(`Generated from: ${opts.nodeModulesDisplay ?? opts.nodeModules}`);
  push("");

  for (const pkg of packages) {
    push(`<a id="${pkg.anchor}"></a>`);
    push(`## ${pkg.key}`);
    push(`- Source: ${pkg.source ?? "(missing)"}`);
    push(`- License: ${pkg.license ?? "(missing)"}`);
    push(`- Usage: ${describeUsage(pkg.usage)}`);

    const fileNames = pkg.fileNames ?? [];
    if (fileNames.length === 0) {
      push(`- (no ${LICENSE_FILES_LABEL} files)`);
      push("");
      push(`_No ${LICENSE_FILES_LABEL} file found in package directory._`);
      push("");
      continue;
    }

    for (const n of fileNames) push(`- ${n}`);
    push("");

    for (const lic of pkg.licenseTexts ?? []) {
      push(`### ${lic.name}`);
      push("```text");
      push(mdSafeText(lic.text).replace(/\s+$/, ""));
      push("```");
      push("");
    }
  }

  return lines.join(os.EOL) + os.EOL;
}

// レビューファイルを描画する
export function renderReview(
  packages,
  opts,
  missingFiles,
  missingSource,
  missingLicenseField
) {
  const lines = [];
  const push = (s = "") => lines.push(s);
  const mainPath = makeMainLinkPath(opts);

  push("# THIRD-PARTY-LICENSE-REVIEW");
  push("");
  push(`Generated from: ${opts.nodeModulesDisplay ?? opts.nodeModules}`);
  push(`Main file: ${mainPath}`);
  push("");

  for (const it of [...packages].sort((a, b) => a.key.localeCompare(b.key))) {
    push(`## ${it.key}`);
    push(`- Main: ${mainPath}#${it.anchor}`);
    push(`- Source: ${it.source ?? "(missing)"}`);
    push(`- License: ${it.license ?? "(missing)"}`);

    push("- Files:");
    const fileNames = it.fileNames ?? [];
    if (fileNames.length === 0) {
      push("  - (none)");
    } else {
      for (const f of fileNames) push(`  - ${f}`);
    }

    const statusParts = [describeUsage(it.usage), ...(it.flags ?? [])].filter(
      Boolean
    );
    const status =
      statusParts.length === 0 ? "Check manually" : statusParts.join(" / ");
    push(`- Status: ${status}`);

    push("- Notes:");
    if (it.notes && it.notes.length > 0) {
      for (const line of it.notes.split(/\r?\n/)) {
        push(`  ${line}`);
      }
    }
    push("");
  }

  push("---");
  push("");
  push("## Missing summary");
  push("");

  const writeList = (title, arr) => {
    push(`### ${title}`);
    push("");
    const xs = uniqSorted(arr);
    if (xs.length === 0) push("- (none)");
    else for (const x of xs) push(`- ${x}`);
    push("");
  };

  writeList("Missing Source", missingSource);
  writeList("Missing package.json license field", missingLicenseField);
  writeList(`Missing ${LICENSE_FILES_LABEL} files`, missingFiles);

  return lines.join(os.EOL) + os.EOL;
}

function makeMainLinkPath(opts) {
  const baseDir = path.dirname(opts.reviewFile);
  const rel = path.relative(baseDir, opts.outFile);
  return rel || path.basename(opts.outFile);
}

function describeUsage(usage) {
  if (usage === "missing") {
    return "Not found in node_modules (kept from previous output)";
  }
  return "Present in node_modules";
}
