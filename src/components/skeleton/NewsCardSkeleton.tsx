/**
 * NewsCardSkeleton 컴포넌트
 *
 * 뉴스 카드 로딩 스켈레톤입니다.
 * NewsCard 컴포넌트와 동일한 레이아웃을 가집니다.
 *
 * 구조:
 * - 이미지 영역 (16:9 비율)
 * - 출처 + 시간 영역
 * - 제목 (2줄)
 * - 태그 영역
 * - 요약 (3줄)
 * - 좋아요/댓글/조회수 영역
 */

import { Skeleton } from './Skeleton';

export function NewsCardSkeleton() {
  return (
    <article className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full">
      {/* 썸네일 이미지 영역 (16:9 비율) */}
      <div className="relative aspect-video overflow-hidden">
        <Skeleton className="w-full h-full" rounded="none" />
        {/* 카테고리 배지 플레이스홀더 */}
        <div className="absolute top-3 left-3">
          <Skeleton width={70} height={24} rounded="full" />
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 p-4 flex flex-col">
        {/* 메타 정보 (출처 + 시간) */}
        <div className="flex items-center gap-2 mb-2">
          <Skeleton width={120} height={12} rounded="md" />
        </div>

        {/* 제목 (2줄) */}
        <div className="mb-2 space-y-2">
          <Skeleton className="w-full" height={20} rounded="md" />
          <Skeleton className="w-3/4" height={20} rounded="md" />
        </div>

        {/* 태그 영역 */}
        <div className="flex items-center gap-2 mb-2">
          <Skeleton width={50} height={14} rounded="md" />
          <Skeleton width={60} height={14} rounded="md" />
        </div>

        {/* 요약 (3줄) */}
        <div className="flex-1 space-y-2 mb-4">
          <Skeleton className="w-full" height={14} rounded="md" />
          <Skeleton className="w-full" height={14} rounded="md" />
          <Skeleton className="w-2/3" height={14} rounded="md" />
        </div>

        {/* 푸터 (좋아요, 댓글, 조회수, 북마크) */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {/* 좋아요 */}
            <Skeleton width={40} height={16} rounded="md" />
            {/* 댓글 */}
            <Skeleton width={35} height={16} rounded="md" />
            {/* 조회수 */}
            <Skeleton width={50} height={16} rounded="md" />
          </div>
          {/* 북마크 아이콘 */}
          <Skeleton width={16} height={16} rounded="md" />
        </div>
      </div>
    </article>
  );
}

/**
 * NewsCardSkeletonGrid 컴포넌트
 *
 * 여러 개의 뉴스 카드 스켈레톤을 그리드로 표시합니다.
 *
 * @param count - 표시할 스켈레톤 개수 (기본: 8)
 */
interface NewsCardSkeletonGridProps {
  count?: number;
}

export function NewsCardSkeletonGrid({ count = 8 }: NewsCardSkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-5 2xl:grid-cols-4 2xl:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <NewsCardSkeleton key={index} />
      ))}
    </div>
  );
}
