param(
  [string]$BaseUrl = "http://localhost:3002",
  [string]$Token
)

if (-not $Token) {
  Write-Host "IDトークンが必要です。例: .\\scripts\\api-test.ps1 -Token <ID_TOKEN>" -ForegroundColor Red
  exit 1
}

$headers = @{
  Authorization = "Bearer $Token"
  "Content-Type" = "application/json"
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Url,
    [string]$Body
  )

  try {
    if ($Body) {
      return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body $Body
    }
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
  } catch {
    Write-Host "APIエラー: $Method $Url" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        if ($errorBody) {
          Write-Host $errorBody -ForegroundColor Red
        }
      } catch {
        # ignore response read errors
      }
    }
    exit 1
  }
}

Write-Host "1) 在庫登録 (期限付きのサンプル)" -ForegroundColor Cyan
$inventoryBody = @{
  items = @(
    @{ name = "卵"; quantityValue = 6; quantityUnit = "個"; expireDate = "2026-02-02" },
    @{ name = "牛乳"; quantityValue = 1000; quantityUnit = "ml"; consumeBy = "2026-02-01" }
  )
} | ConvertTo-Json -Depth 5

$inventoryResult = Invoke-Api -Method Post -Url "$BaseUrl/api/inventories/bulk" -Body $inventoryBody
Write-Host "在庫登録: success=$($inventoryResult.success) createdCount=$($inventoryResult.data.createdCount)"

Write-Host "2) 通知作成 (レシピ通知)" -ForegroundColor Cyan
$notifyResult = Invoke-Api -Method Post -Url "$BaseUrl/api/recipe/notify" -Body "{}"
Write-Host "通知作成: success=$($notifyResult.success) notificationId=$($notifyResult.data.notificationId)"

Write-Host "3) 通知一覧取得" -ForegroundColor Cyan
$notifications = Invoke-Api -Method Get -Url "$BaseUrl/api/notifications"
if ($notifications.success -and $notifications.data) {
  Write-Host "通知件数: $($notifications.data.Count)"
} else {
  Write-Host "通知一覧取得に失敗しました"
  exit 1
}

Write-Host "完了" -ForegroundColor Green
