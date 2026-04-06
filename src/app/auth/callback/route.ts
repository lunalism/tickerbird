// OAuth 콜백 처리 API Route
// Google OAuth 인증 후 리다이렉트되는 엔드포인트입니다.
// 인증 코드를 세션으로 교환하고 적절한 페이지로 리다이렉트합니다.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // URL에서 인증 코드를 추출합니다
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    // Supabase 서버 클라이언트 생성
    const supabase = await createClient();

    // 인증 코드를 세션으로 교환합니다
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 성공 시 뉴스 페이지로 리다이렉트
      return NextResponse.redirect(`${origin}/news`);
    }
  }

  // 실패 시 로그인 페이지로 리다이렉트 (에러 파라미터 포함)
  return NextResponse.redirect(`${origin}/login?error=true`);
}
