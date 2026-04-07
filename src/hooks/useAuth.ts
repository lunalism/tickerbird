// Supabase 인증 상태 감지 커스텀 훅
// onAuthStateChange를 사용해 실시간으로 로그인 상태를 추적합니다.
// profiles 테이블에서 최신 display_name을 가져옵니다.
// 핵심 원칙: isLoading이 영원히 true로 남는 상황을 절대 허용하지 않습니다.

"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// 인증 상태 반환 타입
interface AuthState {
  // 현재 로그인된 유저 (null이면 비로그인)
  user: User | null;
  // 인증 상태 확인 중 여부 (초기 로딩)
  isLoading: boolean;
  // 로그인 여부 (로딩 완료 후에만 신뢰 가능)
  isLoggedIn: boolean;
  // profiles 테이블 기반 표시 이름 (닉네임 동기화용)
  displayName: string;
  // 아바타 URL
  avatarUrl: string;
}

// profiles 조회 타임아웃 (3초 초과 시 강제로 넘어감)
const PROFILE_TIMEOUT = 3000;

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // profiles 테이블에서 display_name을 1회 조회합니다
  // 타임아웃을 적용하여 지연/실패 시에도 반드시 반환합니다
  const fetchProfileName = async (userId: string): Promise<string | null> => {
    try {
      const supabase = createClient();

      // 타임아웃과 profiles 조회를 경쟁시킵니다
      const result = await Promise.race([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .single(),
        // 타임아웃 시 null 반환
        new Promise<{ data: null; error: { message: string } }>((resolve) =>
          setTimeout(
            () => resolve({ data: null, error: { message: "timeout" } }),
            PROFILE_TIMEOUT
          )
        ),
      ]);

      if (result.data && !result.error) {
        return result.data.display_name;
      }

      if (result.error) {
        console.error("[useAuth] profiles 조회 실패:", result.error.message);
      }
    } catch (err) {
      console.error("[useAuth] profiles 조회 예외:", err);
    }

    return null;
  };

  useEffect(() => {
    mountedRef.current = true;
    const supabase = createClient();

    // 초기화: getUser + profiles 조회, finally로 반드시 로딩 해제
    const initialize = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!mountedRef.current) return;
        setUser(currentUser);

        if (currentUser) {
          const name = await fetchProfileName(currentUser.id);
          if (mountedRef.current) {
            setProfileDisplayName(name);
          }
        }
      } catch (err) {
        console.error("[useAuth] 초기화 실패:", err);
      } finally {
        // 어떤 상황에서든 반드시 로딩 해제
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    // 인증 상태 변경 감지 (로그인/로그아웃/토큰 갱신)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // 비동기로 profiles 조회 (로딩 상태를 블로킹하지 않음)
        fetchProfileName(currentUser.id).then((name) => {
          if (mountedRef.current) {
            setProfileDisplayName(name);
          }
        });
      } else {
        setProfileDisplayName(null);
      }

      // onAuthStateChange 시점에서는 로딩이 이미 false이므로 별도 처리 불필요
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // 표시 이름: profiles > user_metadata > 이메일 순으로 fallback
  const displayName =
    profileDisplayName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "사용자";

  // 아바타 URL: user_metadata에서 가져옴
  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    "";

  return {
    user,
    isLoading,
    isLoggedIn: !isLoading && !!user,
    displayName,
    avatarUrl,
  };
}
