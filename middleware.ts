import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Firebase Auth はクライアント側で管理するため、
  // middlewareでは何もしない（ページは常にアクセス可能）
  // 各ページで useAuth() フックを使ってログイン状態を確認してリダイレクト
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Basic認証を削除したため、マッチャーは不要
    // フロントエンドで Firebase Auth の状態を確認してリダイレクト
  ],
};
