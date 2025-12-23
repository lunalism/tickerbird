"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // 에러 로깅 (선택적)
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 애니메이션 이모지 */}
        <div className="mb-8 relative">
          <div className="text-8xl animate-shake">🛠️</div>
          <div className="absolute top-0 right-4 text-3xl animate-pulse">⚠️</div>
        </div>

        {/* 500 표시 */}
        <div className="mb-6">
          <span className="inline-block px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-sm font-medium">
            500 Error
          </span>
        </div>

        {/* 제목 */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          일시적인 오류가 발생했습니다
        </h1>

        {/* 설명 */}
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          잠시 후 다시 시도해주세요
        </p>

        {/* 위트 있는 문구 */}
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 italic">
          서버가 잠시 조정 중입니다 📊
        </p>

        {/* 에러 다이제스트 (디버깅용) */}
        {error.digest && (
          <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              Error ID: {error.digest}
            </p>
          </div>
        )}

        {/* 버튼들 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            다시 시도
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            홈으로 돌아가기
          </Link>
        </div>

        {/* 오류 신고 링크 */}
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            문제가 계속되나요?
          </p>
          <a
            href="mailto:support@alphaboard.co.kr"
            className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            오류 신고하기
          </a>
        </div>

        {/* 상태 표시 */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
          <span>시스템 상태 확인 중...</span>
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% {
            transform: translateX(0) rotate(0deg);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-5px) rotate(-5deg);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(5px) rotate(5deg);
          }
        }
        .animate-shake {
          animation: shake 0.8s ease-in-out infinite;
          animation-delay: 2s;
          animation-iteration-count: 3;
        }
      `}</style>
    </div>
  );
}
