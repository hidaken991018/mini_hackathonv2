# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

レシート画像をAIで解析し、食材在庫を管理、在庫に基づいたレシピ提案を行うNext.jsアプリケーション。

**主要機能:**
- 入力: レシート画像をGemini AIで解析→食材を在庫に一括登録
- 在庫管理: 食材の数量・賞味期限の管理、消費操作
- AIチャット: 在庫食材に基づいた献立相談
- 通知: AIレシピ提案、賞味期限アラートの受信

## コマンド

```bash
npm run dev          # 開発サーバー起動 (localhost:3000)
npm run build        # 本番ビルド
npm run start        # 本番サーバー起動
npm run lint         # ESLint実行
npm run test         # Jest テスト実行
npm run test:watch   # テストをウォッチモードで実行
```

## データベースコマンド

```bash
npm run db:studio    # Prisma Studio (DB管理UI)を起動
npm run db:generate  # Prismaクライアント生成
npm run db:migrate   # マイグレーション作成・適用
npm run db:push      # スキーマを直接DBにプッシュ
npm run db:reset     # データベースをリセット（破壊的）
npm run db:seed      # シードデータ投入
```

## アーキテクチャ

### 技術スタック
- **フレームワーク:** Next.js 14.2.5 (App Router)
- **言語:** TypeScript (strictモード)
- **スタイリング:** Tailwind CSS
- **データベース:** Prisma + PostgreSQL (Docker Compose)
- **認証:** Firebase Auth (クライアント) + Firebase Admin SDK (サーバー)
- **AI統合:** Google Generative AI (Gemini 2.0 Flash: テキスト/構造化出力, Gemini 3 Pro Image Preview: 画像生成)
- **テスト:** Jest + Testing Library (`__tests__/`)

### ディレクトリ構成
- `app/` - Next.js App Routerのページとレイアウト
  - `app/api/` - APIルート（レシート解析、在庫CRUD、通知、レシピ生成、認証）
  - `app/input/`, `app/inventory/`, `app/chat/`, `app/notifications/` - 4つのメインページ
  - `app/auth/signin/` - Firebase サインインページ
- `components/` - 再利用可能なReactコンポーネント
- `contexts/` - React Context (`AuthContext.tsx`: Firebase認証状態)
- `lib/` - ユーティリティ（Prisma, Firebase, Axios, 画像保存, 認証ヘルパー）
- `prisma/` - データベーススキーマ、マイグレーション、シード
- `types/` - TypeScript型定義

### 重要ファイル
- `app/page.tsx` - ルートページ（`/input`へリダイレクト）
- `app/input/page.tsx` - レシート画像解析→在庫登録
- `app/inventory/page.tsx` - 在庫一覧・編集・消費
- `app/chat/page.tsx` - AIチャット
- `app/notifications/page.tsx` - 通知一覧・レシピモーダル
- `contexts/AuthContext.tsx` - Firebase認証コンテキスト（`useAuth()`フック）
- `lib/axios.ts` - Axiosインスタンス（Firebaseトークン自動注入）
- `lib/auth-helpers.ts` - `requireAuth()` APIルート用認証ヘルパー
- `lib/image-storage.ts` - 画像を`public/images/`に保存
- `lib/food-category.ts` - 常備品判定ロジック（`isStapleFood()`）
- `lib/expiry-defaults.ts` - 食材カテゴリ別デフォルト期限推定
- `lib/units/` - 単位正規化・換算・消費量ロジック
- `types/index.ts` - 中央型定義
- `prisma/schema.prisma` - データベーススキーマ定義（6モデル）
- `docs/inventory-logic.md` - 食材管理ロジック仕様書（ビジネスロジック全体の定義）

### パターン
- 全コンポーネントで`'use client'`ディレクティブ使用（クライアントサイドレンダリング）
- **各ページが独立した状態管理** - ページ間で状態共有なし
- **ページ間データ受け渡し**: `localStorage`キー `chatInitialMessage` でレシピ→チャットへコンテキスト転送
- パスエイリアス: `@/*` はルートディレクトリにマップ
- **モーダルベースUI**: RecipeSlideModal, InventoryEditModal, CreateNoteModal
- **楽観的UI更新**: 通知の既読、在庫の消費操作で使用

