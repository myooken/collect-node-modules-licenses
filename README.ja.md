# Third-Party License Output for node_modules

[![CI](https://github.com/myooken/collect-node-modules-licenses/actions/workflows/ci.yml/badge.svg)](https://github.com/myooken/collect-node-modules-licenses/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/node-module-license-output)](https://www.npmjs.com/package/node-module-license-output)

[English](README.md) | 日本語

このプロジェクトは場所によって 3 つの名前を持ちます:

| 種別               | 名前                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------- |
| npm パッケージ     | [`node-module-license-output`](https://www.npmjs.com/package/node-module-license-output) |
| CLI コマンド       | `third-party-license`                                                                     |
| GitHub リポジトリ  | `collect-node-modules-licenses`                                                           |

### これは何?

`node_modules` を走査して**サードパーティライセンスを Markdown で出力**するツールです。  
`THIRD-PARTY-LICENSE.md`(本体)と `THIRD-PARTY-LICENSE-REVIEW.md`(レビュー用チェックリスト)の 2 ファイルを生成します。

### 出力サンプル

`ms` に依存するプロジェクトで `npx --package=node-module-license-output -- third-party-license` を実行すると:

```
Generated: THIRD-PARTY-LICENSE.md
Review:    THIRD-PARTY-LICENSE-REVIEW.md
Packages:  1
Missing LICENSE/NOTICE/COPYRIGHT/THIRD-PARTY-NOTICES/THIRD-PARTY-LICENSES/ThirdPartyNoticeText/ThirdPartyText/COPYING: 0
```

**THIRD-PARTY-LICENSE.md** — パッケージごとに 1 セクション、ライセンス全文を埋め込みます:

````markdown
# Third-Party Licenses

Generated from: node_modules

<a id="pkg-ms-2-1-3"></a>
## ms@2.1.3
- Source: vercel/ms
- License: MIT
- Usage: Present in node_modules
- license.md

### license.md
```text
The MIT License (MIT)

Copyright (c) 2020 Vercel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
...(ライセンス全文が続きます)...
```
````

**THIRD-PARTY-LICENSE-REVIEW.md** — パッケージごとの状態と、不足項目のサマリーを持つチェックリスト:

```markdown
# THIRD-PARTY-LICENSE-REVIEW

Generated from: node_modules
Main file: THIRD-PARTY-LICENSE.md

## ms@2.1.3
- Main: THIRD-PARTY-LICENSE.md#pkg-ms-2-1-3
- Source: vercel/ms
- License: MIT
- Files:
  - license.md
- Status: Present in node_modules
- Notes:

---

## Missing summary

### Missing Source

- (none)

### Missing package.json license field

- (none)

### Missing LICENSE/NOTICE/COPYRIGHT/THIRD-PARTY-NOTICES/THIRD-PARTY-LICENSES/ThirdPartyNoticeText/ThirdPartyText/COPYING files

- (none)
```

レビューファイルの `Notes:` 欄は自由記入欄です。書いた内容は `--update` 実行後も保持されます。

### 特徴

- **ESM / Node.js 18+**、依存パッケージゼロ
- LICENSE/NOTICE/COPYRIGHT/THIRD-PARTY-NOTICES/THIRD-PARTY-LICENSES/ThirdPartyNoticeText/ThirdPartyText/COPYING ファイルから**ライセンス全文を出力**
- **レビューファイル**が Source / license フィールド / ライセンスファイルの不足を検出
- `--fail-on-missing` で CI での強制が可能
- Programmatic API 向けの TypeScript 型定義を同梱
- `--dependencies-only` 使用時は、対象 `node_modules` の隣に `package.json` が必要
- npm / pnpm での利用(node_modules レイアウト)を想定

### 動作環境

- **OS**: Linux・macOS・Windows(3 OS すべてで CI のテストスイートを実行)
- **Node.js**: 18 / 20 / 22 / 24(CI でテスト済み)
- **パッケージマネージャ**: 通常の npm レイアウト、および pnpm 既定のツリー内 `.pnpm` レイアウト。pnpm のリンク/ジャンクションは realpath で対応付け
- **改行コード**: 生成される Markdown の枠組みはプラットフォーム標準の改行、埋め込まれるライセンス本文は元ファイルの改行を保持(混在の可能性あり)。`--update` は LF / CRLF どちらの入力も受け付けます

### 使い方

#### インストールせずに実行(推奨)

```bash
npx --package=node-module-license-output -- third-party-license
```

#### npm exec で実行

```bash
npm exec --package=node-module-license-output -- third-party-license
```

#### グローバルインストール

```bash
npm i -g node-module-license-output
third-party-license
```

### オプション

| オプション             | 説明                                                                                                                                            | デフォルト                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `--node-modules <dir>` | `node_modules` へのパス                                                                                                                         | `node_modules`                  |
| `--review [file]`      | レビューファイルのみ出力。ファイル名は省略可                                                                                                     | `THIRD-PARTY-LICENSE-REVIEW.md` |
| `--license [file]`     | 本体ファイルのみ出力。ファイル名は省略可                                                                                                         | `THIRD-PARTY-LICENSE.md`        |
| `--recreate`           | 現在の `node_modules` のみからファイルを再生成(削除済みパッケージは落とす)                                                                     | `true`(デフォルト)            |
| `--update`             | 既存の出力とマージし、削除済みパッケージを保持して存在状況を注記                                                                                 | `false`                         |
| `--fail-on-missing`    | LICENSE/NOTICE/COPYRIGHT/THIRD-PARTY-NOTICES/THIRD-PARTY-LICENSES/ThirdPartyNoticeText/ThirdPartyText/COPYING が欠けていれば終了コード 1 で終了 | `false`                         |
| `--dependencies-only`  | プロジェクト `package.json` の `dependencies`(+`optionalDependencies`)を起点とする依存ツリーに出力を限定                                       | `true`(デフォルト)            |
| `--dependencies-all`   | `node_modules` 配下の全パッケージを走査                                                                                                         | `false`                         |
| `-h`, `--help`         | ヘルプを表示                                                                                                                                     | -                               |

> `--review` も `--license` も指定しない場合は**両方のファイルを生成**します。
> どちらのファイルもパッケージは name@version でソートされます。`--update` は `node_modules` から消えたパッケージのエントリを保持し、存在状況を注記します。
> `--dependencies-only` は対象 `node_modules` の隣にある `package.json` を読み、`dependencies` と `optionalDependencies` を起点とする依存ツリーに出力を限定します(`devDependencies` / `peerDependencies` は含みません)。その `package.json` が見つからない場合はエラーになります。
> 運用上は、デフォルト(`--dependencies-only`)が日常用、`--dependencies-all` が SBOM 的な網羅レポート用という位置付けです。
> 重複がパスで曖昧性解決された場合、`--update` はパスが変わったエントリを新規として扱うことがあります。

### 例

```bash
# デフォルト(両ファイル)
third-party-license

# 削除済みパッケージを落とさずに既存ファイルを更新
third-party-license --update

# node_modules のパスを指定
third-party-license --node-modules ./path/to/node_modules

# レビューファイルのみ出力(ファイル名は省略可)
third-party-license --review
third-party-license --review ./out/THIRD-PARTY-LICENSE-REVIEW.md

# 本体ファイルのみ出力(ファイル名は省略可)
third-party-license --license
third-party-license --license ./out/THIRD-PARTY-LICENSE.md

# 不足があれば終了コード 1(--fail-on-missing)
third-party-license --fail-on-missing

# 日常用(dependencies のみ)
third-party-license --dependencies-only

# 監査 / SBOM 的な用途(node_modules 配下の全パッケージ)
third-party-license --dependencies-all
third-party-license --dependencies-all --license ./out/THIRD-PARTY-LICENSE.md --review ./out/THIRD-PARTY-LICENSE-REVIEW.md
```

### Programmatic API

```js
import { collectThirdPartyLicenses } from "node-module-license-output";

const result = await collectThirdPartyLicenses({
  nodeModules: "./node_modules",
  outFile: "./THIRD-PARTY-LICENSE.md",
  reviewFile: "./THIRD-PARTY-LICENSE-REVIEW.md",
  failOnMissing: false,
  dependenciesOnly: true,
  // mode: "update", // ファイル更新時に node_modules から消えたパッケージを保持
});

console.log(result.mainContent);
console.log(result.reviewContent);
```

出力はパッケージキーでソートされます。`mode: "update"` を指定すると既存ファイルとマージし、`node_modules` にもう存在しないパッケージも保持して、その存在状況を両方の出力に表示します。

### 出力の概要

- **THIRD-PARTY-LICENSE.md**
  - パッケージ一覧(デフォルト: `dependencies`/`optionalDependencies` から到達可能なもののみ)
  - Source / License 情報
  - LICENSE/NOTICE/COPYRIGHT/THIRD-PARTY-NOTICES/THIRD-PARTY-LICENSES/ThirdPartyNoticeText/ThirdPartyText/COPYING の全文
  - Usage 行で、現在の `node_modules` に存在するか(あるいは `--update` で前回出力から保持されたか)を表示
- **THIRD-PARTY-LICENSE-REVIEW.md**
  - レビュー向けチェックリスト
  - パッケージごとの存在状況(present / not found)
  - **Missing summary** セクション

### 一般的な npm ライセンスツールとの違い

> 例: `license-checker`、`license-report`、`license-finder`

- **ライセンス全文を 1 つの Markdown に束ねることに特化**
  - 既存ツールの多くは JSON/CSV レポート重視ですが、本ツールは**そのまま配布できるライセンス文書**を重視します。
- 不足メタデータを追跡する**独立したレビューファイル**
  - 監査ワークフローに組み込みやすい構成です。
- **ESM / Node.js 18+・依存ゼロ**
  - ランタイム要件がシンプルです。

### 補足

- デフォルトの出力は `dependencies` と `optionalDependencies` の依存ツリーに限定されます。
- `node_modules` 配下の全パッケージ(ネストした依存を含む)を走査するには `--dependencies-all` を使ってください。
- ライセンスファイルは各パッケージのルートディレクトリのみを検索します。
- 同じ name@version が複数ある場合、依存限定の出力ではパスで曖昧性を解決します。
- pnpm のインストールは `node_modules` 配下の `.pnpm` ディレクトリ経由で解決されることがあります。本ツールは `node_modules/<pkg>` の直接配置だけでなく、解決後のパッケージパスを辿ります。
- LICENSE、NOTICE、COPYRIGHT、THIRD-PARTY-NOTICES、THIRD-PARTY-LICENSES、ThirdPartyNoticeText/ThirdPartyText、COPYING を認識します(例: TypeScript の `ThirdPartyNoticeText.txt`)。
- 終了コード 0: 成功。
- 終了コード 1: `--fail-on-missing` 指定時のライセンスファイル不足、または `node_modules` が見つからない場合。
- `node_modules` が存在しない場合はエラーになります。
- `license` / `repository` フィールドの欠落はレビューファイルに記録されます。
- 生成ファイルとサマリーログのパスはカレントディレクトリからの相対で表示されます。ライセンスファイル不足の警告は、パッケージの絶対(実体)パスを表示します。
