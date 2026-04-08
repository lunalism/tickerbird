// 로그인 페이지 (서버 컴포넌트 래퍼)
// (main) 그룹 안에 위치하여 데스크탑에서는 사이드바와 함께 표시됩니다.

import type { Metadata } from "next";
import LoginPageClient from "./LoginPageClient";

// 로그인 페이지 메타데이터 (검색엔진 인덱싱 불필요)
export const metadata: Metadata = {
  title: "로그인",
  description:
    "Tickerbird에 로그인하고 AI 금융 뉴스 분석 서비스를 이용하세요.",
  robots: { index: false },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
