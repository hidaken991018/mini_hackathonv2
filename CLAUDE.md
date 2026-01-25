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

## アーキテクチャ

### 技術スタック
- **フレームワーク:** Next.js 14.2.5 (App Router)
- **言語:** TypeScript (strictモード)
- **スタイリング:** Tailwind CSS
- **データベース:** Prisma予定 (feature/prisma-setupブランチ)

### ディレクトリ構成
- `app/` - Next.js App Routerのページとレイアウト
- `components/` - 再利用可能なReactコンポーネント
- `types/` - TypeScript型定義

### 重要ファイル
- `app/page.tsx` - メインエントリポイント、全状態管理とコアロジック
- `types/index.ts` - 中央型定義 (Note, Message, Notification, RecipeStep)

### パターン
- 全コンポーネントで`'use client'`ディレクティブ使用（クライアントサイドレンダリング）
- 状態は`app/page.tsx`で管理し、propsで子コンポーネントへ渡す
- パスエイリアス: `@/*` はルートディレクトリにマップ
- 画像はURL保存（外部ストレージ想定）

### 3タブUI構成
1. **入力タブ:** ノートのCRUD（画像・タイムスタンプ付き）
2. **チャットタブ:** ユーザー/アシスタントのメッセージ履歴
3. **通知タブ:** グリッド表示とレシピモーダル

## データベーススキーマ（予定）

詳細は`DB_要件定義.md`を参照。主要エンティティ:
- `users` - ユーザー識別
- `inventories` - 食材（数量、賞味期限）
- `notifications` - 通知（レシピ/在庫への参照）
- `recipes`, `recipe_ingredients`, `recipe_steps` - レシピデータ
