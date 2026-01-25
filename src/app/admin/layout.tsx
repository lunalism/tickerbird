/**
 * 관리자 페이지 레이아웃
 *
 * /admin/* 경로의 모든 페이지에 적용되는 레이아웃입니다.
 * 관리자 권한 체크 및 사이드바를 포함합니다.
 */

import { AdminLayout } from '@/components/admin';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
