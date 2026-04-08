// 관리자 콘텐츠 관리 페이지 클라이언트 컴포넌트
// 뉴스 수집 트리거, 기사 현황, 최근 수집 목록을 표시합니다.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

// 기사 현황 타입
interface ContentStats {
  totalArticles: number;
  sourceStats: Record<string, number>;
  oldestDate: string;
  newestDate: string;
  lastCollect: string;
}

// 최근 기사 타입
interface RecentArticle {
  id: string;
  title_ko: string;
  source_name: string;
  published_at: string;
}

export default function ContentPageClient() {
  const router = useRouter();
  const { isLoading: isAuthLoading, isLoggedIn, isAdmin } = useAuth();
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 수집 상태
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState<string>("");

  // 비관리자 리다이렉트
  useEffect(() => {
    if (!isAuthLoading && (!isLoggedIn || !isAdmin)) {
      router.replace("/news");
    }
  }, [isAuthLoading, isLoggedIn, isAdmin, router]);

  // 콘텐츠 데이터 조회
  const fetchContentData = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // 병렬 조회
      const [
        totalRes,
        cnbcRes,
        mwRes,
        invRes,
        nasdaqRes,
        naverRes,
        oldestRes,
        newestRes,
        lastCollectRes,
        recentRes,
      ] = await Promise.all([
        supabase.from("articles").select("*", { count: "exact", head: true }),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("source_name", "CNBC"),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("source_name", "MarketWatch"),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("source_name", "Investing.com"),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("source_name", "Nasdaq"),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("source_name", "네이버"),
        supabase.from("articles").select("published_at").order("published_at", { ascending: true }).limit(1).single(),
        supabase.from("articles").select("published_at").order("published_at", { ascending: false }).limit(1).single(),
        supabase.from("articles").select("created_at").order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("articles").select("id, title_ko, source_name, published_at").order("created_at", { ascending: false }).limit(10),
      ]);

      setStats({
        totalArticles: totalRes.count ?? 0,
        sourceStats: {
          CNBC: cnbcRes.count ?? 0,
          MarketWatch: mwRes.count ?? 0,
          "Investing.com": invRes.count ?? 0,
          Nasdaq: nasdaqRes.count ?? 0,
          "네이버": naverRes.count ?? 0,
        },
        oldestDate: oldestRes.data?.published_at ?? "",
        newestDate: newestRes.data?.published_at ?? "",
        lastCollect: lastCollectRes.data?.created_at ?? "",
      });

      setRecentArticles(recentRes.data ?? []);
    } catch (error) {
      console.error("콘텐츠 데이터 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchContentData();
  }, [isAdmin]);

  // 뉴스 수집 실행
  const handleCollect = async () => {
    setIsCollecting(true);
    setCollectResult("");
    try {
      // 관리자 프록시 API를 통해 수집 (세션 쿠키로 인증, CRON_SECRET 미노출)
      const res = await fetch("/api/admin/collect", { method: "POST" });

      const data = await res.json();
      if (data.success) {
        const trumpMsg = data.trump_saved ? `, 트럼프 ${data.trump_saved}개` : "";
        setCollectResult(
          `수집 완료: ${data.collected}개 수집, ${data.saved}개 저장${trumpMsg}`
        );
        // 데이터 새로고침
        fetchContentData();
      } else {
        setCollectResult(`수집 실패: ${data.error || "알 수 없는 오류"}`);
      }
    } catch (error) {
      setCollectResult("수집 실패: 네트워크 오류");
      console.error("뉴스 수집 실패:", error);
    } finally {
      setIsCollecting(false);
    }
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 상대 시간 포맷
  const formatRelative = (dateStr: string) => {
    if (!dateStr) return "-";
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}분 전`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour}시간 전`;
    return `${Math.floor(hour / 24)}일 전`;
  };

  if (isAuthLoading || !isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* 뒤로가기 + 제목 */}
      <div className="mb-6">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          관리자 패널
        </Link>
        <h1 className="text-xl font-bold text-foreground">📰 콘텐츠 관리</h1>
      </div>

      {/* ── 뉴스 수집 섹션 ── */}
      <section className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          뉴스 수집
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCollect}
            disabled={isCollecting}
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={isCollecting ? "animate-spin" : ""}
            />
            {isCollecting ? "수집 중..." : "지금 수집하기"}
          </button>
          <span className="text-xs text-muted-foreground">
            마지막 수집: {formatRelative(stats?.lastCollect ?? "")}
          </span>
        </div>
        {collectResult && (
          <p
            className={`mt-3 text-sm ${
              collectResult.includes("실패")
                ? "text-red-500"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {collectResult}
          </p>
        )}
      </section>

      {/* ── 기사 현황 섹션 ── */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          현재 기사 현황
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* 요약 카드 */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">총 기사수</p>
                <p className="text-lg font-bold text-foreground">
                  {stats?.totalArticles ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">가장 오래된 기사</p>
                <p className="text-xs font-medium text-foreground">
                  {formatDate(stats?.oldestDate ?? "")}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">가장 최신 기사</p>
                <p className="text-xs font-medium text-foreground">
                  {formatDate(stats?.newestDate ?? "")}
                </p>
              </div>
            </div>

            {/* 소스별 기사수 바 차트 */}
            <div className="space-y-3">
              {stats?.sourceStats &&
                Object.entries(stats.sourceStats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, count]) => {
                    const max = Math.max(
                      ...Object.values(stats.sourceStats),
                      1
                    );
                    const percent = Math.round((count / max) * 100);
                    return (
                      <div key={source}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {source}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {count}개
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-foreground/60 transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
            </div>
          </>
        )}
      </section>

      {/* ── 최근 수집된 기사 목록 ── */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          최근 수집된 기사 (10개)
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : recentArticles.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            수집된 기사가 없습니다.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {recentArticles.map((article) => (
              <Link
                key={article.id}
                href="/news"
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {article.title_ko}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {article.source_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(article.published_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
