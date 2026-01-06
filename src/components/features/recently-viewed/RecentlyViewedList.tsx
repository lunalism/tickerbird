'use client';

/**
 * 최근 본 종목 목록 컴포넌트
 *
 * @description
 * 사용자가 최근에 방문한 종목들을 카드 형태로 표시합니다.
 * 가로 스크롤 또는 그리드 레이아웃으로 표시할 수 있습니다.
 *
 * @features
 * - 최근 본 종목 카드 리스트 표시
 * - 빈 상태 UI ("아직 본 종목이 없습니다")
 * - 개별 삭제 버튼
 * - 클릭 시 종목 상세 페이지로 이동
 * - 다크 모드 지원
 *
 * @usage
 * ```tsx
 * <RecentlyViewedList />
 * ```
 */

import { useRouter } from 'next/navigation';
import { useRecentlyViewed } from '@/hooks';
import { RecentlyViewedStock, MarketType } from '@/types/recentlyViewed';

// ==================== 헬퍼 함수 ====================

/**
 * 시장별 배지 색상 반환
 */
function getMarketBadgeColor(market: MarketType): string {
  const colors: Record<MarketType, string> = {
    kr: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    us: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    jp: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    hk: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return colors[market] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
}

/**
 * 시장 라벨 반환
 */
function getMarketLabel(market: MarketType): string {
  const labels: Record<MarketType, string> = {
    kr: 'KR',
    us: 'US',
    jp: 'JP',
    hk: 'HK',
  };
  return labels[market] || market.toUpperCase();
}

/**
 * 상대 시간 포맷팅
 * @param dateString ISO 날짜 문자열
 * @returns 상대 시간 문자열 (예: "방금 전", "5분 전", "어제")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  // 7일 이상이면 날짜 표시
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

// ==================== 하위 컴포넌트 ====================

/**
 * 빈 상태 컴포넌트
 */
function EmptyState() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 text-center">
      {/* 아이콘 */}
      <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-7 h-7 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* 안내 텍스트 */}
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        아직 본 종목이 없습니다.
        <br />
        종목을 검색하거나 시장에서 선택해보세요!
      </p>
    </div>
  );
}

/**
 * 로딩 스켈레톤
 */
function LoadingSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[160px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * 종목 카드 컴포넌트
 */
function StockCard({
  stock,
  onRemove,
  onClick,
}: {
  stock: RecentlyViewedStock;
  onRemove: (ticker: string) => void;
  onClick: (stock: RecentlyViewedStock) => void;
}) {
  return (
    <div
      onClick={() => onClick(stock)}
      className="flex-shrink-0 w-[160px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 cursor-pointer hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm transition-all group"
    >
      {/* 상단: 시장 배지 + 삭제 버튼 */}
      <div className="flex items-center justify-between mb-3">
        {/* 시장 배지 */}
        <span
          className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getMarketBadgeColor(stock.market)}`}
        >
          {getMarketLabel(stock.market)}
        </span>

        {/* 삭제 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // 카드 클릭 이벤트 방지
            onRemove(stock.ticker);
          }}
          className="p-1 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          title="삭제"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 종목명 */}
      <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate mb-1">
        {stock.name}
      </h4>

      {/* 티커 */}
      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-2">
        {stock.ticker}
      </p>

      {/* 방문 시간 */}
      <p className="text-[10px] text-gray-400 dark:text-gray-500">
        {formatRelativeTime(stock.viewedAt)}
      </p>
    </div>
  );
}

// ==================== 메인 컴포넌트 ====================

/**
 * 최근 본 종목 목록 컴포넌트
 */
export function RecentlyViewedList() {
  const router = useRouter();
  const { recentlyViewed, isLoaded, removeFromRecentlyViewed, count } = useRecentlyViewed();

  /**
   * 종목 클릭 핸들러
   * 해당 종목의 상세 페이지로 이동
   */
  const handleStockClick = (stock: RecentlyViewedStock) => {
    // 시장에 따라 쿼리 파라미터 설정
    const marketParam = stock.market !== 'kr' ? `?market=${stock.market}` : '';
    router.push(`/market/${stock.ticker}${marketParam}`);
  };

  /**
   * 종목 삭제 핸들러
   */
  const handleRemove = (ticker: string) => {
    removeFromRecentlyViewed(ticker);
  };

  // 로딩 중
  if (!isLoaded) {
    return <LoadingSkeleton />;
  }

  // 데이터 없음
  if (count === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {recentlyViewed.map((stock) => (
        <StockCard
          key={stock.ticker}
          stock={stock}
          onRemove={handleRemove}
          onClick={handleStockClick}
        />
      ))}
    </div>
  );
}
