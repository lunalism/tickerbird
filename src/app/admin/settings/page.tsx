'use client';

/**
 * 관리자 설정 페이지
 *
 * 사이트 설정을 관리할 수 있는 페이지입니다.
 *
 * 기능:
 * - 관리자 이메일 목록 관리 (추가/삭제)
 * - 최소 1명의 관리자 유지 규칙 적용
 */

import { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';

/**
 * 관리자 이메일 관리 카드 컴포넌트
 */
function AdminEmailsCard({
  adminEmails,
  onAdd,
  onRemove,
  isLoading,
}: {
  adminEmails: string[];
  onAdd: (email: string) => Promise<void>;
  onRemove: (email: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  // 이메일 추가 핸들러
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('올바른 이메일 형식이 아닙니다.');
      return;
    }

    try {
      setIsAdding(true);
      await onAdd(newEmail.trim());
      setNewEmail('');
      toast.success('관리자가 추가되었습니다.');
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('관리자 추가에 실패했습니다.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  // 이메일 삭제 핸들러
  const handleRemove = async (email: string) => {
    if (adminEmails.length <= 1) {
      toast.error('최소 1명의 관리자는 유지해야 합니다.');
      return;
    }

    try {
      setRemovingEmail(email);
      await onRemove(email);
      toast.success('관리자가 삭제되었습니다.');
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('관리자 삭제에 실패했습니다.');
      }
    } finally {
      setRemovingEmail(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            관리자 이메일 관리
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            관리자 페이지에 접근할 수 있는 이메일 목록입니다.
          </p>
        </div>
      </div>

      {/* 현재 관리자 목록 */}
      <div className="space-y-3 mb-6">
        {isLoading ? (
          // 로딩 스켈레톤
          [...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="w-48 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))
        ) : adminEmails.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            등록된 관리자가 없습니다.
          </div>
        ) : (
          adminEmails.map((email) => (
            <div
              key={email}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                    {email[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">
                  {email}
                </span>
              </div>
              <button
                onClick={() => handleRemove(email)}
                disabled={adminEmails.length <= 1 || removingEmail === email}
                className={`p-2 rounded-lg transition-colors ${
                  adminEmails.length <= 1
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
                title={adminEmails.length <= 1 ? '최소 1명의 관리자는 유지해야 합니다' : '관리자 삭제'}
              >
                {removingEmail === email ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* 관리자 추가 폼 */}
      <form onSubmit={handleAdd} className="flex gap-3">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="새 관리자 이메일 입력..."
          className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isAdding}
        />
        <button
          type="submit"
          disabled={isAdding || !newEmail.trim()}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isAdding ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              추가 중...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              추가
            </>
          )}
        </button>
      </form>

      {/* 안내 메시지 */}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        * 관리자로 등록된 이메일로 로그인하면 /admin 페이지에 접근할 수 있습니다.
      </p>
    </div>
  );
}

/**
 * 설정 페이지 메인 컴포넌트
 */
export default function AdminSettingsPage() {
  const { adminEmails, isLoading, error, addAdminEmail, removeAdminEmail } = useAdmin();

  // 에러 상태
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          설정
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          사이트 설정을 관리합니다.
        </p>
      </div>

      {/* 설정 카드 그리드 */}
      <div className="grid grid-cols-1 gap-6">
        {/* 관리자 이메일 관리 */}
        <AdminEmailsCard
          adminEmails={adminEmails}
          onAdd={addAdminEmail}
          onRemove={removeAdminEmail}
          isLoading={isLoading}
        />

        {/* 추후 추가될 설정 카드들을 위한 공간 */}
        {/* 예: 사이트 설정, 콘텐츠 관리 등 */}
      </div>
    </div>
  );
}
