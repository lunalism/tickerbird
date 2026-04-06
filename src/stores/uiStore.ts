// UI 상태 관리 Zustand 스토어
// 사이드바 열림/닫힘, 다크모드 상태를 전역으로 관리합니다.

import { create } from "zustand";

// UI 스토어 타입 정의
interface UIState {
  // 사이드바 열림 여부 (true: 펼침, false: 접힘)
  isSidebarOpen: boolean;
  // 사이드바 상태 토글 함수
  toggleSidebar: () => void;
  // 다크모드 활성화 여부
  isDarkMode: boolean;
  // 다크모드 상태 토글 함수
  toggleDarkMode: () => void;
}

// UI 스토어 생성
export const useUIStore = create<UIState>((set) => ({
  // 기본값: 사이드바 펼침
  isSidebarOpen: true,
  // 사이드바 열림/닫힘 토글
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  // 기본값: 라이트 모드
  isDarkMode: false,
  // 다크모드 토글 시 HTML에 dark 클래스를 추가/제거합니다
  toggleDarkMode: () =>
    set((state) => {
      const newDarkMode = !state.isDarkMode;
      // HTML 요소에 dark 클래스 토글 (Tailwind CSS 다크모드용)
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", newDarkMode);
      }
      return { isDarkMode: newDarkMode };
    }),
}));
