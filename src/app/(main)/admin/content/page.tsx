// 관리자 콘텐츠 관리 페이지 (서버 컴포넌트 래퍼)

import type { Metadata } from "next";
import ContentPageClient from "./ContentPageClient";

export const metadata: Metadata = {
  title: "콘텐츠 관리 - 관리자",
  robots: { index: false, follow: false },
};

export default function ContentPage() {
  return <ContentPageClient />;
}
