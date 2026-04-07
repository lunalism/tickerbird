// 뉴스 페이지 클라이언트 컴포넌트
// 목업 데이터로 뉴스 리스트를 표시합니다.
// 주요뉴스, 필터, 뉴스 리스트 3개 섹션으로 구성됩니다.

"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
} from "lucide-react";

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

// 뉴스 아이템 타입
interface NewsItem {
  id: number;
  title: string;
  source: "로이터" | "파이낸셜주스" | "Tickerbird";
  category: "종합" | "속보" | "분석";
  market: "KR" | "US";
  published_at: string;
  view_count: number;
  is_breaking: boolean;
  is_featured: boolean;
}

// ──────────────────────────────────────────────
// 목업 데이터 (15개)
// ──────────────────────────────────────────────

const MOCK_NEWS: NewsItem[] = [
  {
    id: 1,
    title: "삼성전자, 2분기 반도체 영업이익 전년 대비 340% 급증 전망",
    source: "로이터",
    category: "속보",
    market: "KR",
    published_at: "2026-04-07T08:30:00Z",
    view_count: 12450,
    is_breaking: true,
    is_featured: true,
  },
  {
    id: 2,
    title: "엔비디아, 차세대 블랙웰 울트라 GPU 공개… AI 시장 판도 바꾸나",
    source: "파이낸셜주스",
    category: "종합",
    market: "US",
    published_at: "2026-04-07T07:15:00Z",
    view_count: 9870,
    is_breaking: false,
    is_featured: true,
  },
  {
    id: 3,
    title: "한국은행, 기준금리 동결 결정… 하반기 인하 가능성 시사",
    source: "로이터",
    category: "속보",
    market: "KR",
    published_at: "2026-04-07T06:00:00Z",
    view_count: 8320,
    is_breaking: true,
    is_featured: false,
  },
  {
    id: 4,
    title: "테슬라 1분기 인도량 역대 최저… 주가 장전 5% 하락",
    source: "로이터",
    category: "종합",
    market: "US",
    published_at: "2026-04-07T05:45:00Z",
    view_count: 7650,
    is_breaking: false,
    is_featured: false,
  },
  {
    id: 5,
    title: "SK하이닉스, HBM4 양산 일정 앞당겨… 삼성과 격차 벌리나",
    source: "파이낸셜주스",
    category: "분석",
    market: "KR",
    published_at: "2026-04-07T04:30:00Z",
    view_count: 6540,
    is_breaking: false,
    is_featured: false,
  },
  {
    id: 6,
    title: "애플, 자체 AI 칩 개발 가속화… 퀄컴 의존도 낮출 계획",
    source: "Tickerbird",
    category: "분석",
    market: "US",
    published_at: "2026-04-07T03:20:00Z",
    view_count: 5430,
    is_breaking: false,
    is_featured: false,
  },
  {
    id: 7,
    title: "현대차 그룹, 미국 조지아 공장 본격 가동… 전기차 생산 개시",
    source: "로이터",
    category: "종합",
    market: "KR",
    published_at: "2026-04-07T02:10:00Z",
    view_count: 4320,
    is_breaking: false,
    is_featured: false,
  },
  {
    id: 8,
    title: "마이크로소프트, OpenAI 지분 추가 매입 협상 중",
    source: "파이낸셜주스",
    category: "속보",
    market: "US",
    published_at: "2026-04-07T01:00:00Z",
    view_count: 6780,
    is_breaking: true,
    is_featured: false,
  },
  {
    id: 9,
    title: "카카오, 신임 CEO 선임… AI·커머스 중심 체질 개선 선언",
    source: "Tickerbird",
    category: "종합",
    market: "KR",
    published_at: "2026-04-06T23:50:00Z",
    view_count: 3890,
    is_breaking: false,
    is_featured: false,
  },
  {
    id: 10,
    title: "아마존 AWS, 한국 리전 2호 데이터센터 증설 발표",
    source: "로이터",
    category: "종합",
    market: "US",
    published_at: "2026-04-06T22:30:00Z",
    view_count: 3210,
    is_breaking: false,
    is_featured: false,
  },
  {
    id: 11,
    title: "POSCO홀딩스, 리튬 사업 확대… 아르헨 광산 추가 투자 결정",
    source: "파이낸셜주스",
    category: "분석",
    market: "KR",
    published_at: "2026-04-06T21:15:00Z",
    view_count: 2870,
    is_breaking: false,
    is_featured: false,
  },
  {
    id: 12,
    title: "구글 알파벳, 반독점 소송 1심 패소… 주가 영향은 제한적",
    source: "로이터",
    category: "종합",
    market: "US",
    published_at: "2026-04-06T20:00:00Z",
    view_count: 4560,
    is_breaking: false,
    is_featured: false,
  },
  {
    id: 13,
    title: "LG에너지솔루션, 북미 ESS 시장 공략 본격화… GM과 합작 추진",
    source: "Tickerbird",
    category: "분석",
    market: "KR",
    published_at: "2026-04-06T18:45:00Z",
    view_count: 2340,
    is_breaking: false,
    is_featured: false,
  },
  {
    id: 14,
    title: "메타, 쓰레드 유료 구독 모델 테스트 시작… 광고 없는 버전 제공",
    source: "파이낸셜주스",
    category: "종합",
    market: "US",
    published_at: "2026-04-06T17:30:00Z",
    view_count: 1980,
    is_breaking: false,
    is_featured: false,
  },
  {
    id: 15,
    title: "네이버, 일본 라인야후 지분 매각 최종 합의 임박",
    source: "로이터",
    category: "속보",
    market: "KR",
    published_at: "2026-04-06T16:00:00Z",
    view_count: 5120,
    is_breaking: true,
    is_featured: false,
  },
];

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

