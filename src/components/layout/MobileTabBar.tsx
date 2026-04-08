// 모바일 하단 탭바 컴포넌트 (md 미만에서만 표시)
// 뉴스, 커뮤니티, 캘린더 + 로그인 상태에 따라 마지막 탭이 변경됩니다.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, MessageSquare, Calendar, User, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// 고정 탭 아이템 (처음 3개)
const fixedTabs = [
  { label: "뉴스", icon: Globe, href: "/news" },
  { label: "커뮤니티", icon: MessageSquare, href: "/community" },
  { label: "캘린더", icon: Calendar, href: "/calendar" },
] as const;

export default function MobileTabBar() {
  // 현재 경로로 활성 탭 판별
  const pathname = usePathname();
  // 로그인 상태 감지
  const { isLoggedIn } = useAuth();

  // 마지막 탭: 로그인 상태에 따라 내정보 또는 로그인
  const lastTab = isLoggedIn
    ? { label: "내정보", icon: User, href: "/profile" }
    : { label: "로그인", icon: LogIn, href: "/login" };

  const tabItems = [...fixedTabs, lastTab];

  return (
    // 모바일(md 미만)에서만 표시, 하단 고정
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background md:hidden">
      {tabItems.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={false}
            className={`
              flex flex-1 flex-col items-center gap-0.5 py-2
              transition-colors duration-150
              ${isActive ? "text-foreground" : "text-muted-foreground"}
            `}
          >
            <tab.icon size={20} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
