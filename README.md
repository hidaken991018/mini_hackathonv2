# syufy

## API手動テスト

### 1. 前提
- アプリが起動していること（例: `http://localhost:3002`）
- Firebaseでログインできること
- `.env.local` にFirebaseとGeminiの設定が入っていること
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`（改行は `\n` にする）
  - `GEMINI_API_KEY`
  - `NOTIFY_SECRET`（任意）

  ※`FIREBASE_CLIENT_EMAIL` と `FIREBASE_PRIVATE_KEY` は各自で取得をお願いします（1.1参照）

### 1.1 Firebaseサービスアカウントの取得方法
1) Firebase Console → 対象プロジェクト → **歯車** → **プロジェクト設定**  
2) **サービスアカウント** タブを開く  
3) **新しい秘密鍵を生成** をクリックしてJSONをダウンロード  
4) JSON内の以下を `.env.local` に設定  
   - `client_email` → `FIREBASE_CLIENT_EMAIL`  
   - `private_key` → `FIREBASE_PRIVATE_KEY`（改行は `\n` にする）


### 2. IDトークンの取り方
1) ブラウザでログインして **Notifications画面**（`/notifications`）を開く  
2) DevTools を開く → **Network**  
3) **`/api/notifications`** をクリック  
4) **Headers → Request Headers → Authorization** の値をコピー  
   - `Bearer xxx...` の `xxx...` がIDトークン  

もしNetworkに出ない場合は、ページをリロードしてからもう一度確認してください。

### 3. スクリプトで一括テスト
PowerShellで以下を実行します。

```powershell
.\scripts\api-test.ps1 -Token <ID_TOKEN>
```

必要ならBaseUrlも指定できます（アプリのポートに合わせる）。

```powershell
.\scripts\api-test.ps1 -BaseUrl http://localhost:3002 -Token <ID_TOKEN>
```

### 4. このスクリプトがやること
1. 在庫を登録（期限付き）
2. レシピ通知を生成
3. 通知一覧を取得して確認

### 5. よくあるエラーと対処
- **認証に失敗しました**  
  → トークン期限切れ or コピーミス。Networkで取り直してください。
- **接続できません**  
  → `http://localhost:3000` ではなく、実際に動いているポート（例: 3002）を指定してください。
- **レシピ生成中にエラー**  
  → `GEMINI_API_KEY` が未設定か、サーバー再起動が必要です。

補足: IDトークンは期限が短い（約1時間）ので、必要に応じて取り直してください。
