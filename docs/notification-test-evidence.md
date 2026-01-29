# 期限通知テスト 証跡

実行日時: 2026-01-30 00:06:26

## 実行コマンド
Invoke-RestMethod -Method Post -Uri "http://localhost:3002/api/notifications/expiry" -ContentType "application/json" -Body '{"userId":"mock-user-001"}'

## 実行結果

success data
------- ----
   True @{createdCount=2}

## スクリーンショット
- docs/notification-screen.png


