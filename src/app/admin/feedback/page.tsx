'use client';

/**
 * 관리자 피드백 관리 페이지
 *
 * 모든 피드백을 관리하고 운영진 답변을 작성하는 페이지입니다.
 *
 * ============================================================
 * 기능:
 * ============================================================
 * - 전체 피드백 목록 (비공개 포함)
 * - 상태 변경 (접수됨 → 검토중 → 반영됨/보류)
 * - 운영진 답변 작성
 * - 피드백 삭제
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAdmin } from '@/hooks/useAdmin';
import {
  Feedback,
  FeedbackCategory,
  FeedbackStatus,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUS,
  FeedbackApiResponse,
  FeedbackListResponse,
} from '@/types/feedback';
import { toast } from 'sonner';

// ============================================
// 상수 정의
// ============================================

const CATEGORY_OPTIONS: { value: FeedbackCategory | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'bug', label: '🐛 버그' },
  { value: 'feature', label: '💡 건의' },
  { value: 'complaint', label: '😤 불편' },
  { value: 'praise', label: '💖 칭찬' },
  { value: 'other', label: '📝 기타' },
];

const STATUS_OPTIONS: { value: FeedbackStatus | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'received', label: '접수됨' },
  { value: 'reviewing', label: '검토중' },
  { value: 'resolved', label: '반영됨' },
  { value: 'rejected', label: '보류' },
];

// ============================================
// 피드백 관리 모달
// ============================================

interface ManageModalProps {
  feedback: Feedback;
  onClose: () => void;
  onUpdate: (id: string, updates: { status?: FeedbackStatus; adminResponse?: string }) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
}

function ManageModal({ feedback, onClose, onUpdate, onDelete, isUpdating }: ManageModalProps) {
  const [status, setStatus] = useState<FeedbackStatus>(feedback.status);
  const [adminResponse, setAdminResponse] = useState(feedback.adminResponse || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    const updates: { status?: FeedbackStatus; adminResponse?: string } = {};

    if (status !== feedback.status) {
      updates.status = status;
    }

    if (adminResponse.trim() !== (feedback.adminResponse || '')) {
      updates.adminResponse = adminResponse.trim();
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(feedback.id, updates);
    } else {
      onClose();
    }
  };

  const category = FEEDBACK_CATEGORIES[feedback.category];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            피드백 관리
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 피드백 정보 */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${category.bgColor} ${category.color}`}>
              {category.icon} {category.label}
            </span>
            {feedback.isPrivate && (
              <span className="text-xs text-gray-500">🔒 비공개</span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {feedback.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {feedback.content}
          </p>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {feedback.userName} · {new Date(feedback.createdAt).toLocaleString('ko-KR')}
          </div>
        </div>

        {/* 상태 변경 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            상태
          </label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FEEDBACK_STATUS) as FeedbackStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  status === s
                    ? `${FEEDBACK_STATUS[s].bgColor} ${FEEDBACK_STATUS[s].color} ring-2 ring-offset-2 ring-blue-500`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {FEEDBACK_STATUS[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* 운영진 답변 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            운영진 답변
          </label>
          <textarea
            value={adminResponse}
            onChange={(e) => setAdminResponse(e.target.value)}
            placeholder="사용자에게 전달할 답변을 작성하세요..."
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* 버튼 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            삭제
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isUpdating ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* 삭제 확인 */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm">
              <p className="text-gray-900 dark:text-white mb-4">
                정말 이 피드백을 삭제하시겠습니까?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300"
                >
                  취소
                </button>
                <button
                  onClick={() => onDelete(feedback.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 메인 컴포넌트
// ============================================

export default function AdminFeedbackPage() {
  const { user, userProfile } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();

  // 필터 상태
  const [category, setCategory] = useState<FeedbackCategory | 'all'>('all');
  const [status, setStatus] = useState<FeedbackStatus | 'all'>('all');

  // 데이터 상태
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

  // 모달 상태
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // ========================================
  // 피드백 목록 로드
  // ========================================
  const loadFeedbacks = useCallback(async (reset = false) => {
    if (!user?.uid) return;

    try {
      if (reset) {
        setIsLoading(true);
        setCursor(undefined);
      }

      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (status !== 'all') params.set('status', status);
      params.set('isAdmin', 'true');
      if (!reset && cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/feedback?${params.toString()}`, {
        headers: {
          'x-user-id': user.uid,
        },
      });

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
      console.error('[AdminFeedbackPage] 로드 에러:', error);
    } finally {
      setIsLoading(false);
    }
  }, [category, status, cursor, user?.uid]);

  // 필터 변경 시 다시 로드
  useEffect(() => {
    if (isAdmin) {
      loadFeedbacks(true);
    }
  }, [category, status, isAdmin]);

  // ========================================
  // 피드백 업데이트
  // ========================================
  const handleUpdate = async (
    feedbackId: string,
    updates: { status?: FeedbackStatus; adminResponse?: string }
  ) => {
    if (!user?.uid) return;

    setIsUpdating(true);

    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
          'x-user-name': encodeURIComponent(
            userProfile?.nickname || userProfile?.displayName || '관리자'
          ),
          'x-is-admin': 'true',
        },
        body: JSON.stringify(updates),
      });

      const data: FeedbackApiResponse<Feedback> = await res.json();

      if (data.success && data.data) {
        // 목록 업데이트
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === feedbackId ? data.data! : f))
        );
        setSelectedFeedback(null);
        toast.success('피드백이 업데이트되었습니다.');
      } else {
        toast.error(data.error || '업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('[AdminFeedbackPage] 업데이트 에러:', error);
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // ========================================
  // 피드백 삭제
  // ========================================
  const handleDelete = async (feedbackId: string) => {
    if (!user?.uid) return;

    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.uid,
          'x-is-admin': 'true',
        },
      });

      const data: FeedbackApiResponse<{ deleted: boolean }> = await res.json();

      if (data.success) {
        setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
        setSelectedFeedback(null);
        toast.success('피드백이 삭제되었습니다.');
      } else {
        toast.error(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('[AdminFeedbackPage] 삭제 에러:', error);
      toast.error('서버 오류가 발생했습니다.');
    }
  };

  // ========================================
  // 권한 체크
  // ========================================
  if (adminLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          피드백 관리
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          사용자 피드백을 관리하고 답변합니다.
        </p>
      </div>

      {/* 필터 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          {/* 카테고리 필터 */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              카테고리
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategory | 'all')}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 상태 필터 */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              상태
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FeedbackStatus | 'all')}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 피드백 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            피드백이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {feedbacks.map((feedback) => {
              const cat = FEEDBACK_CATEGORIES[feedback.category];
              const stat = FEEDBACK_STATUS[feedback.status];

              return (
                <div
                  key={feedback.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedFeedback(feedback)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* 배지들 */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cat.bgColor} ${cat.color}`}>
                          {cat.icon} {cat.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stat.bgColor} ${stat.color}`}>
                          {stat.label}
                        </span>
                        {feedback.isPrivate && (
                          <span className="text-xs text-gray-500">🔒</span>
                        )}
                        {feedback.adminResponse && (
                          <span className="text-xs text-blue-500">📢 답변완료</span>
                        )}
                      </div>

                      {/* 제목 */}
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {feedback.title}
                      </h3>

                      {/* 메타 정보 */}
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{feedback.userName}</span>
                        <span>·</span>
                        <span>{new Date(feedback.createdAt).toLocaleDateString('ko-KR')}</span>
                        <span>·</span>
                        <span>👍 {feedback.likeCount}</span>
                        <span>💬 {feedback.commentCount}</span>
                      </div>
                    </div>

                    {/* 관리 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFeedback(feedback);
                      }}
                      className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      관리
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 더 보기 */}
        {hasMore && !isLoading && (
          <div className="p-4 text-center border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => loadFeedbacks(false)}
              className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              더 보기
            </button>
          </div>
        )}
      </div>

      {/* 관리 모달 */}
      {selectedFeedback && (
        <ManageModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          isUpdating={isUpdating}
        />
      )}
    </div>
  );
}
