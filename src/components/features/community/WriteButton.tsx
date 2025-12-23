'use client';

/**
 * WriteButton 컴포넌트
 *
 * 모바일에서 글쓰기를 위한 FAB (Floating Action Button) 입니다.
 * 클릭하면 글쓰기 모달이 열립니다.
 *
 * - 모바일: 우측 하단 파란색 + 버튼
 * - 데스크톱: PostComposer가 있으므로 숨김
 */

import { useState } from 'react';
import { showSuccess, showInfo } from '@/lib/toast';

export function WriteButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState('');

  const maxLength = 280;
  const remainingChars = maxLength - content.length;

  /**
   * 게시 버튼 클릭
   */
  const handlePost = () => {
    if (content.trim().length === 0) {
      showInfo('내용을 입력해주세요');
      return;
    }

    showSuccess('게시물이 등록되었습니다');
    setContent('');
    setIsModalOpen(false);
  };

  /**
   * 모달 닫기
   */
  const handleClose = () => {
    setIsModalOpen(false);
    setContent('');
  };

  return (
    <>
      {/* FAB 버튼 - 모바일에서만 표시 */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-20 right-4 md:hidden w-14 h-14 bg-blue-600 text-white rounded-full
                   shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40
                   transition-all flex items-center justify-center z-40 active:scale-95"
        title="글쓰기"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* 글쓰기 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* 모달 컨텐츠 */}
          <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-gray-800 rounded-t-2xl
                          max-h-[80vh] overflow-hidden animate-slide-up">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <button
                onClick={handleClose}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                취소
              </button>
              <h3 className="font-semibold text-gray-900 dark:text-white">새 글 작성</h3>
              <button
                onClick={handlePost}
                disabled={content.trim().length === 0}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-full
                           hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                게시
              </button>
            </div>

            {/* 입력 영역 */}
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* 아바타 */}
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30
                                flex items-center justify-center text-xl flex-shrink-0">
                  👤
                </div>

                {/* 텍스트 입력 */}
                <div className="flex-1">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value.slice(0, maxLength))}
                    placeholder="무슨 생각을 하고 계신가요?"
                    rows={5}
                    autoFocus
                    className="w-full resize-none border-none bg-transparent text-gray-900 dark:text-white
                               placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0
                               text-base"
                  />
                </div>
              </div>
            </div>

            {/* 하단 툴바 */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              {/* 액션 버튼들 */}
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400
                             hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-lg font-bold">$</span>
                </button>
                <button
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400
                             hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-lg font-bold">#</span>
                </button>
                <button
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400
                             hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
