// 뉴스 수집 API Route Handler (Cron Job용)
// Vercel Cron 또는 CRON_SECRET Bearer 토큰으로 인증합니다.
// 실제 수집 로직은 src/lib/news/collect.ts에서 공유합니다.

import { collectNews } from "@/lib/news/collect";

// Fluid Compute 환경에서 함수 최대 실행 시간 (초).
// 번역 batch 사이 sleep 으로 인해 한 사이클이 약 2 분 소요되므로
// Hobby Fluid Compute 한도(300초)의 절반 수준인 180으로 설정.
// RSS/네이버 수집 실패 시 retry 까지 감안한 안전 마진.
export const maxDuration = 180;

export async function GET(request: Request) {
  // 인증: Vercel Cron 요청이거나 CRON_SECRET이 맞으면 허용
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const authHeader = request.headers.get("authorization");
  const isManualCall = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isVercelCron && !isManualCall) {
    return Response.json({ error: "인증 실패" }, { status: 401 });
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
    console.error("뉴스 수집 전체 실패:", error);
    return Response.json(
      { error: "뉴스 수집 중 오류 발생" },
      { status: 500 }
    );
  }
}
