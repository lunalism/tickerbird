// 모바일 상단 헤더 컴포넌트 (md 미만에서만 표시)
// Tickerbird 로고 + 다크모드 토글 + 알림 벨 아이콘을 포함합니다.

"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, Moon, Sun } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

export default function MobileHeader() {
  // 읽지 않은 알림 여부 (목업, 추후 실제 데이터 연동)
  const hasUnreadNotifications = true;
  // 전역 상태에서 다크모드 상태를 가져옵니다
  const { isDarkMode, toggleDarkMode } = useUIStore();

  return (
    // 모바일(md 미만)에서만 표시
    <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
      {/* 왼쪽: 로고 */}
      <Link href="/news" prefetch={false}>
        <Image
          src="/images/logo-full.svg"
          alt="Tickerbird 로고"
          width={130}
          height={30}
          className="shrink-0"
          priority
        />
      </Link>

      {/* 오른쪽: 다크모드 토글 + 알림 벨 아이콘 */}
      <div className="flex items-center gap-1">
        {/* 다크모드 토글 버튼 */}
        <button
          onClick={toggleDarkMode}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* 알림 벨 아이콘 */}
        <Link
          href="/notifications"
          prefetch={false}
          className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="알림"
        >
          <Bell size={22} />
          {/* 읽지 않은 알림 빨간 뱃지 */}
          {hasUnreadNotifications && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          )}
        </Link>
      </div>
    </header>
  );
}
