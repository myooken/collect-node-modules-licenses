# Third-Party License Output for node_modules

### What is this?
A tool to scan `node_modules` and **output third-party licenses in Markdown**.  
It generates two files: `THIRD-PARTY-LICENSE.md` (main content) and `THIRD-PARTY-LICENSE-REVIEW.md` (review checklist).

### Highlights
- **ESM / Node.js 18+**, zero dependencies
- **Outputs full license texts** from LICENSE/NOTICE/COPYING files
- **Review file** flags missing Source / license / license files
- `--fail-on-missing` supports CI enforcement

### Options
| Option | Description | Default |
| --- | --- | --- |
| `--node-modules <dir>` | Path to `node_modules` | `node_modules` |
| `--review [file]` | Write review file only; optional filename | `THIRD-PARTY-LICENSE-REVIEW.md` |
| `--license [file]` | Write main file only; optional filename | `THIRD-PARTY-LICENSE.md` |
| `--fail-on-missing` | Exit with code 1 if LICENSE/NOTICE/COPYING are missing | `false` |
| `-h`, `--help` | Show help | - |

> If neither `--review` nor `--license` is specified, **both files are generated**.

### CLI Usage
```bash
# Default
npx @myooken/third-party-license-output-nodemodules

# Custom node_modules path
npx @myooken/third-party-license-output-nodemodules --node-modules ./path/to/node_modules

# Review-only output (optional filename)
third-party-notices --review
third-party-notices --review ./out/THIRD-PARTY-LICENSE-REVIEW.md

# Main-only output (optional filename)
third-party-notices --license
third-party-notices --license ./out/THIRD-PARTY-LICENSE.md

# Exit with code 1 when something is missing
third-party-notices --fail-on-missing
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
- Throws an error if `node_modules` does not exist.
- Missing `license` or `repository` fields are flagged in the review file.
