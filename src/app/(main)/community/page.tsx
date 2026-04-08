// 커뮤니티 게시글 목록 페이지 (클라이언트 컴포넌트)
// /api/posts에서 페이지네이션된 게시글을 가져와 카드 리스트로 표시합니다.

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import PostCard from "@/components/community/PostCard";
import PostListSkeleton from "@/components/community/PostListSkeleton";
import type { PostWithAuthor } from "@/types/community";

/** 한 페이지 당 게시글 수 */
const PAGE_SIZE = 20;

/** /api/posts 응답 형태 */
interface PostsResponse {
  posts: PostWithAuthor[];
  total: number;
  page: number;
}

export default function CommunityPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 게시글 목록 조회
  const fetchPosts = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/posts?page=${targetPage}&limit=${PAGE_SIZE}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        throw new Error("게시글을 불러오지 못했습니다");
      }
      const data: PostsResponse = await res.json();
      setPosts(data.posts);
      setTotal(data.total);
    } catch (err) {
      console.error("커뮤니티 목록 조회 실패:", err);
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 페이지 변경 시 재조회
  useEffect(() => {
    fetchPosts(page);
  }, [page, fetchPosts]);

  // 글쓰기 버튼 클릭: 비로그인 시 /login으로 이동
  const handleWriteClick = () => {
    if (isLoggedIn) {
      router.push("/community/write");
    } else {
      router.push("/login");
    }
  };

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      {/* 헤더: 타이틀 + 글쓰기 버튼 */}
      <header className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          커뮤니티
        </h1>

        {/* 인증 로딩 중에는 버튼 숨김, 로그인 시에만 표시 */}
        {!authLoading && isLoggedIn && (
          <Button
            variant="default"
            size="default"
            onClick={handleWriteClick}
            aria-label="글쓰기"
          >
            <PenSquare aria-hidden="true" />
            <span>글쓰기</span>
          </Button>
        )}
      </header>

      {/* 본문: 로딩 / 에러 / 빈 상태 / 목록 */}
      {isLoading ? (
        <PostListSkeleton />
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center"
        >
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => fetchPosts(page)}
          >
            다시 시도
          </Button>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            아직 게시글이 없습니다.
          </p>
          {!authLoading && !isLoggedIn && (
            <p className="mt-2 text-xs text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                로그인
              </Link>
              하고 첫 글을 작성해보세요.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </ul>
      )}

      {/* 페이지네이션 (목록이 있을 때만) */}
      {!isLoading && !error && posts.length > 0 && (
        <nav
          className="mt-6 flex items-center justify-center gap-2"
          aria-label="페이지네이션"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="이전 페이지"
          >
            <ChevronLeft aria-hidden="true" />
            <span>이전</span>
          </Button>
          <span
            className="min-w-[5rem] text-center text-sm tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="다음 페이지"
          >
            <span>다음</span>
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}
