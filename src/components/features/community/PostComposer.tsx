'use client';

/**
 * PostComposer 컴포넌트
 *
 * 피드 상단의 글쓰기 입력 영역입니다.
 *
 * 구조:
 * ┌─────────────────────────────────────────┐
 * │ 👤  무슨 생각을 하고 계신가요?            │
 * │     [$종목] [#태그] [📷] [게시]          │
 * └─────────────────────────────────────────┘
 */

import { useState } from 'react';
import { showSuccess, showInfo } from '@/lib/toast';

interface PostComposerProps {
  /** 로그인 상태 */
  isLoggedIn: boolean;
  /** 로그인 요청 콜백 */
  onLoginRequest?: () => void;
  /** 게시글 제출 콜백 */
  onSubmit?: (content: string) => Promise<void>;
}

export function PostComposer({ isLoggedIn, onLoginRequest, onSubmit }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 글자 수 제한 (500자로 증가)
  const maxLength = 500;
  const remainingChars = maxLength - content.length;

  /**
   * 게시 버튼 클릭
   */
  const handlePost = async () => {
    if (!isLoggedIn) {
      showInfo('로그인이 필요합니다');
      onLoginRequest?.();
      return;
    }

    if (content.trim().length === 0) {
      showInfo('내용을 입력해주세요');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (onSubmit) {
        await onSubmit(content.trim());
      }
      showSuccess('게시물이 등록되었습니다');
      setContent('');
      setIsFocused(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '게시물 등록에 실패했습니다';
      showInfo(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 종목 태그 삽입
   */
  const handleInsertStockTag = () => {
    showInfo('종목 검색 기능은 준비 중입니다');
  };

  /**
   * 해시태그 삽입
   */
  const handleInsertHashtag = () => {
    setContent((prev) => prev + '#');
  };

  /**
   * 이미지 첨부
   */
  const handleAttachImage = () => {
    showInfo('이미지 첨부 기능은 준비 중입니다');
  };

  /**
   * 비로그인 상태 렌더링
   */
  if (!isLoggedIn) {
    return (
      <div
        onClick={onLoginRequest}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700
                   p-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* 아바타 플레이스홀더 */}
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>

          {/* 플레이스홀더 텍스트 */}
          <div className="flex-1">
            <p className="text-gray-500 dark:text-gray-400">
              로그인하고 투자 생각을 공유해보세요
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl border transition-colors
        ${
          isFocused
            ? 'border-blue-400 dark:border-blue-500 shadow-lg shadow-blue-500/10'
            : 'border-gray-200 dark:border-gray-700'
        }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* 사용자 아바타 */}
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl flex-shrink-0">
            👤
          </div>

          {/* 입력 영역 */}
          <div className="flex-1 min-w-0">
            {/* 텍스트 입력 */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, maxLength))}
              onFocus={() => setIsFocused(true)}
              onBlur={() => !content && setIsFocused(false)}
              placeholder="무슨 생각을 하고 계신가요?"
              rows={isFocused ? 3 : 1}
              className="w-full resize-none border-none bg-transparent text-gray-900 dark:text-white
                         placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0
                         text-base"
            />

            {/* 하단 액션 바 (포커스 시에만 표시) */}
            {isFocused && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                {/* 왼쪽: 액션 버튼들 */}
                <div className="flex items-center gap-1">
                  {/* 종목 태그 */}
                  <button
                    onClick={handleInsertStockTag}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400
                               hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 transition-colors"
                    title="종목 태그 추가"
                  >
                    <span className="text-sm font-bold">$</span>
                  </button>

                  {/* 해시태그 */}
                  <button
                    onClick={handleInsertHashtag}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400
                               hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 transition-colors"
                    title="해시태그 추가"
                  >
                    <span className="text-sm font-bold">#</span>
                  </button>

                  {/* 이미지 첨부 */}
                  <button
                    onClick={handleAttachImage}
                    className="p-2 rounded-full text-gray-500 dark:text-gray-400
                               hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 transition-colors"
                    title="이미지 첨부"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>

                {/* 오른쪽: 글자 수 + 게시 버튼 */}
                <div className="flex items-center gap-3">
                  {/* 글자 수 카운터 */}
                  <span
                    className={`text-sm ${
                      remainingChars < 20
                        ? remainingChars < 0
                          ? 'text-red-500'
                          : 'text-orange-500'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {remainingChars}
                  </span>

                  {/* 게시 버튼 */}
                  <button
                    onClick={handlePost}
                    disabled={content.trim().length === 0 || isSubmitting}
                    className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-full
                               hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '게시 중...' : '게시'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
