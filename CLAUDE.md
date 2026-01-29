# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

レシート、冷蔵庫の写真、メモを記録し、AIチャットと通知機能を備えたNext.jsアプリケーション。食材在庫の管理とAIによるレシピ提案を支援する。

**主要機能:**
- 入力/収集: レシート、冷蔵庫の写真、テキストメモを保存
- AIチャット: 在庫食材に基づいた献立相談
- 通知: レシピ提案や在庫アラートの受信

## コマンド

```bash
npm run dev      # 開発サーバー起動 (localhost:3000)
npm run build    # 本番ビルド
npm run start    # 本番サーバー起動
npm run lint     # ESLint実行
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
- **データベース:** Prisma + SQLite (実装済み)
- **AI統合:** Google Generative AI (Gemini 2.0 Flash)
- **HTTP クライアント:** Axios

### ディレクトリ構成
- `app/` - Next.js App Routerのページとレイアウト
  - `app/api/` - APIルート（レシート解析、在庫管理、通知、レシピ生成）
  - `app/input/`, `app/chat/`, `app/notifications/` - 3つのメインページ
- `components/` - 再利用可能なReactコンポーネント（12コンポーネント）
- `lib/` - Prismaシングルトンなどのユーティリティ
- `prisma/` - データベーススキーマとシード
- `types/` - TypeScript型定義

### 重要ファイル
- `app/page.tsx` - ルートページ（`/input`へリダイレクト）
- `app/input/page.tsx`, `app/chat/page.tsx`, `app/notifications/page.tsx` - 各ページが独立した状態管理
- `types/index.ts` - 中央型定義 (InventoryItem, Message, Notification, Recipe, RecipeStep)
- `lib/prisma.ts` - Prismaクライアントシングルトン
- `prisma/schema.prisma` - データベーススキーマ定義（6モデル）

### パターン
- 全コンポーネントで`'use client'`ディレクティブ使用（クライアントサイドレンダリング）
- **各ページが独立した状態管理** - ページ間で状態共有なし、必要に応じてlocalStorageを使用
- パスエイリアス: `@/*` はルートディレクトリにマップ
- 画像はURL保存（外部ストレージ想定）
- **認証**: Basic認証のスキャフォールドあり（middleware.ts）だが開発環境では無効、モックユーザーID `mock-user-001` を使用
- **モーダルベースUI**: CreateNoteModal, NoteDetailModal, RecipeSlideModal
- **楽観的UI更新**: 通知の既読状態などで使用

### 3タブUI構成
1. **入力タブ:** ノートのCRUD（画像・タイムスタンプ付き）
2. **チャットタブ:** ユーザー/アシスタントのメッセージ履歴
3. **通知タブ:** グリッド表示とレシピモーダル

## 環境変数

`.env.local`に以下を設定:

```bash
GEMINI_API_KEY=your_google_ai_api_key_here  # 必須: レシート解析とレシピ生成に使用
DATABASE_URL="file:./prisma/dev.db"          # SQLite接続文字列
```

**認証関連（オプション、Vercelデプロイ時のみ）:**
```bash
BASIC_AUTH_USER=username
BASIC_AUTH_PASSWORD=password
```

## APIルート

### レシート解析
- `POST /api/analyze-receipt` - レシート画像から食材抽出（Gemini 2.0 Flash使用）
  - Input: `{ imageData: string }` (base64)
  - Output: `{ items: InventoryItem[] }`

### 在庫管理
- `POST /api/inventories/bulk` - 在庫一括登録（Prismaトランザクション使用）
  - Input: `{ userId: string, items: InventoryItemInput[] }`
  - Output: `{ createdCount: number, inventories: Inventory[] }`

### 通知
- `GET /api/notifications?userId={id}` - ユーザーの通知取得（レシピ詳細含む）
- `PATCH /api/notifications/{id}/read` - 特定の通知を既読化
- `PATCH /api/notifications/read-all` - 全通知を既読化

### レシピ
- `POST /api/recipe/notify` - 在庫からレシピ生成（Gemini + ファジーマッチング）
  - Input: `{ userId: string }`
  - Output: `{ recipeId: string, title, ingredients, steps, ... }`
- `POST /api/recipes/{recipeId}/cook` - レシピを調理済みに（使用した在庫を削除）

### 認証
- `GET /api/auth` - Basic認証エンドポイント（開発環境では無効）

## データベーススキーマ（実装済み）

**使用技術:** Prisma + SQLite (`prisma/dev.db`)

詳細は`prisma/schema.prisma`と`DB_要件定義.md`を参照。主要エンティティ:
- `users` - ユーザー識別
- `inventories` - 食材（数量、賞味期限）
- `notifications` - 通知（レシピ/在庫への参照）
- `recipes`, `recipe_ingredients`, `recipe_steps` - レシピデータ

## 主要なアーキテクチャパターン

### Gemini AI統合
- **モデル**: Gemini 2.0 Flash (`gemini-2.0-flash-exp`)
- **構造化出力**: `responseMimeType: 'application/json'` と `responseSchema` を使用して型安全なレスポンス
- **レシート解析**: 画像から食材名、数量、単位、賞味期限を抽出
- **レシピ生成**: 在庫リストからレシピを生成、ファジーマッチングで食材を紐付け

### データフェッチング
- **フロントエンド**: `fetch()` と `axios` の混在使用
- **バックエンド**: Next.js APIルート + Prisma ORM
- **キャッシング**: なし（各ページ訪問時に再取得）

### ファジーマッチング
- 正規化（小文字化、トリミング）後に部分文字列マッチング
- レシピ材料と在庫の紐付けに使用（`isMatch()` 関数）

### Prisma使用上の注意
- **SQLite使用**: `createMany`非対応のため、`$transaction`で複数レコード作成
- **接続**: `lib/prisma.ts`でシングルトンパターン使用
