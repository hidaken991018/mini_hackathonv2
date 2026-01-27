import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Vercel環境でのみベーシック認証を有効化
  const isVercel = process.env.VERCEL === '1'

  if (!isVercel) {
    return NextResponse.next()
  }

  const basicAuth = request.headers.get('authorization')
  const url = request.nextUrl

  const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER
  const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD

  // 環境変数が設定されていない場合は認証をスキップ
  if (!BASIC_AUTH_USER || !BASIC_AUTH_PASSWORD) {
    return NextResponse.next()
  }

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, password] = atob(authValue).split(':')

    if (user === BASIC_AUTH_USER && password === BASIC_AUTH_PASSWORD) {
      return NextResponse.next()
    }
  }

  url.pathname = '/api/auth'

  return NextResponse.rewrite(url)
}

// 全てのパスに適用
export const config = {
  matcher: '/((?!api/auth).*)',
}
