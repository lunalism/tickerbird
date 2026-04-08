// 왼쪽 사이드바 컴포넌트 (데스크탑 전용, md 이상에서만 표시)
// 접기/펼치기, 메뉴 네비게이션, 하단(설정/로그인) 기능을 제공합니다.

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  FileText,
  MessageSquare,
  Calendar,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  LogIn,
  Shield,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useAuth } from "@/hooks/useAuth";

// 메뉴 아이템 목록 정의 (내 정보는 하단 프로필 영역에서 접근)
const menuItems = [
  { label: "뉴스", icon: Globe, href: "/news" },
  { label: "리포트", icon: FileText, href: "/reports" },
  { label: "커뮤니티", icon: MessageSquare, href: "/community" },
  { label: "캘린더", icon: Calendar, href: "/calendar" },
  { label: "알림", icon: Bell, href: "/notifications" },
] as const;

// 하단 버튼 공통 스타일
const bottomButtonStyle =
  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground";

export default function Sidebar() {
  // 현재 경로를 가져와서 활성 메뉴를 판별합니다
  const pathname = usePathname();
  // 전역 상태에서 사이드바 상태를 가져옵니다
  const { isSidebarOpen, toggleSidebar } = useUIStore();

  // Supabase 세션 + profiles 테이블에서 최신 닉네임과 관리자 여부를 가져옵니다
  const { isLoading: isAuthLoading, isLoggedIn, displayName, avatarUrl, isAdmin } =
    useAuth();

  return (
    // 데스크탑(md 이상)에서만 표시, 모바일에서는 숨김
    <aside
      className={`
        hidden md:flex
        fixed left-0 top-0 z-40 h-full flex-col
        border-r border-border bg-sidebar text-sidebar-foreground
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? "w-60" : "w-16"}
      `}
    >
      {/* 상단: 로고 + 접기/펼치기 버튼 */}
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        {isSidebarOpen ? (
          <Image
            src="/images/logo-full.svg"
            alt="Tickerbird 로고"
            width={160}
            height={36}
            className="shrink-0"
            priority
          />
        ) : (
          <Image
            src="/images/logo.svg"
            alt="Tickerbird 로고"
            width={36}
            height={36}
            className="shrink-0"
            priority
          />
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1.5 hover:bg-sidebar-accent"
          aria-label={isSidebarOpen ? "사이드바 접기" : "사이드바 펼치기"}
        >
          {isSidebarOpen ? (
            <ChevronsLeft size={20} />
          ) : (
            <ChevronsRight size={20} />
          )}
        </button>
      </div>

      {/* 메뉴 아이템 목록 */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`
                flex items-center gap-3 rounded-md px-3 py-2
                transition-colors duration-150
                ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }
              `}
              title={!isSidebarOpen ? item.label : undefined}
            >
              <item.icon size={20} className="shrink-0" />
              {isSidebarOpen && (
                <span className="truncate text-sm">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 관리자 메뉴 (is_admin = true인 유저에게만 표시) */}
      {isAdmin && (
        <div className="border-t border-border px-2 py-2">
          <Link
            href="/admin"
            prefetch={false}
            className={`
              flex items-center gap-3 rounded-md px-3 py-2
              transition-colors duration-150
              ${
                pathname.startsWith("/admin")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }
            `}
            title={!isSidebarOpen ? "관리자 패널" : undefined}
          >
            <Shield size={20} className="shrink-0" />
            {isSidebarOpen && (
              <span className="truncate text-sm">관리자 패널</span>
            )}
          </Link>
        </div>
      )}

      {/* 하단: 설정 → 로그인/프로필 순서 */}
      <div className="border-t border-border px-2 py-2 space-y-1">
        {/* 설정 버튼 */}
        <Link
          href="/settings"
          prefetch={false}
          className={bottomButtonStyle}
          title={!isSidebarOpen ? "설정" : undefined}
        >
          <Settings size={20} className="shrink-0" />
          {isSidebarOpen && <span className="text-sm">설정</span>}
        </Link>

        {/* 로그인/프로필 버튼 */}
        {isAuthLoading ? null : isLoggedIn ? (
          <Link
            href="/profile"
            prefetch={false}
            className={bottomButtonStyle}
            title={!isSidebarOpen ? displayName : undefined}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={20}
                height={20}
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
                {displayName.charAt(0)}
              </div>
            )}
            {isSidebarOpen && (
              <span className="truncate text-sm">{displayName}</span>
            )}
          </Link>
        ) : (
          <Link
            href="/login"
            prefetch={false}
            className={bottomButtonStyle}
            title={!isSidebarOpen ? "로그인" : undefined}
          >
            <LogIn size={20} className="shrink-0" />
            {isSidebarOpen && <span className="text-sm">로그인</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}
