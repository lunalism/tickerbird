"use client";

import Link from "next/link";
import { menuItems } from '@/constants';
import { MenuIcon } from '@/components/common';
import { useAuthStore } from '@/stores';

interface SidebarProps {
  activeMenu: string;
  onMenuChange?: (id: string) => void;
}

export function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  const { isLoggedIn, userName } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 h-screen bg-white border-r border-gray-100 hidden md:flex flex-col py-4 z-50 transition-all duration-300 w-[72px] lg:w-60">
      {/* Logo */}
      <div className="px-4 mb-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-bold text-gray-900 hidden lg:block">AlphaBoard</span>
        </Link>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`group relative w-full h-12 rounded-xl flex items-center transition-all duration-200 ${
              activeMenu === item.id
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50 text-gray-600"
            }`}
            title={item.label}
          >
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <MenuIcon icon={item.icon} active={activeMenu === item.id} />
            </div>
            <span className={`text-sm font-medium hidden lg:block ${
              activeMenu === item.id ? "text-blue-600" : "text-gray-700"
            }`}>
              {item.label}
            </span>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap lg:hidden z-50">
              {item.label}
            </div>
          </Link>
        ))}
      </nav>

      {/* Login/User Section */}
      <div className="px-3 mt-auto">
        {isLoggedIn ? (
          <Link
            href="/profile"
            className="group relative w-full h-12 rounded-xl flex items-center hover:bg-blue-50 transition-colors"
            title={userName}
          >
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">{userName.charAt(0)}</span>
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700 hidden lg:block">{userName}</span>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap lg:hidden z-50">
              {userName}
            </div>
          </Link>
        ) : (
          <Link
            href="/login"
            className="group relative w-full h-12 rounded-xl flex items-center hover:bg-gray-50 transition-colors"
            title="로그인"
          >
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 hidden lg:block">로그인</span>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap lg:hidden z-50">
              로그인
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
