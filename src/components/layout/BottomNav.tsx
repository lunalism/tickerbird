"use client";

import Link from "next/link";
import { menuItems } from '@/constants';
import { MenuIcon } from '@/components/common';
import { useAuthStore } from '@/stores';

interface BottomNavProps {
  activeMenu: string;
  onMenuChange?: (id: string) => void;
}

export function BottomNav({ activeMenu, onMenuChange }: BottomNavProps) {
  const { isLoggedIn } = useAuthStore();

  // 하단 네비: 뉴스, 시세, 캘린더, 커뮤니티 (4개)
  const bottomMenuIds = ['news', 'market', 'calendar', 'community'];
  const bottomMenuItems = bottomMenuIds
    .map(id => menuItems.find(item => item.id === id))
    .filter(Boolean);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden z-50">
      <div className="flex items-center justify-around h-full px-2">
        {bottomMenuItems.map((item) => (
          <Link
            key={item!.id}
            href={item!.href}
            className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
          >
            <div className={`transition-colors ${activeMenu === item!.id ? "text-blue-500" : "text-gray-400"}`}>
              <MenuIcon icon={item!.icon} active={activeMenu === item!.id} />
            </div>
            <span className={`text-xs mt-1 ${activeMenu === item!.id ? "text-blue-500" : "text-gray-500"}`}>
              {item!.label}
            </span>
          </Link>
        ))}

        {/* 로그인/프로필 (로그인 상태에 따라 변경) */}
        <Link
          href={isLoggedIn ? "/profile" : "/login"}
          className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
        >
          <div className={`transition-colors ${activeMenu === 'profile' ? "text-blue-500" : "text-gray-400"}`}>
            <MenuIcon icon="profile" active={activeMenu === 'profile'} />
          </div>
          <span className={`text-xs mt-1 ${activeMenu === 'profile' ? "text-blue-500" : "text-gray-500"}`}>
            {isLoggedIn ? "프로필" : "로그인"}
          </span>
        </Link>
      </div>
    </nav>
  );
}
