"use client";

/**
 * Sidebar 컴포넌트
 *
 * 좌측 사이드바 네비게이션입니다.
 * 전역 AuthContext를 사용하여 인증 상태를 표시합니다.
 * 페이지 이동해도 상태가 유지됩니다.
 *
 * ============================================================
 * 새 공지사항 알림 배지:
 * ============================================================
 * - 읽지 않은 공지사항이 있으면 배지 표시
 * - 공지를 클릭해서 펼쳐 읽어야 배지가 사라짐
 * - 여러 개의 새 공지가 있으면 모두 읽어야 배지 사라짐
 * - localStorage에 읽은 공지 ID 목록 저장
 */

import { useState } from "react";
import Link from "next/link";
import { menuItems, infoMenuItems } from '@/constants';
import { MenuIcon, UserAvatar } from '@/components/common';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAdmin } from '@/hooks/useAdmin';
import { useNewAnnouncement } from '@/hooks/useNewAnnouncement';

interface SidebarProps {
  activeMenu: string;
  onMenuChange?: (id: string) => void;
}

/**
 * 새 공지 알림 배지 컴포넌트
 *
 * 빨간 점으로 새 공지가 있음을 표시합니다.
 */
function NewBadge() {
  return (
    <span
      className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"
      aria-label="새 공지사항"
    />
  );
}

