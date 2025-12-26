/**
 * CrawledNewsCard 컴포넌트
 *
 * 네이버 금융에서 크롤링한 뉴스를 표시하는 카드 컴포넌트입니다.
 * 원문 링크로 직접 이동하도록 설계되어 있습니다.
 *
 * 기능:
 * - 뉴스 제목 및 요약 표시
 * - 언론사 및 발행 시간 표시
 * - 썸네일 이미지 (있는 경우) - object-contain으로 전체 이미지 표시
 * - 카테고리별 배지 (속보/시장/종목/해외/채권)
 * - 원문 링크 연결
 *
 * @example
 * ```tsx
 * <CrawledNewsCard news={newsItem} />
 * ```
 */

"use client";

import Image from "next/image";
import type { CrawledNewsItem, CrawledNewsCategory } from "@/types/crawled-news";
import { useFontSizeStore, FONT_SIZE_MAP } from "@/stores";

interface CrawledNewsCardProps {
  /** 뉴스 아이템 데이터 */
  news: CrawledNewsItem;
}

/**
 * 카테고리별 배지 스타일을 반환합니다.
 *
 * 각 카테고리에 맞는 배경색과 텍스트 색상을 제공합니다.
 * 라이트/다크 모드 모두 지원합니다.
 *
 * @param category - 뉴스 카테고리
 * @returns Tailwind CSS 클래스 문자열
 *
 * 카테고리별 색상:
 * - headlines (속보): 빨간색 - 긴급하고 중요한 뉴스
 * - market (시장): 파란색 - 시장 동향 뉴스
 * - stock (종목): 초록색 - 개별 종목 뉴스
 * - world (해외): 보라색 - 해외 증시 뉴스
 * - bond (채권): 주황색 - 채권/외환 뉴스
 */
function getCategoryStyle(category: CrawledNewsCategory): string {
  const styles: Record<CrawledNewsCategory, string> = {
    // 속보: 빨간색 배경 - 주의를 끄는 색상
    headlines: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    // 시장: 파란색 배경 - 안정적이고 신뢰감 있는 색상
    market: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    // 종목: 초록색 배경 - 성장과 투자를 연상시키는 색상
    stock: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    // 해외: 보라색 배경 - 글로벌하고 다양성을 나타내는 색상
    world: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    // 채권: 주황색 배경 - 안전자산을 나타내는 따뜻한 색상
    bond: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };
  return styles[category] || styles.headlines;
}

/**
 * 카테고리별 한글 라벨을 반환합니다.
 *
 * @param category - 뉴스 카테고리
 * @returns 카테고리 한글 라벨
 *
 * 라벨 매핑:
 * - headlines → "속보"
 * - market → "시장"
 * - stock → "종목"
 * - world → "해외"
 * - bond → "채권"
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
 * 카테고리별 이모지 아이콘을 반환합니다.
 *
 * @param category - 뉴스 카테고리
 * @returns 카테고리 이모지
 *
 * 아이콘 매핑:
 * - headlines → 🔥 (불꽃 - 핫한 뉴스)
 * - market → 📈 (상승 차트 - 시장 동향)
 * - stock → 📊 (막대 차트 - 종목 분석)
 * - world → 🌍 (지구 - 글로벌 뉴스)
 * - bond → 💱 (환전 - 채권/외환)
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

/**
 * 뉴스 카드 컴포넌트
 *
 * 크롤링된 뉴스를 카드 형태로 표시합니다.
 * 썸네일, 제목, 요약, 메타 정보를 포함합니다.
 */
export function CrawledNewsCard({ news }: CrawledNewsCardProps) {
  // 사용자 설정 폰트 크기 가져오기 (접근성 지원)
  const { titleSize, bodySize } = useFontSizeStore();

  return (
    <article className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/50 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group">
      {/*
       * ========================================
       * 썸네일 영역
       * ========================================
       * - 고정 높이 (h-44 = 176px)로 모든 카드 동일한 크기 유지
       * - object-contain 사용하여 이미지 전체가 보이도록 함
       * - 이미지가 없는 경우 카테고리 아이콘 플레이스홀더 표시
       * - 클릭 시 원문 기사로 새 탭에서 이동
       */}
      <a
        href={news.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative h-44 w-full overflow-hidden bg-gray-50 dark:bg-gray-900 block"
      >
        {news.thumbnail ? (
          /*
           * 썸네일 이미지
           * - object-contain: 이미지 비율을 유지하면서 전체가 보이도록 축소
           * - 이미지가 컨테이너보다 작으면 중앙에 배치됨
           * - 호버 시 살짝 확대되는 효과 (scale-105)
           */
          <Image
            src={news.thumbnail}
            alt={news.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
            className="object-contain group-hover:scale-105 transition-transform duration-300"
            unoptimized // 외부 이미지이므로 Next.js 최적화 비활성화
          />
        ) : (
          /*
           * 썸네일이 없는 경우 플레이스홀더
           * - 그라데이션 배경으로 시각적 일관성 유지
           * - 카테고리에 맞는 이모지 아이콘 표시
           */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            <span className="text-5xl opacity-50">{getCategoryIcon(news.category)}</span>
          </div>
        )}

        {/*
         * ========================================
         * 카테고리 배지 (좌측 상단)
         * ========================================
         * - 카테고리별로 다른 색상과 라벨 표시
         * - backdrop-blur로 배경 흐림 효과 적용
         * - 이모지 아이콘 + 텍스트 조합
         *
         * 카테고리별 표시:
         * - headlines: 🔥 속보 (빨간색)
         * - market: 📈 시장 (파란색)
         * - stock: 📊 종목 (초록색)
         * - world: 🌍 해외 (보라색)
         * - bond: 💱 채권 (주황색)
         */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${getCategoryStyle(news.category)}`}
          >
            <span>{getCategoryIcon(news.category)}</span>
            {getCategoryLabel(news.category)}
          </span>
        </div>

        {/*
         * 외부 링크 아이콘 (우측 상단)
         * - 호버 시에만 표시되어 클릭 가능함을 암시
         * - 반투명 검정 배경으로 가독성 확보
         */}
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

      {/*
       * ========================================
       * 콘텐츠 영역
       * ========================================
       * - 메타 정보 (시간, 언론사)
       * - 뉴스 제목
       * - 종목 태그 (해당 시)
       * - 요약문
       * - 푸터 (원문 링크, 언론사)
       */}
      <div className="flex-1 p-4 flex flex-col">
        {/* 메타 정보: 발행 시간 + 언론사 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {news.publishedAt} · {news.source}
          </span>
        </div>

        {/* 뉴스 제목 - 2줄까지 표시, 클릭 시 원문 이동 */}
        <a href={news.url} target="_blank" rel="noopener noreferrer">
          <h2
            className={`${FONT_SIZE_MAP.card.title[titleSize]} font-bold text-gray-900 dark:text-white mb-2 leading-snug line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors`}
          >
            {news.title}
          </h2>
        </a>

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
  );
}

/**
 * 간소화된 뉴스 리스트 아이템 컴포넌트
 *
 * 썸네일 없이 제목과 메타 정보만 표시합니다.
 * 사이드바나 작은 공간에서 뉴스 목록을 표시할 때 사용합니다.
 *
 * @example
 * ```tsx
 * <CrawledNewsListItem news={newsItem} />
 * ```
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
