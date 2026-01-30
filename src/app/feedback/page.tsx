'use client';

/**
 * 피드백 목록 페이지
 *
 * 사용자들이 건의사항, 불편사항, 버그 제보 등을 볼 수 있는 페이지입니다.
 *
 * ============================================================
 * 기능:
 * ============================================================
 * - 카테고리별 필터링 (버그, 건의, 불편, 칭찬, 기타)
 * - 상태별 필터링 (접수됨, 검토중, 반영됨, 보류)
 * - 내 피드백만 보기
 * - 공감(좋아요) 기능
 * - 무한 스크롤
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  Feedback,
  FeedbackCategory,
  FeedbackStatus,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUS,
  FeedbackApiResponse,
  FeedbackListResponse,
} from '@/types/feedback';

// ============================================
// 상수 정의
// ============================================

/** 카테고리 필터 옵션 */
const CATEGORY_OPTIONS: { value: FeedbackCategory | 'all'; label: string; icon?: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'bug', label: '버그', icon: '🐛' },
  { value: 'feature', label: '건의', icon: '💡' },
  { value: 'complaint', label: '불편', icon: '😤' },
  { value: 'praise', label: '칭찬', icon: '💖' },
  { value: 'other', label: '기타', icon: '📝' },
];

/** 상태 필터 옵션 */
const STATUS_OPTIONS: { value: FeedbackStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'received', label: '접수됨' },
  { value: 'reviewing', label: '검토중' },
  { value: 'resolved', label: '반영됨' },
  { value: 'rejected', label: '보류' },
];

// ============================================
// 피드백 카드 컴포넌트
// ============================================

interface FeedbackCardProps {
  feedback: Feedback;
  onLike: (id: string) => void;
}

