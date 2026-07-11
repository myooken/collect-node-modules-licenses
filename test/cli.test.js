// CLI のゴールデンテスト: 一時ディレクトリにフィクスチャを生成し、
// 6 シナリオの生成ファイル・stdout・stderr を正規化スナップショットと比較する。
// スナップショットの更新: UPDATE_SNAPSHOTS=1 npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../src/cli.js", import.meta.url));
const SNAPSHOT_DIR = fileURLToPath(new URL("./snapshots/", import.meta.url));
const UPDATE = process.env.UPDATE_SNAPSHOTS === "1";

// ---- フィクスチャ生成 -------------------------------------------------

function writeJson(dir, value) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(value) + "\n");
}

function writeText(filePath, text) {
  fs.writeFileSync(filePath, text);
}

// scoped / 重複バージョン / ライセンス欠落 / UTF-16 / symlink / .bin 除外 /
// 壊れた package.json を含む node_modules ツリーを組み立てる
function buildFixture(root) {
  const fixture = path.join(root, "fixture");
  const nm = path.join(fixture, "node_modules");

  writeJson(fixture, {
    name: "fixture-root",
    version: "1.0.0",
    dependencies: {
      "pkg-a": "^1.0.0",
      "@scope/b": "^2.0.0",
      "has-optional": "^1.0.0",
      "linked-pkg": "^1.0.0",
      "missing-dep": "^1.0.0",
    },
    devDependencies: { "dev-only": "^1.0.0" },
  });

  // pkg-a: LICENSE + NOTICE、repository 文字列、依存あり
  writeJson(path.join(nm, "pkg-a"), {
    name: "pkg-a",
    version: "1.0.0",
    license: "MIT",
    repository: "github:example/pkg-a",
    dependencies: { "dup-pkg": "^1.0.0", "multi-lic": "^3.0.0" },
  });
  writeText(path.join(nm, "pkg-a", "LICENSE"), "MIT License\n\nCopyright (c) Example A\n");
  writeText(path.join(nm, "pkg-a", "NOTICE.md"), "Notice text for pkg-a\n");

  // @scope/b: scoped、license/repository がオブジェクト
  writeJson(path.join(nm, "@scope", "b"), {
    name: "@scope/b",
    version: "2.0.0",
    license: { type: "Apache-2.0", url: "https://apache.org/licenses/LICENSE-2.0" },
    repository: { type: "git", url: "git+https://github.com/example/b.git" },
    dependencies: { "dup-pkg": "^1.0.0", "pkg-a": "^1.0.0" },
  });
  writeText(path.join(nm, "@scope", "b", "COPYING"), "Apache License 2.0 text here\n");

  // dup-pkg: ルートとネストに同名同バージョン → キー・アンカーの曖昧性解決を検証
  writeJson(path.join(nm, "dup-pkg"), {
    name: "dup-pkg",
    version: "1.0.0",
    license: "ISC",
    repository: "https://example.com/dup",
  });
  writeText(path.join(nm, "dup-pkg", "LICENSE"), "ISC License root copy\n");
  writeJson(path.join(nm, "@scope", "b", "node_modules", "dup-pkg"), {
    name: "dup-pkg",
    version: "1.0.0",
    license: "ISC",
    repository: "https://example.com/dup",
  });
  writeText(
    path.join(nm, "@scope", "b", "node_modules", "dup-pkg", "LICENSE"),
    "ISC License nested copy\n"
  );

  // has-optional → optionalDependencies の追跡を検証
  writeJson(path.join(nm, "has-optional"), {
    name: "has-optional",
    version: "1.0.0",
    license: "MIT",
    repository: "https://example.com/ho",
    optionalDependencies: { "opt-pkg": "^1.0.0" },
  });
  writeText(path.join(nm, "has-optional", "LICENSE.txt"), "MIT ho\n");

  // opt-pkg: license フィールド・repository・ライセンスファイルすべて欠落
  writeJson(path.join(nm, "opt-pkg"), { name: "opt-pkg", version: "1.0.0" });

  // dev-only: dependencies に含まれない → --dependencies-only では除外される
  writeJson(path.join(nm, "dev-only"), {
    name: "dev-only",
    version: "1.0.0",
    license: "MIT",
    repository: "https://example.com/dev",
  });
  writeText(path.join(nm, "dev-only", "LICENSE"), "MIT dev\n");

  // multi-lic: license 配列 + UTF-16LE BOM 付きライセンスファイル
  writeJson(path.join(nm, "pkg-a", "node_modules", "multi-lic"), {
    name: "multi-lic",
    version: "3.1.4",
    license: ["MIT", { type: "BSD-2-Clause", url: "https://example.com/bsd" }],
    repository: "https://example.com/multi",
  });
  const utf16Body = Buffer.from("UTF-16 licensed text éè\n", "utf16le");
  fs.writeFileSync(
    path.join(nm, "pkg-a", "node_modules", "multi-lic", "LICENSE"),
    Buffer.concat([Buffer.from([0xff, 0xfe]), utf16Body])
  );

  // pnpm レイアウト: 実体は node_modules/.pnpm 配下、トップレベルは symlink。
  // 走査(実体)と依存解決(symlink 経由の realpath)が同一パスに解決されることを検証する
  const store = path.join(nm, ".pnpm", "linked-pkg@1.0.0", "node_modules", "linked-pkg");
  writeJson(store, {
    name: "linked-pkg",
    version: "1.0.0",
    license: "MIT",
    repository: "https://example.com/linked",
  });
  writeText(path.join(store, "LICENSE"), "MIT linked\n");
  // Windows では junction(POSIX では type は無視され通常の symlink になる)
  fs.symlinkSync(store, path.join(nm, "linked-pkg"), "junction");

  // .bin 配下の package.json は無視される
  writeJson(path.join(nm, ".bin"), { name: "should-ignore", version: "9.9.9" });

  // 壊れた package.json はスキップされる
  fs.mkdirSync(path.join(nm, "broken"), { recursive: true });
  writeText(path.join(nm, "broken", "package.json"), "{ not json");

  return nm;
}

