"use client";

import Link from "next/link";
import { menuItems } from '@/constants';
import { MenuIcon } from '@/components/common';

interface BottomNavProps {
  activeMenu: string;
  onMenuChange?: (id: string) => void;
}

export function BottomNav({ activeMenu, onMenuChange }: BottomNavProps) {
  const bottomMenuItems = menuItems.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden z-50">
      <div className="flex items-center justify-around h-full px-2">
        {bottomMenuItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
          >
            <div className={`transition-colors ${activeMenu === item.id ? "text-blue-500" : "text-gray-400"}`}>
              <MenuIcon icon={item.icon} active={activeMenu === item.id} />
            </div>
            <span className={`text-xs mt-1 ${activeMenu === item.id ? "text-blue-500" : "text-gray-500"}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
