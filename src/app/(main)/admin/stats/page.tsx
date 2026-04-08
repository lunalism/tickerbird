// 관리자 통계 페이지 (서버 컴포넌트 래퍼)

import type { Metadata } from "next";
import StatsPageClient from "./StatsPageClient";

export const metadata: Metadata = {
  title: "통계 - 관리자",
  robots: { index: false, follow: false },
};

export default function StatsPage() {
  return <StatsPageClient />;
}
