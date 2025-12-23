/**
 * EventCardSkeleton 컴포넌트
 *
 * 캘린더 이벤트 카드 로딩 스켈레톤입니다.
 * MobileEventCard 컴포넌트와 동일한 레이아웃을 가집니다.
 *
 * 구조:
 * - 날짜 (일 + 요일)
 * - 로고/플래그
 * - 이벤트명
 * - 설명
 * - 시간
 */

import { Skeleton, SkeletonCircle } from './Skeleton';

export function EventCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex gap-4">
        {/* 날짜 영역 */}
        <div className="flex-shrink-0 w-12 text-center">
          {/* 일 */}
          <Skeleton width={32} height={28} rounded="md" className="mx-auto mb-1" />
          {/* 요일 */}
          <Skeleton width={24} height={14} rounded="md" className="mx-auto" />
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            {/* 로고/플래그 */}
            <SkeletonCircle size={36} />

            {/* 이벤트 정보 */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* 이벤트 카테고리 + 중요도 */}
              <div className="flex items-center gap-2">
                <Skeleton width={60} height={18} rounded="full" />
                <Skeleton width={40} height={18} rounded="full" />
              </div>

              {/* 이벤트명 */}
              <Skeleton className="w-full" height={18} rounded="md" />
              <Skeleton className="w-3/4" height={18} rounded="md" />

              {/* 설명 */}
              <Skeleton className="w-full" height={14} rounded="md" />

              {/* 시간 */}
              <div className="flex items-center gap-2 pt-1">
                <Skeleton width={14} height={14} rounded="md" />
                <Skeleton width={80} height={12} rounded="md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * EventCardSkeletonList 컴포넌트
 *
 * 여러 개의 이벤트 카드 스켈레톤을 리스트로 표시합니다.
 *
 * @param count - 표시할 스켈레톤 개수 (기본: 5)
 */
interface EventCardSkeletonListProps {
  count?: number;
}

export function EventCardSkeletonList({ count = 5 }: EventCardSkeletonListProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <EventCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * EventDetailPanelSkeleton 컴포넌트
 *
 * 데스크톱 이벤트 상세 패널 스켈레톤입니다.
 */
export function EventDetailPanelSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 sticky top-6">
      {/* 날짜 헤더 */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
        <Skeleton width={100} height={24} rounded="md" />
        <Skeleton width={60} height={20} rounded="full" />
      </div>

      {/* 이벤트 목록 */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex gap-3">
            <SkeletonCircle size={32} />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-full" height={16} rounded="md" />
              <Skeleton className="w-2/3" height={14} rounded="md" />
              <Skeleton width={60} height={12} rounded="md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
