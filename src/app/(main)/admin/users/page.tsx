// 관리자 사용자 관리 페이지 (서버 컴포넌트 래퍼)

import type { Metadata } from "next";
import UsersPageClient from "./UsersPageClient";

export const metadata: Metadata = {
  title: "사용자 관리 - 관리자",
  robots: { index: false, follow: false },
};

export default function UsersPage() {
  return <UsersPageClient />;
}
