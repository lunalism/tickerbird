"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="antialiased">
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{
            backgroundColor: "#f8f9fa",
            fontFamily: "'Pretendard Variable', Pretendard, system-ui, -apple-system, sans-serif",
          }}
        >
          <div className="max-w-md w-full text-center">
            {/* 이모지 */}
            <div className="mb-8">
              <span className="text-8xl">💥</span>
            </div>

            {/* 에러 배지 */}
            <div className="mb-6">
              <span
                className="inline-block px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                }}
              >
                Critical Error
              </span>
            </div>

            {/* 제목 */}
            <h1
              className="text-2xl sm:text-3xl font-bold mb-3"
              style={{ color: "#171717" }}
            >
              예상치 못한 오류가 발생했습니다
            </h1>

            {/* 설명 */}
            <p className="mb-4" style={{ color: "#868e96" }}>
              죄송합니다. 서비스에 심각한 문제가 발생했습니다.
            </p>

            {/* 위트 있는 문구 */}
            <p className="text-sm mb-8 italic" style={{ color: "#adb5bd" }}>
              시장 변동성이 너무 큽니다... 잠시 후 다시 시도해주세요 📈📉
            </p>

            {/* 에러 ID */}
            {error.digest && (
              <div
                className="mb-6 p-3 rounded-lg"
                style={{ backgroundColor: "#e9ecef" }}
              >
                <p
                  className="text-xs font-mono"
                  style={{ color: "#868e96" }}
                >
                  Error ID: {error.digest}
                </p>
              </div>
            )}

            {/* 버튼 */}
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all"
              style={{
                backgroundColor: "#228be6",
                color: "#ffffff",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#1c7ed6")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#228be6")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
