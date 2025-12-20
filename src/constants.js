// デフォルト値と定数群
export const DEFAULT_OPTIONS = {
  nodeModules: "node_modules",
  outFile: "THIRD-PARTY-LICENSE.md",
  reviewFile: "THIRD-PARTY-LICENSE-REVIEW.md",
  failOnMissing: false,
  mode: "recreate", // "recreate" | "update"
};

// ライセンスらしいファイル名を検出する正規表現
export const LICENSE_LIKE_RE =
  /^(LICEN[CS]E|COPYING|NOTICE)(\..*)?$|^(LICEN[CS]E|COPYING|NOTICE)-/i;
