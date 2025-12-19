# Third-Party License Output for node_modules

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

| Option                 | Description                                            | Default                         |
| ---------------------- | ------------------------------------------------------ | ------------------------------- |
| `--node-modules <dir>` | Path to `node_modules`                                 | `node_modules`                  |
| `--review [file]`      | Write review file only; optional filename              | `THIRD-PARTY-LICENSE-REVIEW.md` |
| `--license [file]`     | Write main file only; optional filename                | `THIRD-PARTY-LICENSE.md`        |
| `--fail-on-missing`    | Exit with code 1 if LICENSE/NOTICE/COPYING are missing | `false`                         |
| `-h`, `--help`         | Show help                                              | -                               |

> If neither `--review` nor `--license` is specified, **both files are generated**.

### Examples

```bash
# Default (both files)
third-party-license

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
import { collectThirdPartyLicenses } from "@myooken/third-party-license-output-nodemodules";

const result = await collectThirdPartyLicenses({
  nodeModules: "./node_modules",
  outFile: "./THIRD-PARTY-LICENSE.md",
  reviewFile: "./THIRD-PARTY-LICENSE-REVIEW.md",
  failOnMissing: false,
});

console.log(result.mainContent);
console.log(result.reviewContent);
```

### Output overview

- **THIRD-PARTY-LICENSE.md**
  - List of packages
  - Source / License info
  - Full LICENSE/NOTICE/COPYING texts
- **THIRD-PARTY-LICENSE-REVIEW.md**
  - Review-oriented checklist
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
