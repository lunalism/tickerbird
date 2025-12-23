"use client";

import { useState } from "react";

export default function TestErrorPage() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error("테스트 에러입니다!");
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          에러 페이지 테스트
        </h1>

        <div className="space-y-4">
          <button
            onClick={() => setShouldError(true)}
            className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
          >
            500 에러 발생시키기
          </button>

          <a
            href="/this-page-does-not-exist"
            className="block w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
          >
            404 페이지로 이동
          </a>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            오프라인 페이지는 브라우저 개발자 도구에서<br />
            Network → Offline 체크로 테스트할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
