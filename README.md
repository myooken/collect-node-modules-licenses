# third-party-notices

Generate third-party license notices from `node_modules` and output Markdown files.

- Scans installed packages (`node_modules/**/package.json`)
- Collects `LICENSE`, `LICENCE`, `COPYING`, `NOTICE` files in each package root
- Outputs:
  - `THIRD-PARTY-LICENSE.md` (license texts, optional)
  - `THIRD-PARTY-LICENSE-REVIEW.md` (review checklist + links to sections)

## Install

### Use with npx (recommended)
```bash
npx third-party-notices
````

### Install as a dev dependency

```bash
npm i -D third-party-notices
```

## Usage

### Default

```bash
npx third-party-notices
```

Generated files:

* `THIRD-PARTY-LICENSE.md`
* `THIRD-PARTY-LICENSE-REVIEW.md`

### Options

```bash
npx third-party-notices \
  --node-modules node_modules \
  --out THIRD-PARTY-LICENSE.md \
  --review-out THIRD-PARTY-LICENSE-REVIEW.md \
  --no-texts \
  --fail-on-missing
```

#### `--node-modules <dir>`

Directory to scan. Default: `node_modules`

#### `--out <file>`

Main output file. Default: `THIRD-PARTY-LICENSE.md`

#### `--review-out <file>`

Review output file. Default: `THIRD-PARTY-LICENSE-REVIEW.md`

#### `--no-texts`

Do not include full license texts. Only list file names.

#### `--fail-on-missing`

Exit with code `1` if any package is missing `LICENSE/NOTICE/COPYING` files.
Useful for CI.

## Output format

### Main file

Each package section includes:

* source (from `package.json#repository`)
* license (from `package.json#license`)
* detected license-like files
* (optionally) the full text of those files

### Review file

A checklist oriented file which includes:

* a link to the corresponding section in the main file
* missing fields/files summary
* a blank `Notes:` area for manual review

## Notes / Limitations

* This tool only looks for license-like files in the **package directory root**.
* Some packages do not ship license files in `node_modules` (metadata only). In that case, review and add notes manually.
* Node.js >= 18 is required.
