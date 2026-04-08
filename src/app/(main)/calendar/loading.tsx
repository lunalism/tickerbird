// 페이지 로딩 중 표시되는 애니메이션 (Next.js Suspense fallback)

import PageLoading from "@/components/ui/PageLoading";

export default function Loading() {
  return <PageLoading variant="calendar" />;
}