// ---- update モード用の前回出力シード ----------------------------------

const SEED_MAIN = `# Third-Party Licenses

Generated from: node_modules

<a id="pkg-gone-pkg-0-9-0"></a>
## gone-pkg@0.9.0
- Source: https://example.com/gone
- License: MIT
- Usage: Present in node_modules
- LICENSE

### LICENSE
\`\`\`text
old gone license
\`\`\`

<a id="pkg-pkg-a-1-0-0"></a>
## pkg-a@1.0.0
- Source: old-source
- License: MIT
- Usage: Present in node_modules
- LICENSE

### LICENSE
\`\`\`text
old pkg-a license
\`\`\`
`;

const SEED_REVIEW = `# THIRD-PARTY-LICENSE-REVIEW

Generated from: node_modules
Main file: THIRD-PARTY-LICENSE.md

## gone-pkg@0.9.0
- Main: THIRD-PARTY-LICENSE.md#pkg-gone-pkg-0-9-0
- Source: https://example.com/gone
- License: MIT
- Files:
  - LICENSE
- Status: Present in node_modules
- Notes:
  reviewed by legal 2026-01

## pkg-a@1.0.0
- Main: THIRD-PARTY-LICENSE.md#pkg-pkg-a-1-0-0
- Source: old-source
- License: MIT
- Files:
  - LICENSE
- Status: Present in node_modules
- Notes:
  keep an eye on this one
  second line
`;

// ---- シナリオ定義 -----------------------------------------------------

const MAIN = "THIRD-PARTY-LICENSE.md";
const REVIEW = "THIRD-PARTY-LICENSE-REVIEW.md";

const scenarios = [
  { name: "default", args: [], exit: 0, files: { [MAIN]: "license.md", [REVIEW]: "review.md" } },
  {
    name: "deps-all",
    args: ["--dependencies-all"],
    exit: 0,
    files: { [MAIN]: "license.md", [REVIEW]: "review.md" },
  },
  {
    name: "review-only",
    args: ["--review", "custom-review.md"],
    exit: 0,
    files: { "custom-review.md": "review.md" },
    absent: [MAIN, REVIEW],
  },
  {
    name: "license-only",
    args: ["--license", "custom-license.md"],
    exit: 0,
    files: { "custom-license.md": "license.md" },
    absent: [MAIN, REVIEW],
  },
  {
    name: "fail-missing",
    args: ["--fail-on-missing"],
    exit: 1,
    files: { [MAIN]: "license.md", [REVIEW]: "review.md" },
  },
  {
    name: "update",
    args: ["--update"],
    exit: 0,
    seed: true,
    files: { [MAIN]: "license.md", [REVIEW]: "review.md" },
  },
  {
    // CRLF の既存ファイルでも --update が同じ結果になること(Windows 生成物の取り込み)
    name: "update-crlf",
    args: ["--update"],
    exit: 0,
    seed: true,
    seedEol: "\r\n",
    snapshots: "update",
    files: { [MAIN]: "license.md", [REVIEW]: "review.md" },
  },
];

