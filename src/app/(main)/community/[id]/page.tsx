// 커뮤니티 게시글 상세 페이지 (클라이언트 컴포넌트)
// /api/posts/[id]에서 게시글을 가져오고 본문을 DOMPurify로 sanitize 후 렌더합니다.
// 좋아요/댓글/수정/삭제 동작을 포함합니다.

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Eye, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import LikeButton from "@/components/community/LikeButton";
import CommentSection from "@/components/community/CommentSection";
import type { PostWithAuthor } from "@/types/community";

/** 한국어 상대 시간 포맷 */
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function CommunityPostDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params.id;
  const { user } = useAuth();

  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 본문 sanitize 결과 (브라우저에서만 dompurify를 동적 import 하여 SSR 이슈 회피)
  const [sanitizedHtml, setSanitizedHtml] = useState<string>("");

  const [isDeleting, setIsDeleting] = useState(false);

  // 게시글 조회
  const fetchPost = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // sessionStorage 기반 중복 조회수 방지
      // 같은 세션 내 동일 게시글 새로고침 시 view_count가 중복 증가하지 않도록 처리
      // (SSR 환경 또는 sessionStorage 접근 차단 시 안전하게 false 처리)
      const storageKey = `viewed_post_${postId}`;
      let alreadyViewed = false;
      try {
        alreadyViewed = sessionStorage.getItem(storageKey) === "true";
      } catch {
        // 접근 불가 시 무시 (조회수는 증가하는 쪽으로 동작)
      }

      const url = alreadyViewed
        ? `/api/posts/${postId}?no_view=true`
        : `/api/posts/${postId}`;

      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 404) {
        throw new Error("게시글을 찾을 수 없습니다");
      }
      if (!res.ok) {
        throw new Error("게시글을 불러오지 못했습니다");
      }
      const data: { post: PostWithAuthor } = await res.json();
      setPost(data.post);

      // 첫 조회 성공 시에만 마킹 (이후 새로고침은 no_view=true 분기)
      if (!alreadyViewed) {
        try {
          sessionStorage.setItem(storageKey, "true");
        } catch {
          // 접근 불가 시 무시
        }
      }
    } catch (err) {
      console.error("게시글 조회 실패:", err);
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) fetchPost();
  }, [postId, fetchPost]);

  // 본문이 갱신되면 dompurify 동적 import 후 sanitize (브라우저 환경 보장)
  useEffect(() => {
    if (!post?.content) {
      setSanitizedHtml("");
      return;
    }
    let cancelled = false;
    void import("dompurify").then((mod) => {
      if (cancelled) return;
      setSanitizedHtml(mod.default.sanitize(post.content));
    });
    return () => {
      cancelled = true;
    };
  }, [post?.content]);

  // 삭제 처리
  const handleDelete = async () => {
    if (!post) return;
    if (!window.confirm("이 게시글을 삭제하시겠습니까?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) {
        const errBody: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? "삭제 실패");
      }
      router.push("/community");
    } catch (err) {
      console.error("게시글 삭제 실패:", err);
      window.alert(err instanceof Error ? err.message : "삭제 실패");
      setIsDeleting(false);
    }
  };

  // 로딩 스켈레톤
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-3/4 rounded bg-muted" />
          <div className="h-3 w-40 rounded bg-muted" />
          <div className="mt-6 h-3 w-full rounded bg-muted" />
          <div className="h-3 w-5/6 rounded bg-muted" />
          <div className="h-3 w-4/6 rounded bg-muted" />
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !post) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center"
        >
          <p className="text-sm text-destructive">
            {error ?? "게시글을 찾을 수 없습니다"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => router.push("/community")}
          >
            목록으로
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = !!user && user.id === post.user_id;
  const authorName = post.author.display_name?.trim() || "알 수 없음";

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      {/* 상단 네비게이션 */}
      <div className="mb-4">
        <Link
          href="/community"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          목록으로
        </Link>
      </div>

      {/* 헤더: 제목 + 메타 */}
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          {post.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{authorName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={post.created_at}>
            {formatRelativeTime(post.created_at)}
          </time>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1" title="조회수">
            <Eye className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums">{post.view_count}</span>
          </span>
        </div>
      </header>

      {/* 본문 (sanitized HTML 렌더) */}
      <div
        className="prose prose-sm dark:prose-invert mt-6 max-w-none whitespace-pre-wrap break-words text-sm text-foreground"
        // sanitizedHtml는 useEffect 안에서 dompurify로 정화된 결과만 들어옵니다.
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />

      {/* 액션 바: 좋아요 + 댓글수 + (본인) 수정/삭제 */}
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <LikeButton
          targetType="post"
          targetId={post.id}
          initialLikeCount={post.like_count}
        />
        <span
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
          title="댓글 수"
        >
          <MessageSquare className="size-4" aria-hidden="true" />
          <span className="tabular-nums">{post.comment_count}</span>
        </span>

        {/* 본인 게시글: 수정/삭제 */}
        {isOwner && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/community/${post.id}/edit`)}
              aria-label="게시글 수정"
            >
              <Pencil aria-hidden="true" />
              <span>수정</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label="게시글 삭제"
            >
              <Trash2 aria-hidden="true" />
              <span>{isDeleting ? "삭제 중..." : "삭제"}</span>
            </Button>
          </div>
        )}
      </div>

      {/* 댓글 섹션 */}
      <CommentSection postId={post.id} />
    </article>
  );
}
