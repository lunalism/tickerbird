/**
 * CrawledNewsCard 컴포넌트
 *
 * 네이버 금융에서 크롤링한 뉴스를 표시하는 카드 컴포넌트입니다.
 *
 * ============================================================
 * 요금제별 UX:
 * ============================================================
 * - 무료 사용자: 클릭 시 원문 링크로 이동 (새 탭)
 * - 프리미엄 사용자:
 *   - 데스크톱/태블릿 (≥768px): 클릭 시 AI 재작성 모달 표시
 *   - 모바일 (<768px): 클릭 시 /news/crawled/[id] 페이지로 이동
 *
 * ============================================================
 * 기능:
 * ============================================================
 * - 뉴스 제목 및 요약 표시
 * - 언론사 및 발행 시간 표시
 * - 썸네일 이미지 (있는 경우) - object-contain으로 전체 이미지 표시
 * - 카테고리별 배지 (속보/시장/공시/해외/채권)
 * - AI 재작성 모달 (프리미엄 + 데스크톱)
 *
 * @example
 * ```tsx
 * <CrawledNewsCard news={newsItem} />
 * ```
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { CrawledNewsItem, CrawledNewsCategory } from "@/types/crawled-news";
import { useFontSizeStore, FONT_SIZE_MAP } from "@/stores";
import { NewsModal } from "@/components/news";
import { useAuth } from "@/components/providers/AuthProvider";

interface CrawledNewsCardProps {
  /** 뉴스 아이템 데이터 */
  news: CrawledNewsItem;
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 카테고리별 배지 스타일을 반환합니다.
 *
 * 각 카테고리에 맞는 배경색과 텍스트 색상을 제공합니다.
 * 라이트/다크 모드 모두 지원합니다.
 *
 * @param category - 뉴스 카테고리
 * @returns Tailwind CSS 클래스 문자열
 */
function getCategoryStyle(category: CrawledNewsCategory): string {
  const styles: Record<CrawledNewsCategory, string> = {
    headlines: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    market: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    disclosure: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    world: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    bond: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };
  return styles[category] || styles.headlines;
}

/**
 * 카테고리별 한글 라벨을 반환합니다.
 */
function getCategoryLabel(category: CrawledNewsCategory): string {
  const labels: Record<CrawledNewsCategory, string> = {
    headlines: "속보",
    market: "시장",
    disclosure: "공시",
    world: "해외",
    bond: "채권",
  };
  return labels[category] || "뉴스";
}

/**
 * 카테고리별 이모지 아이콘을 반환합니다.
 */
function getCategoryIcon(category: CrawledNewsCategory): string {
  const icons: Record<CrawledNewsCategory, string> = {
    headlines: "🔥",
    market: "📈",
    disclosure: "📋",
    world: "🌍",
    bond: "💱",
  };
  return icons[category] || "📰";
}

/**
 * 768px 기준으로 모바일인지 확인합니다.
 */
function useIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

// ============================================
// 메인 컴포넌트
// ============================================

/**
 * 뉴스 카드 컴포넌트
 *
 * 크롤링된 뉴스를 카드 형태로 표시합니다.
 * 클릭 시 데스크톱에서는 모달, 모바일에서는 페이지 이동
 */
