// 뉴스 페이지 클라이언트 컴포넌트
// Supabase articles 테이블에서 실제 데이터를 조회합니다.
// 이전 스타일 UI: 주요뉴스 + 필터 + 리스트

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { useNewsStore } from "@/stores/newsStore";
import type { Article } from "@/components/news/NewsCard";

// ──────────────────────────────────────────────
// 유틸 함수
// ──────────────────────────────────────────────

// 상대 시간 포맷 (n분 전, n시간 전, n일 전)
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 60) return `${Math.max(1, diffMin)}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${diffDay}일 전`;
}

// ──────────────────────────────────────────────
// 배지 스타일 함수
// ──────────────────────────────────────────────

// 출처별 배지 스타일 반환
function getSourceBadgeStyle(source: string): string {
  switch (source) {
    case "CNBC":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "MarketWatch":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "Investing.com":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "네이버":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

// 출처별 카테고리 매핑
function getCategoryFromSource(source: string): { label: string; style: string } {
  switch (source) {
    case "CNBC":
      return {
        label: "속보",
        style: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      };
    case "MarketWatch":
      return {
        label: "시장",
        style: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      };
    case "Investing.com":
      return {
        label: "분석",
        style: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      };
    case "네이버":
      return {
        label: "종합",
        style: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
      };
    default:
      return {
        label: "기타",
        style: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
      };
  }
}

// ──────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────

export default function NewsPageClient() {
  const router = useRouter();
  const setSelectedArticle = useNewsStore((s) => s.setSelectedArticle);

  // 시장 필터 상태 (전체 / 한국 / 미국)
  const [selectedMarket, setSelectedMarket] = useState<"all" | "KR" | "US">("all");
  // 출처 필터 상태
  const [selectedSource, setSelectedSource] = useState<string>("all");
  // 주요뉴스 섹션 접기/펼치기 상태
  const [isFeaturedOpen, setIsFeaturedOpen] = useState(true);
  // 기사 목록
  const [articles, setArticles] = useState<Article[]>([]);
  // 로딩 상태
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Supabase 세션에서 실제 로그인 상태를 감지합니다
  const { isLoggedIn, isLoading: isAuthLoading } = useAuth();

  // 기사 클릭 핸들러: Zustand에 저장 후 모달 라우트로 이동
  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article);
    router.push(`/news/${article.id}`);
  };

  // 기사 조회
  const fetchArticles = async () => {
    setIsDataLoading(true);
    try {
      const supabase = createClient();
      const limit = isLoggedIn ? 50 : 10;

      let query = supabase
        .from("articles")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(limit);

      // 시장 필터 적용
      if (selectedMarket !== "all") {
        query = query.eq("country", selectedMarket);
      }

      // 출처 필터 적용
      if (selectedSource !== "all") {
        query = query.eq("source_name", selectedSource);
      }

      const { data, error } = await query;

      if (error) {
        console.error("기사 조회 실패:", error);
        setArticles([]);
      } else {
        setArticles(data ?? []);
      }
    } catch (error) {
      console.error("기사 조회 예외:", error);
      setArticles([]);
    } finally {
      setIsDataLoading(false);
    }
  };

  // 인증 로딩 완료 후 기사 조회
  useEffect(() => {
    if (!isAuthLoading) {
      fetchArticles();
    }
  }, [isAuthLoading, isLoggedIn, selectedMarket, selectedSource]);

  // 주요뉴스: 최신 2개
  const featuredNews = articles.slice(0, 2);
  // 전체 리스트
  const visibleArticles = articles;

  // 전체 로딩 상태 (인증 + 데이터)
  const isLoading = isAuthLoading || isDataLoading;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* ── 섹션 1: 오늘의 주요뉴스 ── */}
      <section className="mb-8">
        {/* 섹션 헤더 + 접기/펼치기 버튼 */}
        <button
          onClick={() => setIsFeaturedOpen(!isFeaturedOpen)}
          className="mb-4 flex w-full items-center justify-between"
        >
          <h2 className="text-lg font-bold text-foreground">
            🔥 오늘의 주요뉴스
          </h2>
          {isFeaturedOpen ? (
            <ChevronUp size={20} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={20} className="text-muted-foreground" />
          )}
        </button>

        {/* 주요뉴스 카드 2열 */}
        {isFeaturedOpen && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-lg border border-border bg-card p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-4 w-14 rounded bg-muted" />
                      <div className="h-4 w-10 rounded bg-muted" />
                    </div>
                    <div className="mb-2 h-5 w-4/5 rounded bg-muted" />
                    <div className="h-3 w-16 rounded bg-muted" />
                  </div>
                ))
              : featuredNews.map((news) => {
                  const category = getCategoryFromSource(news.source_name);
                  return (
                    <button
                      key={news.id}
                      onClick={() => handleArticleClick(news)}
                      className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-foreground/20"
                    >
                      {/* 배지 + 시간 */}
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${getSourceBadgeStyle(news.source_name)}`}
                          >
                            {news.source_name}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${category.style}`}
                          >
                            {category.label}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(news.published_at)}
                        </span>
                      </div>
                      {/* 제목 */}
                      <h3 className="text-sm font-semibold leading-snug text-foreground">
                        {news.title_ko}
                      </h3>
                    </button>
                  );
                })}
          </div>
        )}
      </section>

      {/* ── 섹션 2: 필터 영역 ── */}
      <section className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 시장 필터 탭 */}
          <div className="flex items-center gap-1">
            {(
              [
                { value: "all", label: "전체" },
                { value: "KR", label: "🇰🇷 한국" },
                { value: "US", label: "🇺🇸 미국" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedMarket(tab.value)}
                className={`
                  rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                  ${selectedMarket === tab.value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 정렬 드롭다운 + 새로고침 버튼 */}
          <div className="flex items-center gap-2">
            <select className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground">
              <option>최신순</option>
            </select>
            <button
              onClick={fetchArticles}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="새로고침"
            >
              <RefreshCw size={16} className={isDataLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* 출처 필터 탭 */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {(
            [
              { value: "all", label: "전체" },
              { value: "CNBC", label: "CNBC" },
              { value: "MarketWatch", label: "MarketWatch" },
              { value: "Investing.com", label: "Investing.com" },
              { value: "네이버", label: "네이버" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedSource(tab.value)}
              className={`
                shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                ${selectedSource === tab.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── 섹션 3: 뉴스 리스트 ── */}
      <section>
        {isLoading ? (
          // 로딩 스켈레톤
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse px-2 py-3">
                <div className="mb-1 flex items-center gap-2">
                  <div className="h-4 w-14 rounded bg-muted" />
                  <div className="h-4 w-10 rounded bg-muted" />
                </div>
                <div className="h-4 w-3/4 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : visibleArticles.length === 0 ? (
          // 필터 결과가 없을 때
          <p className="py-12 text-center text-muted-foreground">
            해당 조건에 맞는 뉴스가 없습니다.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {/* 뉴스 목록 */}
            {visibleArticles.map((news) => {
              const category = getCategoryFromSource(news.source_name);
              return (
                <button
                  key={news.id}
                  onClick={() => handleArticleClick(news)}
                  className="flex w-full items-center justify-between gap-3 px-2 py-3 text-left transition-colors hover:bg-accent/50"
                >
                  {/* 좌측: 배지들 + 제목 */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-1.5">
                      {/* 출처 배지 */}
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${getSourceBadgeStyle(news.source_name)}`}
                      >
                        {news.source_name}
                      </span>
                      {/* 카테고리 배지 */}
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${category.style}`}
                      >
                        {category.label}
                      </span>
                    </div>
                    {/* 제목만 표시 (요약 없음) */}
                    <h3 className="truncate text-sm font-semibold leading-snug text-foreground">
                      {news.title_ko}
                    </h3>
                  </div>

                  {/* 우측: 발행 시간 */}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(news.published_at)}
                  </span>
                </button>
              );
            })}

            {/* 비로그인 시: 로그인 유도 배너 */}
            {!isLoggedIn && visibleArticles.length >= 10 && (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="mb-3 text-sm font-medium text-foreground">
                  더 많은 뉴스를 보려면 로그인하세요
                </p>
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  {/* Google 아이콘 */}
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                  Google로 시작하기
                </a>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
