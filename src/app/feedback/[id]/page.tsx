'use client';

/**
 * 피드백 상세 페이지
 *
 * 피드백의 상세 내용과 댓글을 볼 수 있는 페이지입니다.
 *
 * ============================================================
 * 기능:
 * ============================================================
 * - 피드백 상세 정보 표시
 * - 운영진 답변 표시
 * - 공감(좋아요) 기능
 * - 댓글 목록 및 작성
 * - 본인 글 삭제 기능
 */

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAdmin } from '@/hooks/useAdmin';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { UserAvatar } from '@/components/common';
import {
  Feedback,
  FeedbackComment,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUS,
  FeedbackApiResponse,
} from '@/types/feedback';
import { toast } from 'sonner';

// ============================================
// 댓글 컴포넌트
// ============================================

interface CommentItemProps {
  comment: FeedbackComment;
}

function CommentItem({ comment }: CommentItemProps) {
  const formatDate = (dateStr: string) => {
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
    <div className={`flex gap-3 p-4 rounded-xl ${comment.isAdmin ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
      {/* 아바타 */}
      <UserAvatar
        photoURL={comment.userPhoto}
        name={comment.userName}
        size="sm"
      />

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {comment.isAdmin && (
            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">
              운영진
            </span>
          )}
          <span className="font-medium text-gray-900 dark:text-white">
            {comment.userName}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(comment.createdAt)}
          </span>
        </div>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

// ============================================
// 메인 컴포넌트
// ============================================

export default function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, userProfile, isLoggedIn } = useAuth();
  const { isAdmin } = useAdmin();

  // 데이터 상태
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 댓글 입력 상태
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // 삭제 확인 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ========================================
  // 피드백 로드
  // ========================================
  const loadFeedback = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const headers: Record<string, string> = {};
      if (user?.uid) {
        headers['x-user-id'] = user.uid;
        headers['x-is-admin'] = isAdmin ? 'true' : 'false';
      }

      const res = await fetch(`/api/feedback/${id}`, { headers });
      const data: FeedbackApiResponse<Feedback> = await res.json();

      if (data.success && data.data) {
        setFeedback(data.data);
      } else {
        setError(data.error || '피드백을 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error('[FeedbackDetailPage] 로드 에러:', err);
      setError('서버 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [id, user?.uid, isAdmin]);

  // ========================================
  // 댓글 로드
  // ========================================
  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/feedback/${id}/comments`);
      const data: FeedbackApiResponse<FeedbackComment[]> = await res.json();

      if (data.success && data.data) {
        setComments(data.data);
      }
    } catch (err) {
      console.error('[FeedbackDetailPage] 댓글 로드 에러:', err);
    }
  }, [id]);

  // 초기 로드
  useEffect(() => {
    loadFeedback();
    loadComments();
  }, [loadFeedback, loadComments]);

  // ========================================
  // 공감 토글
  // ========================================
  const handleLike = async () => {
    if (!user?.uid) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      const res = await fetch(`/api/feedback/${id}/like`, {
        method: 'POST',
        headers: {
          'x-user-id': user.uid,
        },
      });

      const data: FeedbackApiResponse<{ liked: boolean; likeCount: number }> =
        await res.json();

      if (data.success && data.data && feedback) {
        setFeedback({
          ...feedback,
          isLiked: data.data.liked,
          likeCount: data.data.likeCount,
        });
      }
    } catch (err) {
      console.error('[FeedbackDetailPage] 공감 에러:', err);
      toast.error('공감에 실패했습니다.');
    }
  };

  // ========================================
  // 댓글 작성
  // ========================================
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (!newComment.trim()) {
      toast.error('댓글 내용을 입력해주세요.');
      return;
    }

    setIsSubmittingComment(true);

    try {
      const res = await fetch(`/api/feedback/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
          'x-user-email': encodeURIComponent(user.email || ''),
          'x-user-name': encodeURIComponent(
            userProfile?.nickname || userProfile?.displayName || '사용자'
          ),
          'x-user-photo': encodeURIComponent(userProfile?.avatarUrl || ''),
          'x-is-admin': isAdmin ? 'true' : 'false',
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      const data: FeedbackApiResponse<FeedbackComment> = await res.json();

      if (data.success && data.data) {
        setComments((prev) => [...prev, data.data!]);
        setNewComment('');
        // commentCount 업데이트
        if (feedback) {
          setFeedback({ ...feedback, commentCount: feedback.commentCount + 1 });
        }
        toast.success('댓글이 등록되었습니다.');
      } else {
        toast.error(data.error || '댓글 등록에 실패했습니다.');
      }
    } catch (err) {
      console.error('[FeedbackDetailPage] 댓글 작성 에러:', err);
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // ========================================
  // 피드백 삭제
  // ========================================
  const handleDelete = async () => {
    if (!user?.uid) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.uid,
          'x-is-admin': isAdmin ? 'true' : 'false',
        },
      });

      const data: FeedbackApiResponse<{ deleted: boolean }> = await res.json();

      if (data.success) {
        toast.success('피드백이 삭제되었습니다.');
        router.push('/feedback');
      } else {
        toast.error(data.error || '삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('[FeedbackDetailPage] 삭제 에러:', err);
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ========================================
  // 로딩/에러 상태
  // ========================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar activeMenu="feedback" />
        <main className="md:ml-[72px] lg:ml-60 pb-20 md:pb-8">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </main>
        <BottomNav activeMenu="feedback" />
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar activeMenu="feedback" />
        <main className="md:ml-[72px] lg:ml-60 pb-20 md:pb-8">
          <div className="max-w-3xl mx-auto px-4 py-6 text-center">
            <p className="text-red-500 mb-4">{error || '피드백을 찾을 수 없습니다.'}</p>
            <Link
              href="/feedback"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </main>
        <BottomNav activeMenu="feedback" />
      </div>
    );
  }

  const category = FEEDBACK_CATEGORIES[feedback.category];
  const status = FEEDBACK_STATUS[feedback.status];

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 본인 글인지 확인
  const isOwner = user?.uid === feedback.userId;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar activeMenu="feedback" />

      <main className="md:ml-[72px] lg:ml-60 pb-20 md:pb-8">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* 뒤로가기 */}
          <Link
            href="/feedback"
            className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>목록으로</span>
          </Link>

          {/* 피드백 상세 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
            {/* 상단: 카테고리 + 상태 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${category.bgColor} ${category.color}`}>
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}>
                  {status.label}
                </span>
                {feedback.isPrivate && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    🔒 비공개
                  </span>
                )}
              </div>

              {/* 삭제 버튼 (본인/관리자) */}
              {(isOwner || isAdmin) && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="삭제"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* 제목 */}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {feedback.title}
            </h1>

            {/* 작성자 정보 */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
              <UserAvatar
                photoURL={feedback.userPhoto}
                name={feedback.userName}
                size="sm"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {feedback.userName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(feedback.createdAt)}
                </p>
              </div>
            </div>

            {/* 내용 */}
            <div className="prose dark:prose-invert max-w-none mb-6">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {feedback.content}
              </p>
            </div>

            {/* 공감 버튼 */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                공감 {feedback.likeCount}개
              </div>
              <button
                onClick={handleLike}
                disabled={!isLoggedIn}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  feedback.isLiked
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                👍 {feedback.isLiked ? '공감 취소' : '공감하기'}
              </button>
            </div>
          </div>

          {/* 운영진 답변 */}
          {feedback.adminResponse && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📢</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  운영진 답변
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">
                {feedback.adminResponse}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                - {feedback.adminResponderName || '운영팀'}
                {feedback.adminRespondedAt && (
                  <span className="ml-2">
                    · {formatDate(feedback.adminRespondedAt)}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* 댓글 섹션 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
              💬 댓글 {comments.length}개
            </h2>

            {/* 댓글 목록 */}
            {comments.length > 0 ? (
              <div className="space-y-3 mb-6">
                {comments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                아직 댓글이 없습니다.
              </p>
            )}

            {/* 댓글 입력 */}
            {isLoggedIn ? (
              <form onSubmit={handleSubmitComment} className="mt-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  rows={3}
                  maxLength={1000}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingComment ? '등록 중...' : '등록'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <Link
                  href="/login"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  로그인하여 댓글 작성하기
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav activeMenu="feedback" />

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              피드백 삭제
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              정말 이 피드백을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
