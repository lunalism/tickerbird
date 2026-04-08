// 게시글 목록 로딩 스켈레톤
// Tailwind animate-pulse로 카드 형태의 플레이스홀더를 표시합니다.

interface PostListSkeletonProps {
  /** 표시할 스켈레톤 카드 개수 (기본 6개) */
  count?: number;
}

export default function PostListSkeleton({ count = 6 }: PostListSkeletonProps) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="animate-pulse p-4 sm:p-5">
          {/* 제목 라인 */}
          <div className="h-4 w-3/4 rounded bg-muted" />
          {/* 본문 미리보기 2줄 */}
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-5/6 rounded bg-muted" />
          </div>
          {/* 메타 정보 (작성자/시간/카운트) */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
            <div className="ml-auto flex items-center gap-3">
              <div className="h-3 w-10 rounded bg-muted" />
              <div className="h-3 w-10 rounded bg-muted" />
              <div className="h-3 w-10 rounded bg-muted" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
