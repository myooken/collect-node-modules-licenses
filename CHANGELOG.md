# Changelog

Notable changes to this project. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); dates are npm
publish dates.

## [1.1.0] - 2026-07-12

### Fixed

- Ghost packages no longer accumulate in `--update` mode (#12). The parser
  for existing outputs treated every top-level `## ` line as a package
  heading, so the review file's "Missing summary" section and `## ` lines
  inside embedded license texts were re-imported as phantom "missing"
  packages on every run. Headings inside code fences and headings that
  don't look like a `name@version` key are no longer package boundaries,
  which also removes ghosts already written into existing files.
  Known limitation: a pre-existing ghost whose heading contains `@`
  (e.g. from a license line like `Contact: foo@bar`) is not auto-migrated —
  run once with `--recreate` to clear it.
- Package metadata (`repository` / `license` / `name` / `version`) and
  license file names containing line breaks can no longer inject fake
  package headings into the generated Markdown (#12).

### Added

- Hand-written TypeScript type definitions for the programmatic API
  (`collectThirdPartyLicenses`, `DEFAULT_OPTIONS`), wired through the
  `exports` "types" condition (#13).
- npm metadata: `author`, `funding`, discoverability keywords, and a
  `./package.json` export (#13).

### Changed

- Internal refactor into focused modules, with a golden test suite and
  multi-OS CI (Linux/macOS/Windows, Node 18–24) (#11).
- Releases are now published from GitHub Actions via npm trusted
  publishing, with provenance attestation (#13, #14).

> Version note: this release follows 1.0.0 directly; the 0.4.x–1.0.x range
> was skipped because 1.0.0 was already published to npm.

## [1.0.0] - 2026-01-24

### Added

- Dependency-tree scanning: `--dependencies-only` (new default) limits
  output to packages reachable from the project's `dependencies` /
  `optionalDependencies`; `--dependencies-all` keeps the exhaustive scan
  (#9).
- pnpm layout support: symlinked/junctioned packages are resolved via
  realpath, covering pnpm's in-tree `.pnpm` store (#10).

## [0.3.1] - 2026-01-07

### Fixed

- Documentation link fixes.

## [0.3.0] - 2025-12-28

### Added

- Detection of `ThirdPartyNoticeText` / `ThirdPartyText` files
  (e.g. TypeScript's `ThirdPartyNoticeText.txt`) (#8).

## Earlier versions

Versions 0.1.0–0.2.1 (2025-12) were published under the previous package
name `@myooken/license-output`, including the `--update` mode (#6) and
third-party notice file support (#7).

[1.1.0]: https://github.com/myooken/collect-node-modules-licenses/releases/tag/v1.1.0