### 4タブUI構成 (BottomNav.tsx)
1. **入力タブ:** レシート画像アップロード→AI解析→在庫プレビュー→一括登録
2. **在庫タブ:** 在庫一覧、数量消費(-1)、編集・削除
3. **チャットタブ:** ユーザー/アシスタントのメッセージ履歴
4. **通知タブ:** グリッド表示、レシピスライドモーダル、調理確認

## 認証

- **Firebase Auth**: Google OAuth + メール/パスワード
- **フロントエンド**: `useAuth()`フック（`contexts/AuthContext.tsx`）でログイン状態管理
- **APIリクエスト**: `lib/axios.ts`のインターセプターがFirebase IDトークンを`Authorization: Bearer {token}`ヘッダーに自動注入
- **APIルート認証**: `lib/auth-helpers.ts`の`requireAuth(request)`でトークン検証→内部ユーザーID取得
- **ユーザー同期**: ログイン時に`POST /api/auth/sync-user`でFirebase UIDとDBユーザーを紐付け

## 環境変数

`.env.example`に全変数のテンプレートあり。`.env.local`に設定:

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mini_hackathon?schema=public"

# Firebase (クライアント側) - 6変数
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase (サーバー側)
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Gemini AI (必須: レシート解析・レシピ生成)
GEMINI_API_KEY=...

# 期限通知API認証（任意）
NOTIFY_SECRET=...
```

## APIルート

### レシート解析
- `POST /api/analyze-receipt` - レシート画像から食材抽出（Gemini構造化出力）

### 在庫管理 (Firebase認証必須)
- `GET /api/inventories?userId={id}` - ユーザーの在庫一覧取得
- `POST /api/inventories/bulk` - 在庫一括登録（`createManyAndReturn`使用）
- `GET/PUT/DELETE /api/inventories/[id]` - 個別在庫のCRUD
- `PATCH /api/inventories/[id]/consume` - 数量-1（0で自動削除）

### 通知 (Firebase認証必須)
- `GET /api/notifications?userId={id}` - 通知取得（レシピ詳細含む）
- `PATCH /api/notifications/[id]/read` - 既読化
- `PATCH /api/notifications/read-all` - 全既読化
- `POST /api/notifications/expiry` - 賞味期限通知生成（`x-notify-secret`ヘッダー認証、GitHub Actions cronから呼び出し）

### レシピ (Firebase認証必須)
- `POST /api/recipe/notify` - 在庫からレシピ生成（Gemini + ファジーマッチング + 画像生成）
- `POST /api/recipes/[recipeId]/cook` - 調理実行（使用した在庫の数量を減算、トランザクション）

### 認証
- `POST /api/auth/sync-user` - Firebaseトークン検証→ユーザーupsert

## データベーススキーマ

Prisma + PostgreSQL。詳細は`prisma/schema.prisma`と`DB_要件定義.md`を参照。

主要エンティティ: `users`, `inventories`, `notifications`, `recipes`, `recipe_ingredients`, `recipe_steps`

## 主要なアーキテクチャパターン

### Gemini AI統合
- **テキスト/構造化出力**: `gemini-2.0-flash` — `responseMimeType: 'application/json'` + `responseSchema`で型安全なレスポンス
- **画像生成**: `gemini-3-pro-image-preview` — レシピの料理写真・インフォグラフィック生成（`lib/image-storage.ts`で`public/images/`に保存）
- **ファジーマッチング**: 正規化（小文字化、トリミング）後に部分文字列マッチングでレシピ材料と在庫を紐付け

### Prisma使用上の注意
- **接続**: `lib/prisma.ts`でシングルトンパターン

### Docker Compose
- `docker compose up -d` でPostgreSQLコンテナを起動
- `docker compose down` で停止（データはボリュームに永続化）

### GitHub Actions
- `.github/workflows/expiry-notify.yml` - 賞味期限通知のスケジュール実行
