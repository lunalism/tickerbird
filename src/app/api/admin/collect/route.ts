// 관리자 뉴스 수집 프록시 API Route
// 관리자 인증 후 뉴스 수집을 실행합니다.
// CRON_SECRET을 클라이언트에 노출하지 않고 안전하게 수집을 트리거합니다.

import { verifyAdmin } from "@/lib/auth";
import { collectNews } from "@/lib/news/collect";

// POST: 관리자가 수동으로 뉴스 수집 실행
export async function POST() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return Response.json({ error: "권한 없음" }, { status: 403 });
  }

  try {
    const result = await collectNews();

    if (!result.success) {
      return Response.json(
        { error: "데이터 저장 실패", detail: result.error },
        { status: 500 }
      );
    }

    return Response.json(result);
  } catch (error) {
    console.error("관리자 뉴스 수집 실패:", error);
    return Response.json(
      { error: "뉴스 수집 중 오류 발생" },
      { status: 500 }
    );
  }
}
