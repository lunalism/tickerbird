import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js 미들웨어
 * - 인증이 필요한 라우트를 보호합니다
 * - 로그인된 유저가 /login 접근 시 /news로 리다이렉트합니다
 * - 매 요청마다 Supabase 세션을 갱신합니다
 */
export async function middleware(request: NextRequest) {
  // Supabase 세션을 갱신합니다
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;

  // 인증 상태를 확인하기 위한 Supabase 클라이언트를 생성합니다
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  // 현재 유저 정보를 가져옵니다
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 인증이 필요한 경로: /news는 비로그인도 접근 가능
  const isProtectedRoute =
    pathname.startsWith("/reports") ||
    pathname.startsWith("/community") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/profile");

  // 로그인 페이지 경로
  const isAuthRoute = pathname.startsWith("/login");

  // 인증되지 않은 유저가 보호된 경로에 접근하면 로그인 페이지로 리다이렉트
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 이미 로그인된 유저가 로그인 페이지에 접근하면 /news로 리다이렉트
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/news";
    return NextResponse.redirect(url);
  }

  return response;
}

/**
 * 미들웨어가 실행될 경로를 설정합니다.
 * 정적 파일과 이미지 등은 제외합니다.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
