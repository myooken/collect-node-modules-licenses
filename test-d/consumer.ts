// Compile-only consumer of the public type definitions; run with
// `npm run test:types`. The package name resolves through the package
// self-reference, so this also verifies the exports "types" wiring in
// package.json. Kept outside test/ because `node --test` on Node 22+
// would pick up .ts files there and try to execute this fixture.
import {
  collectThirdPartyLicenses,
  DEFAULT_OPTIONS,
  type CollectOptions,
  type CollectResult,
  type OutputMode,
} from "node-module-license-output";

const options: CollectOptions = {
  nodeModules: "node_modules",
  outFile: "THIRD-PARTY-LICENSE.md",
  reviewFile: "THIRD-PARTY-LICENSE-REVIEW.md",
  failOnMissing: true,
  dependenciesOnly: false,
  writeMain: true,
  writeReview: false,
  mode: "update",
  onWarn: (message) => {
    void message.length;
  },
};

const result: CollectResult = await collectThirdPartyLicenses(options);
await collectThirdPartyLicenses();

void result.mainContent.trimEnd();
void result.reviewContent.trimEnd();
void result.options.nodeModulesDisplay.length;
result.options.warn("manual warning");
void result.stats.packages.toFixed(0);
void result.stats.missingFiles.map((key) => key.length);

DEFAULT_OPTIONS.mode satisfies OutputMode;
DEFAULT_OPTIONS.nodeModules satisfies string;

// @ts-expect-error unknown options must be rejected
await collectThirdPartyLicenses({ unknownOption: true });

// @ts-expect-error mode is a closed union
await collectThirdPartyLicenses({ mode: "replace" });

// @ts-expect-error the result is read-only rendered content, not a writer
result.write;

// The implementation must stay assignable to the declared API surface;
// this catches removed exports and drifted return shapes in src/core.js
import * as impl from "../src/core.js";
import type * as api from "node-module-license-output";
impl satisfies typeof api;