// 조회수 포맷 (1000 이상이면 K 단위)
function formatViewCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// ──────────────────────────────────────────────
// 배지 스타일 함수
// ──────────────────────────────────────────────

// 출처별 배지 스타일 반환
function getSourceBadgeStyle(source: NewsItem["source"]): string {
  switch (source) {
    case "로이터":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "파이낸셜주스":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400";
    case "Tickerbird":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  }
}

// 카테고리별 배지 스타일 반환
function getCategoryBadgeStyle(category: NewsItem["category"]): string {
  switch (category) {
    case "속보":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "분석":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "종합":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

// ──────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────

export default function NewsPageClient() {
  // 시장 필터 상태 (전체 / 한국 / 미국)
  const [selectedMarket, setSelectedMarket] = useState<"all" | "KR" | "US">("all");
  // 카테고리 필터 상태 (전체 / 종합 / 속보 / 분석)
  const [selectedCategory, setSelectedCategory] = useState<"all" | "종합" | "속보" | "분석">("all");
  // 주요뉴스 섹션 접기/펼치기 상태
  const [isFeaturedOpen, setIsFeaturedOpen] = useState(true);
  // 로그인 상태 (목업, 나중에 실제 연동)
  const isLoggedIn = false;

  // 주요뉴스 (is_featured가 true인 항목)
  const featuredNews = MOCK_NEWS.filter((news) => news.is_featured);

  // 필터가 적용된 뉴스 목록
  const filteredNews = MOCK_NEWS.filter((news) => {
    const marketMatch = selectedMarket === "all" || news.market === selectedMarket;
    const categoryMatch = selectedCategory === "all" || news.category === selectedCategory;
    return marketMatch && categoryMatch;
  });

  // 비로그인 시 표시할 뉴스 개수 제한 (10개)
  const visibleLimit = isLoggedIn ? filteredNews.length : 10;
  const visibleNews = filteredNews.slice(0, visibleLimit);
  const hiddenNews = filteredNews.slice(visibleLimit);

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
            {featuredNews.map((news) => (
              <div
                key={news.id}
                className={`
                  rounded-lg border border-border p-4 transition-colors
                  hover:border-foreground/20
                  ${news.is_breaking
                    ? "bg-red-50/50 dark:bg-red-950/20"
                    : "bg-card"
                  }
                `}
              >
                {/* 배지 + 시간 */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* 출처 배지 */}
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getSourceBadgeStyle(news.source)}`}>
                      {news.source}
                    </span>
                    {/* 카테고리 배지 */}
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getCategoryBadgeStyle(news.category)}`}>
                      {news.category}
                    </span>
                  </div>
                  {/* 상대 시간 */}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(news.published_at)}
                  </span>
                </div>
                {/* 제목 */}
                <h3 className="mb-2 text-sm font-semibold leading-snug text-foreground">
                  {news.title}
                </h3>
                {/* 조회수 */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye size={12} />
                  <span>{formatViewCount(news.view_count)}</span>
                </div>
              </div>
            ))}
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
              <option>조회순</option>
            </select>
            <button
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="새로고침"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* 카테고리 필터 탭 */}
        <div className="flex items-center gap-1">
          {(
            [
              { value: "all", label: "전체" },
              { value: "종합", label: "종합" },
              { value: "속보", label: "속보" },
              { value: "분석", label: "분석" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedCategory(tab.value)}
              className={`
                rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                ${selectedCategory === tab.value
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
        {filteredNews.length === 0 ? (
          // 필터 결과가 없을 때
          <p className="py-12 text-center text-muted-foreground">
            해당 조건에 맞는 뉴스가 없습니다.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {/* 표시 가능한 뉴스 목록 */}
            {visibleNews.map((news) => (
              <article
                key={news.id}
                className="cursor-pointer px-2 py-3 transition-colors hover:bg-accent/50"
              >
                {/* 첫째 줄: 배지 + 시간 */}
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getSourceBadgeStyle(news.source)}`}>
                      {news.source}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getCategoryBadgeStyle(news.category)}`}>
                      {news.category}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(news.published_at)}
                  </span>
                </div>
                {/* 둘째 줄: 제목 */}
                <h3 className="mb-1 text-sm font-semibold leading-snug text-foreground">
                  {news.title}
                </h3>
                {/* 셋째 줄: 조회수 (오른쪽 정렬) */}
                <div className="flex justify-end">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye size={12} />
                    {formatViewCount(news.view_count)}
                  </span>
                </div>
              </article>
            ))}

            {/* 비로그인 시: 블러 처리된 뉴스 + 로그인 유도 배너 */}
            {!isLoggedIn && hiddenNews.length > 0 && (
              <div className="relative">
                {/* 블러 처리된 뉴스 미리보기 */}
                <div className="pointer-events-none select-none blur-sm">
                  {hiddenNews.slice(0, 3).map((news) => (
                    <div key={news.id} className="px-2 py-3">
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getSourceBadgeStyle(news.source)}`}>
                          {news.source}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getCategoryBadgeStyle(news.category)}`}>
                          {news.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {news.title}
                      </h3>
                    </div>
                  ))}
                </div>

                {/* 로그인 유도 배너 (블러 위에 오버레이) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
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
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
