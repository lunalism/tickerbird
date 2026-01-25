'use client';

/**
 * AdminLayout - 관리자 페이지 레이아웃 컴포넌트
 *
 * 관리자 권한을 확인하고, 권한이 없으면 메인 페이지로 리다이렉트합니다.
 * 권한이 있으면 관리자 사이드바와 함께 콘텐츠를 표시합니다.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();

  // 로딩 중이 아닐 때 권한 체크
  const isLoading = authLoading || adminLoading;

  useEffect(() => {
    // 로딩 중이면 대기
    if (isLoading) return;

    // 로그인하지 않았거나 관리자가 아니면 메인 페이지로 리다이렉트
    if (!isLoggedIn || !isAdmin) {
      router.replace('/');
    }
  }, [isLoading, isLoggedIn, isAdmin, router]);

  // 로딩 중 - 스켈레톤 UI 표시
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* 사이드바 스켈레톤 */}
        <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6">
          {/* 로고 스켈레톤 */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            <div className="space-y-2">
              <div className="w-24 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
          {/* 메뉴 스켈레톤 */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        {/* 메인 콘텐츠 스켈레톤 */}
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
                  <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 로그인하지 않았거나 관리자가 아니면 아무것도 렌더링하지 않음 (리다이렉트 대기)
  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  // 관리자 레이아웃 렌더링
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 관리자 사이드바 */}
      <AdminSidebar />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 ml-64">
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
