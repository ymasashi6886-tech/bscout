# Bスカウト — 採用AIエージェント

> トップリクルーターの経験と判断を、誰でも再現できる採用AIエージェント

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://app.netlify.com)

---

## 概要

「なぜこの候補者にこの訴求をするのか」という採用判断プロセスをAI化したWebアプリです。
候補者情報と求人情報を入力するだけで、トップリクルーターの思考プロセスを再現し、個人化されたスカウト文を生成します。

### 主な機能

| 機能 | 説明 |
|------|------|
| **候補者タイプ 5分類** | 技術スペシャリスト型 / PM・マネジメント型 / キャリアアップ型 / 市場価値向上型 / 安定志向型 |
| **訴求優先順位** | AIが「なぜこの訴求が1位なのか」を候補者起点で説明 |
| **採用担当者ガイダンス** | AI判断 → 判断理由 → アプローチ の3段階フォーマット |
| **情報品質チェック** | 入力情報の不足を自動検出し、AI補完質問を提示 |
| **バッチ処理** | 複数候補者を同じ求人で一括分析・スカウト生成 |
| **learningData構造** | 将来の学習機能に対応した構造化データを保持 |

---

## フォルダ構成

```
bscout/
├── index.html                  ← アプリ本体（エントリーポイント）
├── css/
│   └── style.css               ← 全スタイル
├── js/
│   ├── storage.js              ← 状態管理・learningData構造
│   ├── ai.js                   ← OpenAI API通信・プロンプト
│   └── app.js                  ← UI制御・イベント・レンダリング
├── assets/                     ← 画像・アイコン（将来用）
├── netlify/
│   └── functions/
│       └── proxy.js            ← OpenAI APIプロキシ（Netlify Functions）
├── netlify.toml                ← Netlify設定
└── README.md
```

---

## ローカルで動かす（APIキーあり）

### 1. リポジトリをクローン

```bash
git clone https://github.com/your-org/bscout.git
cd bscout
```

### 2. `bscout/index.html` をブラウザで開く

```bash
# macOS
open bscout/index.html

# Windows
start bscout/index.html
```

初回AI分析時にOpenAI APIキーの入力ダイアログが表示されます。
入力するとブラウザのlocalStorageに保存され、次回から不要です。

> APIキーなしでも「デモモード」で全機能を試せます。

---

## Netlifyへのデプロイ手順

### STEP 1: GitHubへアップロード

```bash
# 初回のみ（リポジトリ初期化）
cd bscout          # ← bscoutフォルダが「リポジトリルート」になる
git init
git add .
git commit -m "feat: initial commit — Bスカウト v0.5"

# GitHubに新規リポジトリを作成してからpush
git remote add origin https://github.com/your-org/bscout.git
git branch -M main
git push -u origin main
```

### STEP 2: NetlifyとGitHubを接続

1. [app.netlify.com](https://app.netlify.com) にログイン
2. **「Add new site」→「Import an existing project」** をクリック
3. **「GitHub」** を選択し、上記リポジトリを選択
4. ビルド設定を以下に確認:

| 項目 | 値 |
|------|-----|
| Base directory | `bscout` |
| Build command | （空欄） |
| Publish directory | `bscout` |

5. **「Deploy site」** をクリック

### STEP 3: OpenAI APIキーを環境変数に設定

1. Netlifyダッシュボード → **「Site configuration」→「Environment variables」**
2. **「Add a variable」** をクリック
3. 以下を入力して保存:

| Key | Value |
|-----|-------|
| `OPENAI_API_KEY` | `sk-xxxxxxxxxxxxxxxx` |

4. **「Deploys」→「Trigger deploy」** で再デプロイ

---

## 今後の変更を反映する方法（GitHub → Netlify 自動デプロイ）

```bash
# ファイルを変更後
git add .
git commit -m "feat: 新機能の説明"
git push origin main
```

GitHubにpushすると、**Netlifyが自動的に検知して再デプロイ**します。
通常1〜2分でURLに反映されます。

---

## 動作モード

| 環境 | ヘッダー表示 | 動作 |
|------|------------|------|
| Netlify + APIキー設定済み | 🟢 AI接続済み | GPT-4o でフル分析 |
| Netlify + APIキー未設定  | 🟡 デモモード | ルールベースのデモ動作 |
| ローカル（初回）         | 🟡 ローカル   | APIキー入力ダイアログ表示 |
| ローカル（2回目以降）    | 🟡 ローカル   | localStorageのキーを使用 |

---

## 将来の拡張計画

### 認証（ユーザー管理）

```
js/auth.js を追加
└── login() / logout() / getCurrentUser()
```

### スカウト履歴・返信結果管理

`storage.js` の `scoutAction.result` に結果を書き込む:

```javascript
S.learningData.scoutAction.result = {
  replied: true,
  meetingScheduled: true,
  hired: false,
  feedbackNote: '返信あり、年収条件で辞退'
};
// → saveScoutHistory() でlocalStorage / DBに保存
```

### IBM watsonx.ai への移行

`js/ai.js` の2箇所を変更するだけ:

```javascript
// 変更前
const API_URL = IS_NETLIFY ? '/api/proxy' : 'https://api.openai.com/v1/chat/completions';

// 変更後
const API_URL = '/api/watsonx';  // netlify/functions/watsonx.js を追加

// netlify/functions/watsonx.js でエンドポイントを変更
const endpoint = 'https://jp-tok.ml.cloud.ibm.com/ml/v1/text/generation';
```

### DB接続（履歴保存・分析）

```
netlify/functions/
├── proxy.js        ← OpenAI APIプロキシ（既存）
├── save-history.js ← スカウト履歴をDBに保存（追加）
└── get-stats.js    ← 訴求パターン効果分析（追加）
```

---

## 開発履歴

| バージョン | 内容 |
|-----------|------|
| v0.1 | HTML/CSS/JSのUIプロトタイプ |
| v0.2 | OpenAI API連携・5ステップフロー実装 |
| v0.3 | AIリクルーター判断レポート・訴求ポイント選択 |
| v0.4 | Netlifyデプロイ対応・サーバーサイドAPIキー管理 |
| v0.5 | Phase1: 候補者タイプ5分類・訴求優先順位・ガイダンス・learningData |
| v0.6 | Phase2: AI補完質問（STEP1.5）・バッチ処理 |
| v0.7 | **GitHub管理構成への移行（CSS/JS分離）** |

---

Made with IBM Bob
