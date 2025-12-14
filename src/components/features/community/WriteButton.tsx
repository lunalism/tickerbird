'use client';

export function WriteButton() {
  return (
    <button
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40 transition-all flex items-center justify-center z-40"
      title="글쓰기"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}
