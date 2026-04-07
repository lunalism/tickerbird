// (main) 그룹 레이아웃
// 로그인 여부와 관계없이 사이드바 포함 레이아웃을 표시합니다.

import MainLayout from "@/components/layout/MainLayout";

export default function MainGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 로그인 여부 관계없이 메인 레이아웃(사이드바 포함) 적용
  return <MainLayout>{children}</MainLayout>;
}
