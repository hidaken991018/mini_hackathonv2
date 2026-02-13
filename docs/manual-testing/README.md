# 手動テスト手順書

このディレクトリには、各機能の手動テスト手順書を格納します。

## ディレクトリ構成

```
docs/manual-testing/
├── README.md           # このファイル（ガイド）
├── TEMPLATE.md         # テスト手順書テンプレート
├── core-features.md    # コア機能の常設テスト手順
└── <機能名>.md         # 個別機能のテスト手順（verify-allスキルが自動生成）
```

## 運用ルール

### 手順書の作成タイミング
- 新機能の実装完了時に `verify-all` スキルが自動生成
- セキュリティ修正など影響範囲が広い変更時
- リリース前の最終検証時

### 手順書のメンテナンス
- 機能変更時は対応する手順書も更新する
- 不要になった手順書は削除する
- `core-features.md` はリリース前に毎回実施する

### テスト結果の記録
- 各手順書の末尾にある「テスト結果記録」テーブルに記入する
- スクリーンショットが必要な場合は `docs/manual-testing/evidence/` に保存する

## コア機能テスト一覧

| 機能 | 手順書 | 優先度 |
|------|--------|--------|
| レシート解析 | [core-features.md#レシート解析](core-features.md#レシート解析) | 高 |
| 在庫管理 | [core-features.md#在庫管理](core-features.md#在庫管理) | 高 |
| AIチャット | [core-features.md#AIチャット](core-features.md#aiチャット) | 中 |
| 通知 | [core-features.md#通知](core-features.md#通知) | 中 |
| 認証 | [core-features.md#認証](core-features.md#認証) | 高 |
