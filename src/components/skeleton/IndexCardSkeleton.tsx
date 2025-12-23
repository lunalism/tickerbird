/**
 * IndexCardSkeleton 컴포넌트
 *
 * 지수 카드 로딩 스켈레톤입니다.
 * IndexCard 컴포넌트와 동일한 레이아웃을 가집니다.
 *
 * 구조:
 * - 지수명
 * - 가격 (큰 텍스트)
 * - 미니 차트 영역
 * - 등락률
 */

import { Skeleton } from './Skeleton';

export function IndexCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
      {/* 상단: 지수명 + 가격 | 미니 차트 */}
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          {/* 지수 이름 */}
          <Skeleton width={80} height={14} rounded="md" />
          {/* 현재 가격 (큰 텍스트) */}
          <Skeleton width={120} height={28} rounded="md" />
        </div>
        {/* 미니 차트 영역 */}
        <Skeleton width={80} height={40} rounded="lg" />
      </div>

      {/* 하단: 변동 정보 */}
      <div className="flex items-center gap-2">
        {/* 변동 금액 */}
        <Skeleton width={60} height={16} rounded="md" />
        {/* 변동률 배지 */}
        <Skeleton width={55} height={20} rounded="full" />
      </div>
    </div>
  );
}

/**
 * IndexCardSkeletonGrid 컴포넌트
 *
 * 여러 개의 지수 카드 스켈레톤을 그리드로 표시합니다.
 *
 * @param count - 표시할 스켈레톤 개수 (기본: 4)
 */
interface IndexCardSkeletonGridProps {
  count?: number;
}

export function IndexCardSkeletonGrid({ count = 4 }: IndexCardSkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <IndexCardSkeleton key={index} />
      ))}
    </div>
  );
}
