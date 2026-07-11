/**
 * Hand-written type definitions for the programmatic API (src/core.js).
 * The implementation stays plain JavaScript; keep this file in sync with
 * src/core.js when the API changes. Consistency is checked by
 * `npm run test:types` (test/types/consumer.ts).
 */

/** Output mode. `"recreate"` regenerates everything from the current scan;
 * `"update"` merges previous outputs, keeping packages that disappeared
 * from node_modules (marked as missing) and preserving review notes. */
export type OutputMode = "recreate" | "update";

/** Options accepted by {@link collectThirdPartyLicenses}.
 * All fields are optional; defaults come from {@link DEFAULT_OPTIONS}. */
export interface CollectOptions {
  /** node_modules directory to scan. Default: `"node_modules"`. */
  nodeModules?: string;
  /** Path of the main markdown file. Used for display paths, cross-file
   * links, and as the merge source in `"update"` mode.
   * Default: `"THIRD-PARTY-LICENSE.md"`. */
  outFile?: string;
  /** Path of the review markdown file. Counterpart of `outFile`.
   * Default: `"THIRD-PARTY-LICENSE-REVIEW.md"`. */
  reviewFile?: string;
  /** Caller intent flag: whether missing license files should be treated
   * as a failure. Normalized into `result.options.failOnMissing`; the
   * library itself does not throw for missing entries. Default: `false`. */
  failOnMissing?: boolean;
  /** Only include packages reachable from the root package.json
   * `dependencies` / `optionalDependencies`. Default: `true`. */
  dependenciesOnly?: boolean;
  /** Caller intent flag: whether the caller plans to write the main file.
   * Normalized into `result.options.writeMain`; the library never writes
   * files itself. Default: `true`. */
  writeMain?: boolean;
  /** Caller intent flag for the review file, like `writeMain`.
   * Default: `true`. */
  writeReview?: boolean;
  /** Output mode. Unrecognized values fall back to `"recreate"`.
   * Default: `"recreate"`. */
  mode?: OutputMode;
  /** Receives non-fatal warnings (e.g. unreadable package.json).
   * Default: prints `warning: <message>` to the console. */
  onWarn?: (message: string) => void;
}

/** Options after normalization, as returned in `result.options`.
 * Paths are resolved to absolute paths; `*Display` variants are
 * relative to the current working directory. */
export interface ResolvedOptions {
  nodeModules: string;
  outFile: string;
  reviewFile: string;
  nodeModulesDisplay: string;
  outFileDisplay: string;
  reviewFileDisplay: string;
  failOnMissing: boolean;
  dependenciesOnly: boolean;
  writeMain: boolean;
  writeReview: boolean;
  warn: (message: string) => void;
  mode: OutputMode;
}

/** Scan statistics, as returned in `result.stats`.
 * The `missing*` lists contain package keys (`name@version`),
 * de-duplicated and sorted. */
export interface CollectStats {
  /** Number of packages found in the scan. */
  packages: number;
  /** Packages without any license-like file in their directory root. */
  missingFiles: string[];
  /** Packages without a usable repository URL. */
  missingSource: string[];
  /** Packages without a `license` field in package.json. */
  missingLicenseField: string[];
}

/** Result of {@link collectThirdPartyLicenses}. */
export interface CollectResult {
  /** Rendered content of the main third-party-license markdown file. */
  mainContent: string;
  /** Rendered content of the review markdown file. */
  reviewContent: string;
  /** The normalized options the run used. */
  options: ResolvedOptions;
  /** Scan statistics (counts and missing-item lists). */
  stats: CollectStats;
}

/** Scan `node_modules` and render third-party license markdown.
 * Returns the rendered contents; writing files is up to the caller.
 * Rejects when the node_modules directory does not exist. */
export declare function collectThirdPartyLicenses(
  options?: CollectOptions
): Promise<CollectResult>;

/** Default values applied by {@link collectThirdPartyLicenses}. */
export declare const DEFAULT_OPTIONS: {
  nodeModules: string;
  outFile: string;
  reviewFile: string;
  failOnMissing: boolean;
  mode: OutputMode;
  dependenciesOnly: boolean;
};
