// 뉴스 페이지 (서버 컴포넌트 래퍼)
// metadata를 export하기 위해 서버 컴포넌트로 유지합니다.
// NewsModal은 항상 마운트되어 있어야 모달이 즉시 열립니다.

import type { Metadata } from "next";
import NewsPageClient from "./NewsPageClient";
import NewsModal from "@/components/news/NewsModal";

// 뉴스 페이지 탭 제목
export const metadata: Metadata = {
  title: "뉴스",
};

export default function NewsPage() {
  return (
    <>
      <NewsPageClient />
      <NewsModal />
    </>
  );
}
