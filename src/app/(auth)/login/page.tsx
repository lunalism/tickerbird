// 로그인 페이지
// Google OAuth를 통한 로그인 기능을 제공합니다.
// 중앙 정렬 카드 레이아웃, 다크모드 지원

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  // 로그인 처리 중 로딩 상태
  const [isLoading, setIsLoading] = useState(false);

  // Google OAuth 로그인 처리 함수
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      // Supabase Google OAuth 로그인 요청
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // OAuth 콜백 URL 설정
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch {
      // 에러 발생 시 로딩 해제
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* 로그인 카드 */}
      <div className="w-full max-w-sm space-y-8 rounded-xl border border-border bg-card p-8 shadow-sm">
        {/* 상단: 로고 및 서비스 소개 */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-card-foreground">
            🐦 Tickerbird
          </h1>
          <p className="text-sm text-muted-foreground">
            투자 뉴스와 리포트를 한곳에서 확인하세요
          </p>
        </div>

        {/* Google 로그인 버튼 */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            // 로딩 중 스피너 표시
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          ) : (
            // Google 아이콘 (SVG)
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span>{isLoading ? "로그인 중..." : "Google로 시작하기"}</span>
        </button>

        {/* 하단: 이용약관 안내 */}
        <p className="text-center text-xs text-muted-foreground">
          로그인 시{" "}
          <span className="underline underline-offset-2">서비스 이용약관</span>
          에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
