// デフォルト値と定数群
export const DEFAULT_OPTIONS = {
  nodeModules: "node_modules",
  outFile: "THIRD-PARTY-LICENSE.md",
  reviewFile: "THIRD-PARTY-LICENSE-REVIEW.md",
  failOnMissing: false,
  mode: "recreate", // "recreate" | "update"
};

// ライセンスらしいファイル名を検出する正規表現
const LICENSE_LIKE_BASE =
  "(LICEN[CS]E|COPYING|COPYRIGHT|NOTICE|THIRD[-_. ]?PARTY[-_. ]?(?:NOTICES?|NOTICE[-_. ]?TEXTS?|TEXTS?|LICENSES?))";

export const LICENSE_LIKE_RE = new RegExp(
  `^${LICENSE_LIKE_BASE}(\\..*)?$|^${LICENSE_LIKE_BASE}-`,
  "i"
);

export const LICENSE_FILES_LABEL =
  "LICENSE/NOTICE/COPYRIGHT/THIRD-PARTY-NOTICES/THIRD-PARTY-LICENSES/ThirdPartyNoticeText/ThirdPartyText/COPYING";
