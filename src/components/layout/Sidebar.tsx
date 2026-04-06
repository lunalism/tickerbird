// 왼쪽 사이드바 컴포넌트
// 접기/펼치기, 메뉴 네비게이션, 다크모드 토글 기능을 제공합니다.

"use client";

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

export default function Sidebar() {
  // 현재 경로를 가져와서 활성 메뉴를 판별합니다
  const pathname = usePathname();
  // 전역 상태에서 사이드바, 다크모드 상태를 가져옵니다
  const { isSidebarOpen, toggleSidebar, isDarkMode, toggleDarkMode } =
    useUIStore();

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
        {/* 사이드바 펼쳐졌을 때만 로고 텍스트 표시 */}
        {isSidebarOpen && (
          <span className="text-lg font-bold tracking-tight">
            🐦 Tickerbird
          </span>
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

      {/* 하단: 다크모드 토글 버튼 */}
      <div className="border-t border-border px-2 py-3">
        <button
          onClick={toggleDarkMode}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          aria-label={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
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
      </div>
    </aside>
  );
}
