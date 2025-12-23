"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);

  useEffect(() => {
    // 초기 상태 설정
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      setShowFullScreen(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      // 5초 후에 전체 화면 오프라인 페이지 표시
      setTimeout(() => {
        if (!navigator.onLine) {
          setShowFullScreen(true);
        }
      }, 5000);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  // 전체 화면 오프라인 페이지
  if (showFullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* 애니메이션 이모지 */}
          <div className="mb-8 relative">
            <div className="text-8xl animate-pulse">📡</div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>

          {/* 오프라인 배지 */}
          <div className="mb-6">
            <span className="inline-block px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm font-medium">
              Offline
            </span>
          </div>

          {/* 제목 */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            인터넷 연결을 확인해주세요
          </h1>

          {/* 설명 */}
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            네트워크 연결이 끊어졌습니다. Wi-Fi 또는 모바일 데이터를 확인해주세요.
          </p>

          {/* 위트 있는 문구 */}
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 italic">
            시장은 24시간 열려있지만, 네트워크는 그렇지 않네요 🌐
          </p>

          {/* 연결 체크 리스트 */}
          <div className="mb-8 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              확인해보세요:
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center gap-2">
                <span className="text-blue-500">•</span>
                Wi-Fi 연결 상태
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">•</span>
                모바일 데이터 사용 가능 여부
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">•</span>
                비행기 모드 해제
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">•</span>
                라우터/모뎀 상태
              </li>
            </ul>
          </div>

          {/* 버튼 */}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            다시 연결 시도
          </button>

          {/* 연결 상태 표시 */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span>연결 대기 중...</span>
          </div>
        </div>
      </div>
    );
  }

  // 상단 배너 스타일 (초기 오프라인 알림)
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-orange-500 text-white px-4 py-2 text-center text-sm font-medium animate-slideDown">
      <div className="flex items-center justify-center gap-2">
        <span>📡</span>
        <span>인터넷 연결이 끊어졌습니다</span>
        <button
          onClick={() => window.location.reload()}
          className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
        >
          다시 시도
        </button>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