// ---- スナップショット比較 ---------------------------------------------

// EOL・一時ディレクトリの絶対パス・パス区切りを正規化して OS 非依存にする
function makeNormalizer(root) {
  const roots = [...new Set([fs.realpathSync(root), root])];
  return (text) => {
    let s = text.replace(/\r\n/g, "\n");
    for (const r of roots) s = s.split(r).join("<ROOT>");
    return s.replace(/\\/g, "/");
  };
}

function assertSnapshot(actual, snapshotName) {
  const snapshotPath = path.join(SNAPSHOT_DIR, snapshotName);
  if (UPDATE) {
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    fs.writeFileSync(snapshotPath, actual);
    return;
  }
  assert.ok(
    fs.existsSync(snapshotPath),
    `snapshot not found: ${snapshotName} (run UPDATE_SNAPSHOTS=1 npm test)`
  );
  assert.equal(actual, fs.readFileSync(snapshotPath, "utf8"), `snapshot mismatch: ${snapshotName}`);
}

// ---- 本体 --------------------------------------------------------------

test("CLI golden scenarios", async (t) => {
  // realpath して使う: macOS では tmpdir が symlink (/var → /private/var) のため、
  // そのままだと CLI の cwd と食い違い、相対表示パスが OS 依存になる
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "cnml-test-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const nm = buildFixture(root);
  const normalize = makeNormalizer(root);

  for (const scenario of scenarios) {
    await t.test(scenario.name, () => {
      // out ディレクトリは fixture と兄弟に置き、相対表示パスを安定させる
      const outDir = path.join(root, "out", scenario.name);
      fs.mkdirSync(outDir, { recursive: true });
      if (scenario.seed) {
        const eol = scenario.seedEol ?? "\n";
        fs.writeFileSync(path.join(outDir, MAIN), SEED_MAIN.replace(/\n/g, eol));
        fs.writeFileSync(path.join(outDir, REVIEW), SEED_REVIEW.replace(/\n/g, eol));
      }

      const res = spawnSync(
        process.execPath,
        [CLI, "--node-modules", nm, ...scenario.args],
        { cwd: outDir, encoding: "utf8" }
      );

      const snapDir = scenario.snapshots ?? scenario.name;
      assert.equal(res.status, scenario.exit, `exit code (stderr: ${res.stderr})`);
      assertSnapshot(normalize(res.stdout), `${snapDir}/stdout.txt`);
      assertSnapshot(normalize(res.stderr), `${snapDir}/stderr.txt`);

      for (const [outFile, snapName] of Object.entries(scenario.files)) {
        const content = fs.readFileSync(path.join(outDir, outFile), "utf8");
        // 生成ファイルの改行コードが実行 OS の os.EOL に従うことを(正規化前に)確認する。
        // ライセンス本文は元ファイルの改行をそのまま含むため、先頭の改行だけを見る
        const firstBreak = content.indexOf("\n");
        assert.equal(
          content[firstBreak - 1] === "\r",
          os.EOL === "\r\n",
          `${outFile} should use os.EOL line endings`
        );
        assertSnapshot(normalize(content), `${snapDir}/${snapName}`);
      }
      for (const outFile of scenario.absent ?? []) {
        assert.ok(!fs.existsSync(path.join(outDir, outFile)), `${outFile} should not exist`);
      }
      // 予期しないファイルが生成されていないことも保証する
      assert.deepEqual(
        fs.readdirSync(outDir).sort(),
        Object.keys(scenario.files).sort(),
        "unexpected files in output directory"
      );
    });
  }
});
