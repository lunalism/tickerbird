// 관리자 대시보드 페이지 (서버 컴포넌트)
// 서버에서 모든 통계를 병렬로 미리 조회하여 즉시 렌더링합니다.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  FileText,
  BarChart3,
  Ban,
  Newspaper,
  Crown,
  MessageSquare,
} from "lucide-react";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "관리자 패널",
  robots: { index: false, follow: false },
};

// 캐싱 없음 (실시간 데이터 필요)
export const dynamic = "force-dynamic";

// 상대 시간 포맷 (서버에서 렌더링 시점 기준)
function formatTime(dateStr: string): string {
  if (!dateStr) return "-";
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${Math.floor(hour / 24)}일 전`;
}

export default async function AdminPage() {
  // 1. 서버에서 인증 확인 (cookie 기반)
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/news");

  // 관리자 여부 확인
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/news");

  // 2. service_role 클라이언트로 모든 통계 병렬 조회
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [
    totalUsersRes,
    totalArticlesRes,
    trumpPostsRes,
    premiumUsersRes,
    todaySignupsRes,
    blockedRes,
    recentUserRes,
    lastArticleRes,
  ] = await Promise.all([
    adminClient.from("profiles").select("*", { count: "exact", head: true }),
    adminClient.from("articles").select("*", { count: "exact", head: true }),
    adminClient.from("trump_posts").select("*", { count: "exact", head: true }),
    adminClient.from("profiles").select("*", { count: "exact", head: true }).eq("tier", "premium"),
    adminClient.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
    adminClient.from("admin_settings").select("value").eq("key", "blocked_news_sources").single(),
    adminClient.from("profiles").select("display_name").order("created_at", { ascending: false }).limit(1).single(),
    adminClient.from("articles").select("created_at").order("created_at", { ascending: false }).limit(1).single(),
  ]);

  // 통계 데이터 추출
  const totalUsers = totalUsersRes.count ?? 0;
  const totalArticles = totalArticlesRes.count ?? 0;
  const trumpPosts = trumpPostsRes.count ?? 0;
  const premiumUsers = premiumUsersRes.count ?? 0;
  const todaySignups = todaySignupsRes.count ?? 0;
  const blockedSources = Array.isArray(blockedRes.data?.value) ? blockedRes.data.value : [];
  const blockedCount = blockedSources.length;
  const latestUser = recentUserRes.data?.display_name ?? "-";
  const lastCollect = lastArticleRes.data?.created_at ?? "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-xl font-bold text-foreground">
        🛡️ 관리자 패널
      </h1>

      {/* ── 상단 통계 카드 4개 ── */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4">
        {/* 총 유저수 */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <Users size={16} className="text-sky-500" />
            <span className="text-xs text-muted-foreground">총 유저수</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
        </div>

        {/* 수집된 뉴스 */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <Newspaper size={16} className="text-emerald-500" />
            <span className="text-xs text-muted-foreground">수집된 뉴스</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalArticles}</p>
        </div>

        {/* 트럼프 게시물 */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <MessageSquare size={16} className="text-purple-500" />
            <span className="text-xs text-muted-foreground">트럼프 게시물</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{trumpPosts}</p>
        </div>

        {/* Premium 유저 */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <Crown size={16} className="text-amber-500" />
            <span className="text-xs text-muted-foreground">Premium 유저</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{premiumUsers}</p>
        </div>
      </div>

      {/* ── 메뉴 카드 4개 ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* 통계 */}
        <Link
          href="/admin/stats"
          prefetch={false}
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/20"
        >
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 size={20} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">📊 통계</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            오늘 가입자: {todaySignups}명
          </p>
        </Link>

        {/* 사용자 관리 */}
        <Link
          href="/admin/users"
          prefetch={false}
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/20"
        >
          <div className="mb-3 flex items-center gap-2">
            <Users size={20} className="text-sky-500" />
            <h3 className="text-sm font-semibold text-foreground">
              👥 사용자 관리
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            최근 가입: {latestUser}
          </p>
        </Link>

        {/* 콘텐츠 관리 */}
        <Link
          href="/admin/content"
          prefetch={false}
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/20"
        >
          <div className="mb-3 flex items-center gap-2">
            <FileText size={20} className="text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">
              📰 콘텐츠 관리
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            마지막 수집: {formatTime(lastCollect)}
          </p>
        </Link>

        {/* 차단 언론사 관리 */}
        <Link
          href="/admin/blocked-sources"
          prefetch={false}
          className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/20"
        >
          <div className="mb-3 flex items-center gap-2">
            <Ban size={20} className="text-red-500" />
            <h3 className="text-sm font-semibold text-foreground">
              🚫 차단 언론사 관리
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            현재 차단: {blockedCount}개
          </p>
        </Link>
      </div>
    </div>
  );
}
