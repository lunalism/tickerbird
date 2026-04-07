// Supabase 인증 상태 감지 커스텀 훅
// onAuthStateChange를 사용해 실시간으로 로그인 상태를 추적합니다.
// profiles 테이블에서 최신 display_name을 가져와 닉네임 동기화를 보장합니다.

"use client";

import { useEffect, useState } from "react";
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

export function useAuth(): AuthState {
  // 유저 정보 상태
  const [user, setUser] = useState<User | null>(null);
  // 초기 로딩 상태 (true로 시작하여 깜빡임 방지)
  const [isLoading, setIsLoading] = useState(true);
  // profiles 테이블에서 가져온 최신 닉네임
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);

  // profiles 테이블에서 최신 display_name을 가져옵니다
  const fetchProfileName = async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    if (data?.display_name) {
      setProfileDisplayName(data.display_name);
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // 현재 세션에서 유저 정보를 가져옵니다
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      // 로그인된 유저가 있으면 profiles 테이블에서 닉네임 조회
      if (user) fetchProfileName(user.id);
      setIsLoading(false);
    });

    // 인증 상태 변경을 실시간으로 감지합니다
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      // 로그인/닉네임 변경 시 profiles에서 최신 이름 다시 조회
      if (currentUser) fetchProfileName(currentUser.id);
      else setProfileDisplayName(null);
      setIsLoading(false);
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
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
