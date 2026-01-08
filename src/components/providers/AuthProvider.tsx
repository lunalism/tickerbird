'use client';

/**
 * AuthProvider - Supabase 인증 상태 동기화
 *
 * Supabase 세션 변경을 감지하여 Zustand 스토어와 동기화합니다.
 * OAuth 로그인(Google 등) 후 세션이 생성되면 자동으로 스토어를 업데이트합니다.
 *
 * 주요 기능:
 * - 앱 시작 시 기존 세션 확인
 * - OAuth 로그인 후 세션 감지
 * - 로그아웃 시 스토어 초기화
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, logout } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    // 이미 초기화되었으면 스킵
    if (initialized.current) return;
    initialized.current = true;

    const supabase = createClient();

    // 사용자 정보를 스토어에 저장하는 헬퍼 함수
    // profiles 테이블의 커스텀 이미지를 우선 사용
    const syncUserToStore = async (user: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, unknown>;
    }) => {
      // profiles 테이블에서 커스텀 프로필 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single();

      // 우선순위: profiles 테이블 > Google OAuth user_metadata
      const userData = {
        id: user.id,
        email: user.email || '',
        name: profile?.name ||
              (user.user_metadata?.full_name as string) ||
              (user.user_metadata?.name as string) ||
              user.email?.split('@')[0] ||
              '사용자',
        // profiles.avatar_url이 있으면 우선 사용 (사용자가 업로드한 이미지)
        avatarUrl: profile?.avatar_url ||
                   (user.user_metadata?.avatar_url as string) ||
                   (user.user_metadata?.picture as string),
      };
      console.log('[AuthProvider] Setting user:', userData);
      setUser(userData);
    };

    // 1. 현재 세션 확인 (페이지 로드 시)
    const checkSession = async () => {
      console.log('[AuthProvider] Checking initial session...');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[AuthProvider] Error getting session:', error.message);
        return;
      }

      if (session?.user) {
        console.log('[AuthProvider] Found existing session for:', session.user.email);
        await syncUserToStore(session.user);
      } else {
        console.log('[AuthProvider] No existing session found');
      }
    };

    checkSession();

    // 2. 세션 변경 감지 (OAuth 콜백 후 등)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthProvider] Auth state changed:', event, session?.user?.email);

        if (event === 'SIGNED_IN' && session?.user) {
          await syncUserToStore(session.user);
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthProvider] User signed out');
          logout();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('[AuthProvider] Token refreshed');
          await syncUserToStore(session.user);
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          // 초기 세션 로드 시에도 동기화
          console.log('[AuthProvider] Initial session loaded');
          await syncUserToStore(session.user);
        }
      }
    );

    // 클린업
    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, logout]);

  return <>{children}</>;
}
