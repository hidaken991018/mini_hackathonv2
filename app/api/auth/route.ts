import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return new NextResponse('認証が必要です', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  })
}
