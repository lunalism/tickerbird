// 관리자 패널 클라이언트 컴포넌트
// 비관리자 접근 시 /news로 리다이렉트합니다.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Users, FileText, BarChart3, Ban } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminPageClient() {
  const router = useRouter();
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  // 비로그인 또는 비관리자 접근 시 /news로 리다이렉트
  useEffect(() => {
    if (!isLoading && (!isLoggedIn || !isAdmin)) {
      router.replace("/news");
    }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  // 로딩 중 스피너
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 비관리자 (리다이렉트 전 잠깐 표시)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-xl font-bold text-foreground">
        🛡️ 관리자 패널
      </h1>

      {/* 관리 메뉴 카드 그리드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* 사용자 관리 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <Users size={20} className="text-sky-500" />
            <h3 className="text-sm font-semibold text-foreground">
              사용자 관리
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">준비 중</p>
        </div>

        {/* 콘텐츠 관리 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <FileText size={20} className="text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">
              콘텐츠 관리
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">준비 중</p>
        </div>

        {/* 통계 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 size={20} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">통계</h3>
          </div>
          <p className="text-xs text-muted-foreground">준비 중</p>
        </div>

        {/* 차단 언론사 관리 */}
        <Link
          href="/admin/blocked-sources"
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/20"
        >
          <div className="mb-3 flex items-center gap-2">
            <Ban size={20} className="text-red-500" />
            <h3 className="text-sm font-semibold text-foreground">
              차단 언론사 관리
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            뉴스 수집 시 제외할 언론사를 관리합니다
          </p>
        </Link>
      </div>
    </div>
  );
}
