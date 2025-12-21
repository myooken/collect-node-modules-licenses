# Third-Party License Output for node_modules

[![npm version](https://img.shields.io/npm/v/@myooken/license-output.svg)](https://www.npmjs.com/package/@myooken/license-output)
[![npm downloads](https://img.shields.io/npm/dm/@myooken/license-output.svg)](https://www.npmjs.com/package/@myooken/license-output)
[![node](https://img.shields.io/node/v/@myooken/license-output.svg)](https://www.npmjs.com/package/@myooken/license-output)

https://www.npmjs.com/package/@myooken/license-output

### What is this?

A tool to scan `node_modules` and **output third-party licenses in Markdown**.  
It generates two files: `THIRD-PARTY-LICENSE.md` (main content) and `THIRD-PARTY-LICENSE-REVIEW.md` (review checklist).

### Highlights

- **ESM / Node.js 18+**, zero dependencies
- **Outputs full license texts** from LICENSE/NOTICE/COPYING files
- **Review file** flags missing Source / license / license files
- `--fail-on-missing` supports CI enforcement

CLI command: `third-party-license`

### Usage

#### Run without installing (recommended)

```bash
npx --package=@myooken/license-output -- third-party-license
```

#### Run via npm exec

```bash
npm exec --package=@myooken/license-output -- third-party-license
```

#### Install globally

```bash
npm i -g @myooken/license-output
third-party-license
```

### Options

| Option                 | Description                                                                 | Default                         |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------- |
| `--node-modules <dir>` | Path to `node_modules`                                                      | `node_modules`                  |
| `--review [file]`      | Write review file only; optional filename                                   | `THIRD-PARTY-LICENSE-REVIEW.md` |
| `--license [file]`     | Write main file only; optional filename                                     | `THIRD-PARTY-LICENSE.md`        |
| `--recreate`           | Regenerate files from current `node_modules` only (drops removed packages)  | `true` (default)                |
| `--update`             | Merge with existing outputs, keep removed packages, and mark their presence | `false`                        |
| `--fail-on-missing`    | Exit with code 1 if LICENSE/NOTICE/COPYING are missing                      | `false`                         |
| `-h`, `--help`         | Show help                                                                   | -                               |

> If neither `--review` nor `--license` is specified, **both files are generated**.
> Packages in both files are sorted by name@version; `--update` keeps entries for packages no longer in `node_modules` and annotates their usage status.

### Examples

```bash
# Default (both files)
third-party-license

# Update existing files without dropping removed packages
third-party-license --update

# Custom node_modules path
third-party-license --node-modules ./path/to/node_modules

# Review-only output (optional filename)
third-party-license --review
third-party-license --review ./out/THIRD-PARTY-LICENSE-REVIEW.md

# Main-only output (optional filename)
third-party-license --license
third-party-license --license ./out/THIRD-PARTY-LICENSE.md

# Exit with code 1 when something is missing (with --fail-on-missing)
third-party-license --fail-on-missing
```

### Programmatic API

```js
import { collectThirdPartyLicenses } from "@myooken/license-output";

const result = await collectThirdPartyLicenses({
  nodeModules: "./node_modules",
  outFile: "./THIRD-PARTY-LICENSE.md",
  reviewFile: "./THIRD-PARTY-LICENSE-REVIEW.md",
  failOnMissing: false,
  // mode: "update", // keep packages missing from node_modules when updating files
});

console.log(result.mainContent);
console.log(result.reviewContent);
```

Outputs are sorted by package key. Use `mode: "update"` to merge with existing files and keep packages that are no longer in `node_modules`, with their usage shown in both outputs.

### Output overview

- **THIRD-PARTY-LICENSE.md**
  - List of packages
  - Source / License info
  - Full LICENSE/NOTICE/COPYING texts
  - Usage line shows whether the package is present in the current `node_modules`
- **THIRD-PARTY-LICENSE-REVIEW.md**
  - Review-oriented checklist
  - Usage-aware status (present / not found) for each package
  - **Missing summary** section

### How it differs from typical npm license tools (general view)

> Examples: `license-checker`, `license-report`, `license-finder`

- **Focused on bundling full license texts into a single Markdown file**
  - Many existing tools emphasize JSON/CSV reports; this tool emphasizes **ready-to-share license documents**.
- **Separate review file** to track missing metadata
  - Easier to integrate into audit workflows.
- **ESM / Node.js 18+ with no dependencies**
  - Simple runtime requirements.

### Notes

- Scans all packages under `node_modules` (including nested dependencies); license files are searched only in each package root directory.
- Exit code 0: success.
- Exit code 1: missing license files when `--fail-on-missing` is set, or `node_modules` not found.
- Throws an error if `node_modules` does not exist.
- Missing `license` or `repository` fields are flagged in the review file.
