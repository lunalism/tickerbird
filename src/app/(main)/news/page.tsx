// 뉴스 페이지 (서버 컴포넌트 래퍼)
// metadata를 export하기 위해 서버 컴포넌트로 유지합니다.
// 실제 UI는 NewsPageClient에서 렌더링합니다.

import type { Metadata } from "next";
import NewsPageClient from "./NewsPageClient";

// 뉴스 페이지 탭 제목
export const metadata: Metadata = {
  title: "뉴스",
};

export default function NewsPage() {
  return <NewsPageClient />;
}
