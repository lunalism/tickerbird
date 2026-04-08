// 커뮤니티 게시글 카드 컴포넌트
// 목록에서 한 게시글을 카드 형태로 표시합니다.

import Link from "next/link";
import { Eye, Heart, MessageSquare, Pin } from "lucide-react";
import type { PostWithAuthor } from "@/types/community";

interface PostCardProps {
  post: PostWithAuthor;
}

/**
 * 작성 시간을 한국어 상대 시간으로 변환합니다.
 * 예: "방금 전", "3분 전", "2시간 전", "5일 전"
 */
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  // 일주일 이상이면 날짜로 표시
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function PostCard({ post }: PostCardProps) {
  const authorName = post.author.display_name?.trim() || "알 수 없음";

  return (
    <li className="transition-colors hover:bg-muted/40">
      <Link
        href={`/community/${post.id}`}
        className="block p-4 outline-none focus-visible:bg-muted/40 sm:p-5"
      >
        {/* 제목 (고정 글이면 핀 아이콘) */}
        <div className="flex items-start gap-2">
          {post.is_pinned && (
            <Pin
              aria-label="고정된 게시글"
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
          )}
          <h3 className="line-clamp-1 flex-1 text-base font-semibold text-foreground">
            {post.title}
          </h3>
        </div>

        {/* 본문 미리보기 (2줄 말줄임) */}
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {post.content}
        </p>

        {/* 메타 정보: 작성자 · 시간 · 카운트 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{authorName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={post.created_at}>
            {formatRelativeTime(post.created_at)}
          </time>

          {/* 카운트 그룹 (오른쪽 정렬) */}
          <div className="ml-auto flex items-center gap-3">
            <span className="inline-flex items-center gap-1" title="조회수">
              <Eye className="size-3.5" aria-hidden="true" />
              <span className="tabular-nums">{post.view_count}</span>
            </span>
            <span className="inline-flex items-center gap-1" title="좋아요">
              <Heart className="size-3.5" aria-hidden="true" />
              <span className="tabular-nums">{post.like_count}</span>
            </span>
            <span className="inline-flex items-center gap-1" title="댓글">
              <MessageSquare className="size-3.5" aria-hidden="true" />
              <span className="tabular-nums">{post.comment_count}</span>
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}
