'use client';

/**
 * 피드백 작성 페이지
 *
 * 사용자가 새 피드백을 작성하는 페이지입니다.
 *
 * ============================================================
 * 기능:
 * ============================================================
 * - 카테고리 선택 (버그, 건의, 불편, 칭찬, 기타)
 * - 제목 입력 (2-100자)
 * - 내용 입력 (10-5000자)
 * - 비공개 옵션 (운영진만 볼 수 있음)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import {
  FeedbackCategory,
  FEEDBACK_CATEGORIES,
  FeedbackApiResponse,
  Feedback,
} from '@/types/feedback';
import { toast } from 'sonner';

// ============================================
// 카테고리 선택 옵션
// ============================================

const CATEGORY_OPTIONS: {
  value: FeedbackCategory;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: 'bug',
    label: '버그 제보',
    icon: '🐛',
    description: '오류나 버그를 발견했을 때',
  },
  {
    value: 'feature',
    label: '기능 건의',
    icon: '💡',
    description: '새로운 기능을 제안할 때',
  },
  {
    value: 'complaint',
    label: '불편 사항',
    icon: '😤',
    description: '불편한 점을 알려줄 때',
  },
  {
    value: 'praise',
    label: '칭찬/감사',
    icon: '💖',
    description: '좋았던 점을 공유할 때',
  },
  {
    value: 'other',
    label: '기타',
    icon: '📝',
    description: '그 외 다른 의견',
  },
];

// ============================================
// 메인 컴포넌트
// ============================================

export default function FeedbackWritePage() {
  const router = useRouter();
  const { user, userProfile, isLoggedIn, isLoading: authLoading } = useAuth();

  // 폼 상태
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  // 제출 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ========================================
  // 폼 유효성 검사
  // ========================================
  const isValid =
    category !== null &&
    title.trim().length >= 2 &&
    title.length <= 100 &&
    content.trim().length >= 10 &&
    content.length <= 5000;

  // ========================================
  // 피드백 제출
  // ========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn || !user) {
      toast.error('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    if (!isValid || !category) {
      toast.error('입력 내용을 확인해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
          'x-user-email': encodeURIComponent(user.email || ''),
          'x-user-name': encodeURIComponent(
            userProfile?.nickname || userProfile?.displayName || '사용자'
          ),
          'x-user-photo': encodeURIComponent(userProfile?.avatarUrl || ''),
        },
        body: JSON.stringify({
          category,
          title: title.trim(),
          content: content.trim(),
          isPrivate,
        }),
      });

      const data: FeedbackApiResponse<Feedback> = await res.json();

      if (data.success && data.data) {
        toast.success('피드백이 등록되었습니다.');
        router.push(`/feedback/${data.data.id}`);
      } else {
        toast.error(data.error || '피드백 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('[FeedbackWritePage] 제출 에러:', error);
      toast.error('서버 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================
  // 로그인 체크
  // ========================================
  if (!authLoading && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            피드백을 작성하려면 로그인이 필요합니다.
          </p>
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 사이드바 */}
      <Sidebar activeMenu="feedback" />

      {/* 메인 콘텐츠 */}
      <main className="md:ml-[72px] lg:ml-60 pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* 헤더 */}
          <div className="mb-6">
            <Link
              href="/feedback"
              className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>목록으로</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              피드백 작성
            </h1>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 카테고리 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      category === opt.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {opt.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 제목 */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                제목 <span className="text-red-500">*</span>
                <span className="text-gray-400 ml-2 font-normal">
                  ({title.length}/100)
                </span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="피드백 제목을 입력해주세요"
                maxLength={100}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {title.length > 0 && title.trim().length < 2 && (
                <p className="text-red-500 text-sm mt-1">
                  제목은 2자 이상이어야 합니다.
                </p>
              )}
            </div>

            {/* 내용 */}
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                내용 <span className="text-red-500">*</span>
                <span className="text-gray-400 ml-2 font-normal">
                  ({content.length}/5000)
                </span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="피드백 내용을 상세히 작성해주세요"
                maxLength={5000}
                rows={8}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              {content.length > 0 && content.trim().length < 10 && (
                <p className="text-red-500 text-sm mt-1">
                  내용은 10자 이상이어야 합니다.
                </p>
              )}
            </div>

            {/* 비공개 옵션 */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <input
                id="isPrivate"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isPrivate" className="flex-1">
                <span className="font-medium text-gray-900 dark:text-white">
                  비공개로 작성
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  운영진만 볼 수 있습니다. 개인정보가 포함된 경우 체크해주세요.
                </p>
              </label>
            </div>

            {/* 버튼 */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Link
                href="/feedback"
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '등록 중...' : '작성하기'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* 하단 네비게이션 (모바일) */}
      <BottomNav activeMenu="feedback" />
    </div>
  );
}
