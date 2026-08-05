# Bスカウト — GitHub Push & Netlify デプロイ手順

## 前提
- Git がインストール済み（https://git-scm.com/download/win）
- GitHub アカウントあり
- Netlify アカウントあり（無料プランOK）

---

## Step 1: GitHubにリポジトリを作成

1. https://github.com/new を開く
2. Repository name: `bscout`
3. Public or Private: どちらでも可
4. 「Create repository」をクリック

---

## Step 2: ローカルからPush

PowerShell でこのフォルダ（`bscout/`）を開いて実行：

```powershell
cd "C:\Users\masashiyamaguchi\.bob\playground\bscout"

git init
git add .
git commit -m "Bスカウト v0.8 - Phase1実装完了"

# ★ 下のURLはあなたのGitHubユーザー名に合わせて変更
git remote add origin https://github.com/YOUR_USERNAME/bscout.git
git branch -M main
git push -u origin main
```

---

## Step 3: Netlify でデプロイ

1. https://app.netlify.com にログイン
2. 「Add new site」→「Import an existing project」
3. GitHub を選択し、`bscout` リポジトリを選択
4. Build settings:
   - **Base directory**: （空欄）
   - **Publish directory**: `.`
   - **Build command**: （空欄）
5. 「Deploy site」をクリック

---

## Step 4: OpenAI APIキーを設定

1. Netlify のサイト設定 → Site settings → Environment variables
2. 「Add a variable」
   - Key: `OPENAI_API_KEY`
   - Value: `sk-...` （OpenAI APIキー）
3. 「Save」→「Trigger deploy」で再デプロイ

---

## 完了後の確認

- 公開URL例: `https://bscout-xxxx.netlify.app`
- ヘッダーの接続インジケーターが「AI接続済み」になればOK
- ChatGPTにこのURLを共有してレビュー可能

---

## スタンドアロン版（APIキーなし・デモ動作）

`bscout_standalone.html` をブラウザで開くか、ChatGPTに添付するだけでOK。
APIキーなしでもデモ動作（固定データ）で全機能の確認が可能。
