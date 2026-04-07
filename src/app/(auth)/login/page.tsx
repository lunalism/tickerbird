// 로그인 페이지 (서버 컴포넌트 래퍼)
// metadata를 export하기 위해 서버 컴포넌트로 유지합니다.
// 실제 UI는 LoginPageClient에서 렌더링합니다.

import type { Metadata } from "next";
import LoginPageClient from "./LoginPageClient";

// 로그인 페이지 탭 제목
export const metadata: Metadata = {
  title: "로그인",
};

export default function LoginPage() {
  return <LoginPageClient />;
}
