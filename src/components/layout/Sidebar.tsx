// 왼쪽 사이드바 컴포넌트
// 접기/펼치기, 메뉴 네비게이션, 하단(다크모드/설정/로그인) 기능을 제공합니다.

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  FileText,
  MessageSquare,
  Calendar,
  User,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Moon,
  Sun,
  Settings,
  LogIn,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

// 메뉴 아이템 목록 정의
const menuItems = [
  { label: "뉴스", icon: Globe, href: "/news" },
  { label: "리포트", icon: FileText, href: "/reports" },
  { label: "커뮤니티", icon: MessageSquare, href: "/community" },
  { label: "캘린더", icon: Calendar, href: "/calendar" },
  { label: "내 정보", icon: User, href: "/profile" },
  { label: "알림", icon: Bell, href: "/notifications" },
] as const;

// 하단 버튼 공통 스타일
const bottomButtonStyle =
  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground";

export default function Sidebar() {
  // 현재 경로를 가져와서 활성 메뉴를 판별합니다
  const pathname = usePathname();
  // 전역 상태에서 사이드바, 다크모드 상태를 가져옵니다
  const { isSidebarOpen, toggleSidebar, isDarkMode, toggleDarkMode } =
    useUIStore();

  // 로그인 상태 (목업, 나중에 실제 연동)
  const isLoggedIn = false;
  // 로그인된 유저 정보 (목업)
  const mockUser = {
    name: "사용자",
    avatarUrl: "",
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40 flex h-full flex-col
        border-r border-border bg-sidebar text-sidebar-foreground
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? "w-60" : "w-16"}
      `}
    >
      {/* 상단: 로고 + 접기/펼치기 버튼 */}
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        {/* 사이드바 상태에 따라 풀 로고 또는 아이콘 로고 표시 */}
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
        {/* 사이드바 접기/펼치기 토글 버튼 */}
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
          // 현재 경로와 메뉴 경로 비교하여 활성 상태 판별
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
              {/* 메뉴 아이콘 */}
              <item.icon size={20} className="shrink-0" />
              {/* 사이드바 펼쳐졌을 때만 라벨 표시 */}
              {isSidebarOpen && (
                <span className="truncate text-sm">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 하단: 다크모드 → 설정 → 로그인/프로필 순서 */}
      <div className="border-t border-border px-2 py-2 space-y-1">
        {/* 1. 다크모드 토글 버튼 */}
        <button
          onClick={toggleDarkMode}
          className={bottomButtonStyle}
          aria-label={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
          title={!isSidebarOpen ? (isDarkMode ? "라이트 모드" : "다크 모드") : undefined}
        >
          {/* 다크모드 상태에 따라 아이콘 변경 */}
          {isDarkMode ? (
            <Sun size={20} className="shrink-0" />
          ) : (
            <Moon size={20} className="shrink-0" />
          )}
          {/* 사이드바 펼쳐졌을 때만 텍스트 표시 */}
          {isSidebarOpen && (
            <span className="text-sm">
              {isDarkMode ? "라이트 모드" : "다크 모드"}
            </span>
          )}
        </button>

        {/* 2. 설정 버튼 */}
        <Link
          href="/settings"
          className={bottomButtonStyle}
          title={!isSidebarOpen ? "설정" : undefined}
        >
          <Settings size={20} className="shrink-0" />
          {/* 사이드바 펼쳐졌을 때만 텍스트 표시 */}
          {isSidebarOpen && <span className="text-sm">설정</span>}
        </Link>

        {/* 3. 로그인/프로필 버튼 */}
        {isLoggedIn ? (
          // 로그인 상태: 아바타 + 닉네임 → /profile
          <Link
            href="/profile"
            className={bottomButtonStyle}
            title={!isSidebarOpen ? mockUser.name : undefined}
          >
            {/* 아바타 원형 이미지 (이미지 없으면 이니셜 표시) */}
            {mockUser.avatarUrl ? (
              <Image
                src={mockUser.avatarUrl}
                alt={mockUser.name}
                width={20}
                height={20}
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
                {mockUser.name.charAt(0)}
              </div>
            )}
            {/* 사이드바 펼쳐졌을 때만 닉네임 표시 */}
            {isSidebarOpen && (
              <span className="truncate text-sm">{mockUser.name}</span>
            )}
          </Link>
        ) : (
          // 비로그인 상태: 로그인 아이콘 + 텍스트 → /login
          <Link
            href="/login"
            className={bottomButtonStyle}
            title={!isSidebarOpen ? "로그인" : undefined}
          >
            <LogIn size={20} className="shrink-0" />
            {/* 사이드바 펼쳐졌을 때만 텍스트 표시 */}
            {isSidebarOpen && <span className="text-sm">로그인</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}
