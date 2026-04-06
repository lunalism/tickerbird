// 메인 레이아웃 컴포넌트
// 왼쪽 사이드바 + 오른쪽 메인 콘텐츠 영역으로 구성됩니다.
// 사이드바 상태에 따라 콘텐츠 영역 너비가 자동 조절됩니다.

"use client";

import Sidebar from "@/components/layout/Sidebar";
import { useUIStore } from "@/stores/uiStore";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  // 사이드바 열림 상태를 전역 스토어에서 가져옵니다
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

  return (
    <div className="flex min-h-screen">
      {/* 왼쪽 사이드바 */}
      <Sidebar />
      {/* 메인 콘텐츠 영역 - 사이드바 너비만큼 왼쪽 여백 적용 */}
      <main
        className={`
          flex-1 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "ml-60" : "ml-16"}
        `}
      >
        {children}
      </main>
    </div>
  );
}