export function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  const [mounted, setMounted] = useState(false);

  // 전역 인증 상태 사용 (자체 세션 체크 없음)
  const { userProfile, isLoading, isLoggedIn, isProfileLoading } = useAuth();

  // 관리자 권한 확인
  const { isAdmin } = useAdmin();

  // 새 공지사항 확인 (읽지 않은 공지가 있는지)
  // NOTE: 페이지 방문만으로는 배지가 사라지지 않음
  // 공지를 클릭해서 펼쳐 읽어야 배지가 사라짐 (announcements/page.tsx에서 처리)
  const { hasNewAnnouncement } = useNewAnnouncement();

  // 클라이언트 마운트 확인 (hydration 방지)
  useState(() => {
    setMounted(true);
  });


  // 사용자 정보 (우선순위: nickname > displayName > 기본값)
  // Tickerbird 닉네임이 있으면 최우선, 없으면 Google displayName 사용
  const userName = userProfile?.nickname || userProfile?.displayName || '사용자';
  const userAvatar = userProfile?.avatarUrl;

  return (
    <aside className="fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 hidden md:flex md:flex-col z-50 transition-all duration-300 w-[72px] lg:w-60">
      {/* ========================================
          스크롤 가능 영역 (로고 + 메뉴)
          - flex-1: 남은 공간 모두 차지
          - overflow-y-auto: 메뉴 많으면 스크롤
          ======================================== */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Logo */}
        <div className="px-4 py-4 mb-2">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white hidden lg:block">Tickerbird</span>
          </Link>
        </div>

        {/* 메뉴 영역 */}
        <nav className="flex flex-col gap-1 px-3 pb-4">
        {menuItems
          .filter((item) => item.id !== 'profile')
          // 가격 알림과 관심종목은 로그인 시에만 표시 (로딩 완료 후에만 체크)
          .filter((item) => item.id !== 'alerts' || (!isLoading && isLoggedIn))
          .filter((item) => item.id !== 'watchlist' || (!isLoading && isLoggedIn))
          // 공지사항/FAQ는 하단 2열로 별도 표시
          .filter((item) => item.id !== 'announcements' && item.id !== 'faq')
          .map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`group relative w-full h-12 rounded-xl flex items-center transition-all duration-200 flex-shrink-0 ${
              activeMenu === item.id
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
            title={item.label}
          >
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <MenuIcon icon={item.icon} active={activeMenu === item.id} />
            </div>
            <span className={`text-sm font-medium hidden lg:block ${
              activeMenu === item.id ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
            }`}>
              {item.label}
            </span>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap lg:hidden z-50">
              {item.label}
            </div>
          </Link>
        ))}

        {/* ========================================
            관리자 메뉴 (관리자만 표시)
            ======================================== */}
        {isAdmin && (
          <>
            {/* 구분선 */}
            <div className="my-2 mx-2 border-t border-gray-200 dark:border-gray-700" />

            {/* 관리자 메뉴 링크 */}
            <Link
              href="/admin"
              className={`group relative w-full h-12 rounded-xl flex items-center transition-all duration-200 flex-shrink-0 ${
                activeMenu === 'admin'
                  ? "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              }`}
              title="관리자"
            >
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                {/* 관리자 아이콘 (잠금/설정) */}
                <svg
                  className={`w-6 h-6 ${
                    activeMenu === 'admin'
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <span className={`text-sm font-medium hidden lg:block ${
                activeMenu === 'admin' ? "text-purple-600 dark:text-purple-400" : "text-gray-700 dark:text-gray-300"
              }`}>
                관리자
              </span>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap lg:hidden z-50">
                관리자
              </div>
            </Link>
          </>
        )}
        </nav>
      </div>

      {/* ========================================
          공지사항/FAQ 2열 섹션
          - 로그인 버튼 위에 작게 2열로 표시
          - 아이콘 + 텍스트 (lg 이상에서만 텍스트 표시)
          - 새 공지가 있으면 배지 표시
          ======================================== */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="grid grid-cols-2 gap-1">
          {infoMenuItems.map((item) => {
            // 공지사항 메뉴에만 새 공지 배지 표시
            const showBadge = item.id === 'announcements' && hasNewAnnouncement;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`group relative flex items-center justify-center lg:justify-start gap-1.5 px-2 py-2 rounded-lg text-xs transition-colors ${
                  activeMenu === item.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title={item.label}
              >
                {/* 아이콘 (배지 포함) */}
                <span className="relative text-sm">
                  {item.emoji}
                  {/* 새 공지 배지 */}
                  {showBadge && <NewBadge />}
                </span>
                {/* 텍스트 (lg 이상에서만 표시) */}
                <span className="hidden lg:inline font-medium">
                  {item.label}
                  {/* 텍스트 옆 N 배지 (lg 이상) */}
                  {showBadge && (
                    <span className="ml-1 px-1 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded">
                      N
                    </span>
                  )}
                </span>
                {/* 툴팁 (접힌 상태에서 호버 시) */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap lg:hidden z-50">
                  {item.label}
                  {showBadge && ' (새 글)'}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ========================================
          로그인/프로필 섹션
          - flex-shrink-0: 절대 축소 안됨
          - 스크롤 영역 밖에 있어서 항상 하단 고정
          ======================================== */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        {isLoading || isProfileLoading ? (
          // 로딩 중 - 스켈레톤 UI
          <div className="w-full h-12 rounded-xl flex items-center px-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
            <div className="hidden lg:block ml-3 h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ) : isLoggedIn && userProfile ? (
          // 로그인됨 - 프로필 표시
          // UserAvatar 컴포넌트 사용 (avatarId 우선, 없으면 avatarUrl, 없으면 이니셜)
          <Link
            href="/profile"
            className="group relative w-full h-12 rounded-xl flex items-center hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            title={userName}
          >
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 relative">
              {/* UserAvatar 컴포넌트 사용 - avatarId > avatarUrl > 이니셜 우선순위 */}
              <UserAvatar
                avatarId={userProfile.avatarId}
                photoURL={userAvatar}
                name={userName}
                size="sm"
              />
            </div>
            <div className="hidden lg:flex lg:flex-col lg:items-start lg:justify-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                {userName}
              </span>
            </div>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap lg:hidden z-50">
              {userName}
            </div>
          </Link>
        ) : (
          // 비로그인 - 로그인 버튼
          <Link
            href="/login"
            className="group relative w-full h-12 rounded-xl flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="로그인"
          >
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden lg:block">로그인</span>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap lg:hidden z-50">
              로그인
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
