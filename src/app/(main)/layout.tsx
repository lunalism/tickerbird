// (main) 그룹 레이아웃
// 로그인 여부를 서버사이드에서 확인하고, 비로그인 시 /login으로 리다이렉트합니다.
// 로그인된 사용자에게 MainLayout(사이드바 포함)을 적용합니다.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MainLayout from "@/components/layout/MainLayout";

export default async function MainGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Supabase 서버 클라이언트로 현재 유저 정보를 확인합니다
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
  if (!user) {
    redirect("/login");
  }

  // 로그인된 경우 사이드바가 포함된 메인 레이아웃 적용
  return <MainLayout>{children}</MainLayout>;
}
