/**
 * GlossaryCardSkeleton 컴포넌트
 *
 * 용어사전 카드 로딩 스켈레톤입니다.
 * GlossaryCard 컴포넌트와 동일한 레이아웃을 가집니다.
 *
 * 구조:
 * - 카테고리 아이콘
 * - 약어
 * - 전체명
 * - 한글명
 * - 확장 아이콘
 */

import { Skeleton } from './Skeleton';

export function GlossaryCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* 카드 헤더 */}
      <div className="p-4 flex items-start gap-3">
        {/* 카테고리 아이콘 */}
        <Skeleton width={40} height={40} rounded="xl" className="flex-shrink-0" />

        {/* 용어 정보 */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* 약어 + 카테고리 뱃지 */}
          <div className="flex items-center gap-2">
            <Skeleton width={50} height={20} rounded="md" />
            <Skeleton width={60} height={18} rounded="full" />
          </div>

          {/* 영문 전체명 */}
          <Skeleton className="w-3/4" height={14} rounded="md" />

          {/* 한글명 */}
          <Skeleton className="w-1/2" height={18} rounded="md" />
        </div>

        {/* 확장 아이콘 */}
        <Skeleton width={20} height={20} rounded="md" className="flex-shrink-0" />
      </div>
    </div>
  );
}

/**
 * GlossaryCardSkeletonGrid 컴포넌트
 *
 * 여러 개의 용어사전 카드 스켈레톤을 그리드로 표시합니다.
 *
 * @param count - 표시할 스켈레톤 개수 (기본: 6)
 */
interface GlossaryCardSkeletonGridProps {
  count?: number;
}

export function GlossaryCardSkeletonGrid({ count = 6 }: GlossaryCardSkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <GlossaryCardSkeleton key={index} />
      ))}
    </div>
  );
}
