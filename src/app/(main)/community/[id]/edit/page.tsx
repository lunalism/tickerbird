// 커뮤니티 게시글 수정 페이지 (클라이언트 컴포넌트)
// 비로그인 또는 본인 아닌 경우 /community로 리다이렉트합니다.
// 기존 데이터를 /api/posts/[id]에서 페칭하여 PostForm에 주입합니다.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import PostForm, {
  type PostFormValues,
} from "@/components/community/PostForm";
import type { Post, PostWithAuthor } from "@/types/community";

export default function CommunityEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params.id;
  const { user, isLoading: authLoading } = useAuth();

  const [initialData, setInitialData] = useState<PostFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 게시글 페칭 + 본인 검증
  const fetchPost = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // 수정 페이지 진입 시 조회수가 증가하지 않도록 no_view=true 전달
      const res = await fetch(`/api/posts/${postId}?no_view=true`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        throw new Error("게시글을 찾을 수 없습니다");
      }
      if (!res.ok) {
        throw new Error("게시글을 불러오지 못했습니다");
      }
      const data: { post: PostWithAuthor } = await res.json();

      // 본인 게시글이 아니면 목록으로 리다이렉트
      if (!user || user.id !== data.post.user_id) {
        router.replace("/community");
        return;
      }

      setInitialData({ title: data.post.title, content: data.post.content });
    } catch (err) {
      console.error("게시글 조회 실패:", err);
      setLoadError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
    } finally {
      setIsLoading(false);
    }
  }, [postId, router, user]);

  // 인증 로딩 종료 후 처리: 비로그인이면 즉시 리다이렉트, 로그인 상태면 페칭
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/community");
      return;
    }
    if (postId) {
      fetchPost();
    }
  }, [authLoading, user, postId, fetchPost, router]);

  // 게시글 수정 제출 핸들러
  const handleSubmit = async (values: PostFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errBody: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? "수정 실패");
      }
      const data: { post: Post } = await res.json();
      router.push(`/community/${data.post.id}`);
    } catch (err) {
      console.error("게시글 수정 실패:", err);
      setSubmitError(err instanceof Error ? err.message : "수정 실패");
      setIsSubmitting(false);
    }
  };

  // 로딩 / 에러 / 정상 분기
  if (authLoading || isLoading || !initialData) {
    if (loadError) {
      return (
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-destructive"
          >
            {loadError}
          </div>
        </div>
      );
    }
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 text-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          게시글 수정
        </h1>
      </header>

      {submitError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
        >
          {submitError}
        </p>
      )}

      <PostForm
        initialData={initialData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="수정 완료"
      />
    </div>
  );
}
