// 내 정보 페이지 (서버 컴포넌트 래퍼)
// metadata를 export하기 위해 서버 컴포넌트로 유지합니다.

import type { Metadata } from "next";
import ProfilePageClient from "./ProfilePageClient";

// 내 정보 페이지 탭 제목
export const metadata: Metadata = {
  title: "내 정보",
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