export function CrawledNewsCard({ news }: CrawledNewsCardProps) {
  const router = useRouter();

  // 사용자 설정 폰트 크기 가져오기 (접근성 지원)
  const { titleSize, bodySize } = useFontSizeStore();

  // 프리미엄 사용자 여부 확인
  const { isPremium } = useAuth();

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ========================================
  // 뉴스 클릭 핸들러
  // ========================================
  const handleNewsClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      // 디버그: 요금제 상태 확인
      console.log('[CrawledNewsCard] isPremium:', isPremium);

      // 무료 사용자: 원문 링크로 이동
      if (!isPremium) {
        console.log('[CrawledNewsCard] 무료 사용자 - 원문으로 이동:', news.url);
        window.open(news.url, "_blank", "noopener,noreferrer");
        return;
      }

      // 프리미엄 사용자: AI 재작성 콘텐츠 표시
      // 768px 기준으로 분기
      if (useIsMobile()) {
        // 모바일: 페이지로 이동
        router.push(`/news/crawled/${encodeURIComponent(news.id)}`);
      } else {
        // 데스크톱: 모달 오픈
        setIsModalOpen(true);
      }
    },
    [router, news.id, news.url, isPremium]
  );

  // ========================================
  // 원문 링크 클릭 핸들러 (이벤트 버블링 방지)
  // ========================================
  const handleOriginalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      <article className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/50 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group cursor-pointer">
        {/*
         * ========================================
         * 썸네일 영역
         * ========================================
         */}
        <div
          onClick={handleNewsClick}
          className="relative h-44 w-full overflow-hidden bg-gray-50 dark:bg-gray-900 block"
        >
          {news.thumbnail ? (
            <Image
              src={news.thumbnail}
              alt={news.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
              className="object-contain group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
              <span className="text-5xl opacity-50">{getCategoryIcon(news.category)}</span>
            </div>
          )}

          {/* 카테고리 배지 (좌측 상단) */}
          <div className="absolute top-3 left-3">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${getCategoryStyle(news.category)}`}
            >
              <span>{getCategoryIcon(news.category)}</span>
              {getCategoryLabel(news.category)}
            </span>
          </div>

          {/* AI 배지 (우측 상단) - 프리미엄 사용자에게만 호버 시 표시 */}
          {isPremium && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                <span>✨</span>
                <span>AI 분석</span>
              </span>
            </div>
          )}
        </div>

        {/*
         * ========================================
         * 콘텐츠 영역
         * ========================================
         */}
        <div className="flex-1 p-4 flex flex-col" onClick={handleNewsClick}>
          {/* 메타 정보: 발행 시간 + 언론사 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {news.publishedAt} · {news.source}
            </span>
          </div>

          {/* 뉴스 제목 - 2줄까지 표시 */}
          <h2
            className={`${FONT_SIZE_MAP.card.title[titleSize]} font-bold text-gray-900 dark:text-white mb-2 leading-snug line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors`}
          >
            {news.title}
          </h2>

          {/* 종목 태그 (종목 뉴스인 경우에만 표시) */}
          {news.stockCode && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                {news.stockName || news.stockCode}
              </span>
            </div>
          )}

          {/* 요약문 (있는 경우에만 표시) - 3줄까지 */}
          {news.description && (
            <p
              className={`${FONT_SIZE_MAP.card.body[bodySize]} text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 flex-1`}
            >
              {news.description}
            </p>
          )}

          {/* 푸터: 원문 보기 링크 + 언론사 */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 dark:border-gray-700">
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOriginalClick}
              className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              원문 보기
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>

            {/* 언론사 이름 */}
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              {news.source}
            </span>
          </div>
        </div>
      </article>

      {/* AI 재작성 모달 (데스크톱 전용) */}
      {isModalOpen && (
        <NewsModal news={news} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}

// ============================================
// 리스트 아이템 컴포넌트 (기존 유지)
// ============================================

/**
 * 간소화된 뉴스 리스트 아이템 컴포넌트
 *
 * 썸네일 없이 제목과 메타 정보만 표시합니다.
 * 사이드바나 작은 공간에서 뉴스 목록을 표시할 때 사용합니다.
 */
interface CrawledNewsListItemProps {
  /** 뉴스 아이템 데이터 */
  news: CrawledNewsItem;
}

export function CrawledNewsListItem({ news }: CrawledNewsListItemProps) {
  return (
    <a
      href={news.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
    >
      {/* 카테고리 아이콘 */}
      <span className="text-lg flex-shrink-0">{getCategoryIcon(news.category)}</span>

      {/* 콘텐츠 */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {news.title}
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {news.publishedAt} · {news.source}
        </p>
      </div>

      {/* 외부 링크 아이콘 (호버 시 표시) */}
      <svg
        className="w-4 h-4 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}
