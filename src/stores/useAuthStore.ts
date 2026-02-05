/**
 * 인증 상태 관리 스토어
 *
 * Zustand를 사용한 전역 인증 상태 관리
 * Supabase 세션과 연동하여 사용자 정보 저장
 *
 * 주요 기능:
 * - 로그인/로그아웃 상태 관리
 * - Supabase 사용자 ID 저장 (DB 연동용)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 사용자 정보 인터페이스
 * Supabase auth.users 테이블의 정보와 매핑
 */
interface User {
  // Supabase auth.users.id - profiles 테이블 연동에 필요
  id: string;
  // 사용자 이메일
  email: string;
  // 표시 이름 (Google OAuth에서 가져오거나 기본값 사용)
  name: string;
  // 프로필 이미지 URL (선택)
  avatarUrl?: string;
}

/**
 * 인증 상태 인터페이스
 */
interface AuthState {
  // 로그인 여부
  isLoggedIn: boolean;
  // 현재 로그인한 사용자 정보 (null이면 비로그인)
  user: User | null;
  // 사용자 이름 (하위 호환성)
  userName: string;

  // === 액션 함수들 ===

  /**
   * 사용자 정보 설정 (로그인 성공 시 호출)
   * @param user 사용자 정보 객체
   */
  setUser: (user: User) => void;

  /**
   * 로그아웃 처리
   * 사용자 정보 초기화 및 로그인 상태 false로 변경
   */
  logout: () => void;

  // === 하위 호환성 함수들 (기존 코드용) ===
  login: () => void;
  toggleLogin: () => void;
}

/**
 * 인증 상태 스토어
 *
 * persist 미들웨어를 사용하여 localStorage에 상태 저장
 * 페이지 새로고침 시에도 로그인 상태 유지
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // 초기 상태
      isLoggedIn: false,
      user: null,
      // 사용자 이름 (하위 호환성 - user.name과 동기화됨)
      userName: '사용자',

      // 사용자 설정 (로그인 시)
      setUser: (user: User) => {
        set({
          isLoggedIn: true,
          user,
          userName: user.name,
        });
      },

      // 로그아웃
      logout: () =>
        set({
          isLoggedIn: false,
          user: null,
          userName: '사용자',
        }),

      // === 하위 호환성 함수들 ===
      // login: 아무 동작 없음 (로그인 페이지로 리다이렉트는 컴포넌트에서 처리)
      login: () => {
        // 하위 호환성을 위한 빈 함수
        // 실제 로그인은 /login 페이지에서 처리
      },
      // toggleLogin: 로그인 토글 (하위 호환성)
      toggleLogin: () =>
        set((state) => ({ isLoggedIn: !state.isLoggedIn })),
    }),
    {
      // localStorage 키
      name: 'tickerbird-auth',
      // 저장할 필드 선택 (민감 정보 제외 가능)
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        user: state.user,
      }),
    }
  )
);
