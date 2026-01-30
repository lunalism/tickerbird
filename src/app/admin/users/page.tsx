'use client';

/**
 * 관리자 사용자 관리 페이지
 *
 * 모든 사용자 목록을 조회하고 관리할 수 있는 페이지입니다.
 *
 * 기능:
 * - 사용자 목록 테이블 (페이지네이션)
 * - 이메일/닉네임 검색
 * - 요금제별 필터
 * - 정지 여부 필터
 * - 사용자 클릭 시 상세 페이지로 이동
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { PLAN_INFO, type PlanType } from '@/types/admin';

/**
 * 검색 및 필터 컴포넌트
 */
function SearchAndFilter({
  searchParams,
  onSearch,
  onFilterChange,
}: {
  searchParams: { query?: string; plan?: PlanType | 'all'; isBanned?: boolean | 'all' };
  onSearch: (query: string) => void;
  onFilterChange: (key: string, value: string | boolean | 'all') => void;
}) {
  const [searchInput, setSearchInput] = useState(searchParams.query || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* 검색 폼 */}
      <form onSubmit={handleSearch} className="flex-1">
        <div className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="이메일 또는 닉네임 검색..."
            className="w-full px-4 py-2.5 pl-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </form>

      {/* 필터 드롭다운 */}
      <div className="flex gap-3">
        {/* 요금제 필터 */}
        <select
          value={searchParams.plan || 'all'}
          onChange={(e) => onFilterChange('plan', e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">모든 요금제</option>
          <option value="free">무료</option>
          <option value="premium">프리미엄</option>
        </select>

        {/* 정지 여부 필터 */}
        <select
          value={searchParams.isBanned === undefined ? 'all' : String(searchParams.isBanned)}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'all') {
              onFilterChange('isBanned', 'all');
            } else {
              onFilterChange('isBanned', value === 'true');
            }
          }}
          className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">전체 상태</option>
          <option value="false">정상</option>
          <option value="true">정지됨</option>
        </select>
      </div>
    </div>
  );
}

/**
 * 페이지네이션 컴포넌트
 */
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  // 표시할 페이지 버튼 계산 (현재 페이지 주변 5개)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      {/* 이전 버튼 */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 페이지 번호 버튼 */}
      {getPageNumbers().map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            page === currentPage
              ? 'bg-blue-600 text-white'
              : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {page}
        </button>
      ))}

      {/* 다음 버튼 */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

/**
 * 사용자 관리 페이지 메인 컴포넌트
 */
export default function AdminUsersPage() {
  const {
    users,
    pagination,
    isLoading,
    error,
    searchParams,
    setSearchParams,
    goToPage,
    refreshUsers,
  } = useAdminUsers();

  // 요금제 배지 색상
  const planBadgeColors: Record<PlanType, string> = {
    free: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    premium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  // 검색 핸들러
  const handleSearch = (query: string) => {
    setSearchParams({ ...searchParams, query, page: 1 });
  };

  // 필터 변경 핸들러
  const handleFilterChange = (key: string, value: string | boolean | 'all') => {
    const newParams = { ...searchParams, page: 1 };

    if (key === 'plan') {
      newParams.plan = value === 'all' ? undefined : (value as PlanType);
    } else if (key === 'isBanned') {
      newParams.isBanned = value === 'all' ? undefined : (value as boolean);
    }

    setSearchParams(newParams);
  };

  // 에러 상태
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={() => refreshUsers()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          사용자 관리
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          총 {pagination.totalItems.toLocaleString()}명의 사용자
        </p>
      </div>

      {/* 검색 및 필터 */}
      <SearchAndFilter
        searchParams={searchParams}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />

      {/* 사용자 목록 테이블 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  요금제
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                // 로딩 스켈레톤
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                        <div>
                          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                          <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                // 결과 없음
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {searchParams.query || searchParams.plan || searchParams.isBanned !== undefined
                      ? '검색 결과가 없습니다.'
                      : '등록된 사용자가 없습니다.'}
                  </td>
                </tr>
              ) : (
                // 사용자 목록
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* 기본 아바타 */}
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {(user.nickname || user.displayName || user.email)?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.nickname || user.displayName || '(이름 없음)'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${planBadgeColors[user.plan]}`}
                      >
                        {PLAN_INFO[user.plan].label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.isBanned ? (
                        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          정지됨
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          정상
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {user.createdAt?.toDate?.()
                        ? new Date(user.createdAt.toDate()).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        상세
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={goToPage}
      />
    </div>
  );
}
