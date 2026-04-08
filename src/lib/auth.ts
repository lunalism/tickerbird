// 서버 전용 인증 유틸리티
// API Route에서 공통으로 사용하는 인증 함수 모음

import { createClient } from "@/lib/supabase/server";

/**
 * 현재 요청이 관리자인지 검증
 * 쿠키 기반 세션에서 유저를 확인하고 profiles.is_admin을 체크합니다.
 * @returns 관리자면 true, 아니면 false
 */
export async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient();

  // 현재 로그인 유저 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // profiles 테이블에서 is_admin 여부 확인
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin === true;
}
