'use client';

/**
 * 관리자 콘텐츠 관리 페이지
 *
 * 사이트 콘텐츠를 관리할 수 있는 페이지입니다.
 * (Phase 2에서 구현 예정)
 *
 * 예정 기능:
 * - 개인정보처리방침 수정
 * - 이용약관 수정
 * - 공지사항 관리
 */

import Link from 'next/link';

/**
 * 콘텐츠 메뉴 카드 컴포넌트
 */
function ContentMenuCard({
  title,
  description,
  href,
  icon,
  disabled = false,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 opacity-60 cursor-not-allowed">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {description}
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              준비 중
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

/**
 * 콘텐츠 관리 페이지 메인 컴포넌트
 */
export default function AdminContentPage() {
  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          콘텐츠 관리
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          사이트 콘텐츠를 관리합니다.
        </p>
      </div>

      {/* 콘텐츠 메뉴 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 개인정보처리방침 */}
        <ContentMenuCard
          title="개인정보처리방침"
          description="개인정보처리방침 내용을 수정합니다."
          href="/admin/content/privacy"
          disabled={true}
          icon={
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        {/* 이용약관 */}
        <ContentMenuCard
          title="이용약관"
          description="서비스 이용약관 내용을 수정합니다."
          href="/admin/content/terms"
          disabled={true}
          icon={
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        {/* 공지사항 */}
        <ContentMenuCard
          title="공지사항"
          description="공지사항을 작성하고 관리합니다."
          href="/admin/content/announcements"
          disabled={true}
          icon={
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          }
        />

        {/* FAQ */}
        <ContentMenuCard
          title="자주 묻는 질문"
          description="FAQ 항목을 관리합니다."
          href="/admin/content/faq"
          disabled={true}
          icon={
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* 안내 메시지 */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
              콘텐츠 관리 기능은 Phase 2에서 구현 예정입니다.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              현재는 관리자 이메일 관리, 사용자 관리, 대시보드 기능만 사용 가능합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
