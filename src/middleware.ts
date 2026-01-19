import { type NextRequest, NextResponse } from 'next/server'

/**
 * Next.js 미들웨어
 *
 * 현재 Firebase Auth를 사용하므로 서버 사이드 세션 관리가 필요 없습니다.
 * Firebase Auth는 클라이언트 사이드에서 처리됩니다.
 *
 * 추후 필요시 다른 용도로 활용 가능:
 * - API 인증 체크
 * - 리다이렉트 처리
 * - 국제화(i18n) 처리
 */
export async function middleware(request: NextRequest) {
  // 현재는 그대로 통과
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
