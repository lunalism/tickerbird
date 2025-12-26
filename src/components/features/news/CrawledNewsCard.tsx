/**
 * CrawledNewsCard 컴포넌트
 *
 * 네이버 금융에서 크롤링한 뉴스를 표시하는 카드 컴포넌트입니다.
 * 원문 링크로 직접 이동하도록 설계되어 있습니다.
 *
 * 기능:
 * - 뉴스 제목 및 요약 표시
 * - 언론사 및 발행 시간 표시
 * - 썸네일 이미지 (있는 경우)
 * - 카테고리 배지
 * - 원문 링크 연결
 */

"use client";

import Image from "next/image";
import type { CrawledNewsItem, CrawledNewsCategory } from "@/types/crawled-news";
import { useFontSizeStore, FONT_SIZE_MAP } from "@/stores";

interface CrawledNewsCardProps {
  news: CrawledNewsItem;
}

/**
 * 카테고리별 배지 색상
 */
function getCategoryStyle(category: CrawledNewsCategory): string {
  const styles: Record<CrawledNewsCategory, string> = {
    headlines: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    market: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    stock: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    world: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    bond: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };
  return styles[category] || styles.headlines;
}

/**
 * 카테고리별 라벨
 */
function getCategoryLabel(category: CrawledNewsCategory): string {
  const labels: Record<CrawledNewsCategory, string> = {
    headlines: "속보",
    market: "시장",
    stock: "종목",
    world: "해외",
    bond: "채권",
  };
  return labels[category] || "뉴스";
}

/**
 * 카테고리별 아이콘
 */
function getCategoryIcon(category: CrawledNewsCategory): string {
  const icons: Record<CrawledNewsCategory, string> = {
    headlines: "🔥",
    market: "📈",
    stock: "📊",
    world: "🌍",
    bond: "💱",
  };
  return icons[category] || "📰";
}

export function CrawledNewsCard({ news }: CrawledNewsCardProps) {
  // 사용자 설정 폰트 크기 가져오기
  const { titleSize, bodySize } = useFontSizeStore();

  return (
    <article className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/50 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group">
      {/* 썸네일 이미지 - 클릭 시 원문으로 이동 */}
      <a
        href={news.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative h-40 w-full overflow-hidden bg-gray-100 dark:bg-gray-700 block"
      >
        {news.thumbnail ? (
          <Image
            src={news.thumbnail}
            alt={news.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          // 썸네일이 없는 경우 플레이스홀더
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
            <span className="text-5xl">{getCategoryIcon(news.category)}</span>
          </div>
        )}

        {/* 카테고리 배지 */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${getCategoryStyle(news.category)}`}
          >
            <span>{getCategoryIcon(news.category)}</span>
            {getCategoryLabel(news.category)}
          </span>
        </div>

        {/* 외부 링크 아이콘 */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="inline-flex items-center justify-center w-8 h-8 bg-black/50 rounded-full backdrop-blur-sm">
            <svg
              className="w-4 h-4 text-white"
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
          </span>
        </div>
      </a>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 p-4 flex flex-col">
        {/* 메타 정보: 언론사 + 시간 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {news.publishedAt} · {news.source}
          </span>
        </div>

        {/* 제목 - 클릭 시 원문으로 이동 */}
        <a href={news.url} target="_blank" rel="noopener noreferrer">
          <h2
            className={`${FONT_SIZE_MAP.card.title[titleSize]} font-bold text-gray-900 dark:text-white mb-2 leading-snug line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors`}
          >
            {news.title}
          </h2>
        </a>

        {/* 종목 태그 (종목 뉴스인 경우) */}
        {news.stockCode && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
              {news.stockName || news.stockCode}
            </span>
          </div>
        )}

        {/* 요약 (있는 경우) */}
        {news.description && (
          <p
            className={`${FONT_SIZE_MAP.card.body[bodySize]} text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 flex-1`}
          >
            {news.description}
          </p>
        )}

        {/* 푸터: 원문 보기 링크 */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 dark:border-gray-700">
          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
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

          {/* 언론사 로고/이름 */}
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            {news.source}
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * 간소화된 뉴스 카드 (리스트 뷰용)
 *
 * 썸네일 없이 제목과 메타 정보만 표시합니다.
 */
interface CrawledNewsListItemProps {
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

      {/* 외부 링크 아이콘 */}
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