function FeedbackCard({ feedback, onLike }: FeedbackCardProps) {
  const category = FEEDBACK_CATEGORIES[feedback.category];
  const status = FEEDBACK_STATUS[feedback.status];

  // 상대적 시간 포맷
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <Link
      href={`/feedback/${feedback.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
    >
      {/* 상단: 카테고리 + 상태 */}
      <div className="flex items-center gap-2 mb-2">
        {/* 카테고리 배지 */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${category.bgColor} ${category.color}`}>
          <span>{category.icon}</span>
          <span>{category.label}</span>
        </span>

        {/* 상태 배지 */}
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
          {status.label}
        </span>

        {/* 반영됨 체크 아이콘 */}
        {feedback.status === 'resolved' && (
          <span className="text-green-500">✅</span>
        )}

        {/* 비공개 표시 */}
        {feedback.isPrivate && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            🔒 비공개
          </span>
        )}
      </div>

      {/* 제목 */}
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
        {feedback.title}
      </h3>

      {/* 작성자 정보 + 메타 */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span>{feedback.userName}</span>
          <span>·</span>
          <span>{formatRelativeTime(feedback.createdAt)}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* 공감 */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLike(feedback.id);
            }}
            className={`flex items-center gap-1 transition-colors ${
              feedback.isLiked
                ? 'text-blue-600 dark:text-blue-400'
                : 'hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <span>👍</span>
            <span>{feedback.likeCount}</span>
          </button>

          {/* 댓글 */}
          <div className="flex items-center gap-1">
            <span>💬</span>
            <span>{feedback.commentCount}</span>
          </div>
        </div>
      </div>

      {/* 운영진 답변 있음 표시 */}
      {feedback.adminResponse && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
            <span>📢</span>
            <span>운영진 답변 있음</span>
          </span>
        </div>
      )}
    </Link>
  );
}

// ============================================
// 피드백 목록 스켈레톤
// ============================================

function FeedbackSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="w-12 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
      <div className="flex items-center justify-between">
        <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

// ============================================
// 메인 페이지 컴포넌트
// ============================================

export default function FeedbackPage() {
  const { user, isLoggedIn } = useAuth();

  // 필터 상태
  const [category, setCategory] = useState<FeedbackCategory | 'all'>('all');
  const [status, setStatus] = useState<FeedbackStatus | 'all'>('all');
  const [myOnly, setMyOnly] = useState(false);

  // 데이터 상태
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ========================================
  // 피드백 목록 로드
  // ========================================
  const loadFeedbacks = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setCursor(undefined);
      } else {
        setIsLoadingMore(true);
      }

      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (status !== 'all') params.set('status', status);
      if (myOnly) params.set('myOnly', 'true');
      if (!reset && cursor) params.set('cursor', cursor);

      const headers: Record<string, string> = {};
      if (user?.uid) {
        headers['x-user-id'] = user.uid;
      }

      const res = await fetch(`/api/feedback?${params.toString()}`, { headers });
      const data: FeedbackApiResponse<FeedbackListResponse> = await res.json();

      if (data.success && data.data) {
        if (reset) {
          setFeedbacks(data.data.feedbacks);
        } else {
          setFeedbacks((prev) => [...prev, ...data.data!.feedbacks]);
        }
        setHasMore(data.data.hasMore);
        setCursor(data.data.nextCursor);
      }
    } catch (error) {
      console.error('[FeedbackPage] 로드 에러:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [category, status, myOnly, cursor, user?.uid]);

  // 필터 변경 시 목록 다시 로드
  useEffect(() => {
    loadFeedbacks(true);
  }, [category, status, myOnly]);

  // ========================================
  // 공감 토글
  // ========================================
  const handleLike = async (feedbackId: string) => {
    if (!user?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const res = await fetch(`/api/feedback/${feedbackId}/like`, {
        method: 'POST',
        headers: {
          'x-user-id': user.uid,
        },
      });

      const data: FeedbackApiResponse<{ liked: boolean; likeCount: number }> =
        await res.json();

      if (data.success && data.data) {
        // 목록에서 해당 피드백 업데이트
        setFeedbacks((prev) =>
          prev.map((f) =>
            f.id === feedbackId
              ? {
                  ...f,
                  isLiked: data.data!.liked,
                  likeCount: data.data!.likeCount,
                }
              : f
          )
        );
      }
    } catch (error) {
      console.error('[FeedbackPage] 공감 에러:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 사이드바 */}
      <Sidebar activeMenu="feedback" />

      {/* 메인 콘텐츠 */}
      <main className="md:ml-[72px] lg:ml-60 pb-20 md:pb-8">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* 헤더 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>💡</span>
                <span>피드백</span>
              </h1>

              {/* 피드백 작성 버튼 */}
              {isLoggedIn && (
                <Link
                  href="/feedback/write"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                >
                  피드백 작성하기
                </Link>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              서비스 개선을 위한 소중한 의견을 남겨주세요
            </p>
          </div>

          {/* 내 피드백 보기 토글 */}
          {isLoggedIn && (
            <div className="mb-4">
              <button
                onClick={() => setMyOnly(!myOnly)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  myOnly
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                내 피드백
              </button>
            </div>
          )}

          {/* 카테고리 필터 */}
          <div className="mb-4 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCategory(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                {opt.icon && <span className="mr-1">{opt.icon}</span>}
                {opt.label}
              </button>
            ))}
          </div>

          {/* 상태 필터 */}
          <div className="mb-6 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  status === opt.value
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 피드백 목록 */}
          <div className="space-y-4">
            {isLoading ? (
              // 로딩 스켈레톤
              [...Array(5)].map((_, i) => <FeedbackSkeleton key={i} />)
            ) : feedbacks.length === 0 ? (
              // 빈 상태
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p className="text-4xl mb-4">📭</p>
                <p>피드백이 없습니다.</p>
                {isLoggedIn && (
                  <Link
                    href="/feedback/write"
                    className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                  >
                    첫 번째 피드백 작성하기
                  </Link>
                )}
              </div>
            ) : (
              // 피드백 카드 목록
              feedbacks.map((feedback) => (
                <FeedbackCard
                  key={feedback.id}
                  feedback={feedback}
                  onLike={handleLike}
                />
              ))
            )}

            {/* 더 보기 버튼 */}
            {hasMore && !isLoading && (
              <div className="text-center pt-4">
                <button
                  onClick={() => loadFeedbacks(false)}
                  disabled={isLoadingMore}
                  className="px-6 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-gray-700 hover:border-blue-300 transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? '로딩 중...' : '더 보기'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 하단 네비게이션 (모바일) */}
      <BottomNav activeMenu="feedback" />
    </div>
  );
}
