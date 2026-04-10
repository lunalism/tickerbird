// 경제 캘린더 API Route Handler
// FRED(St. Louis Fed) release/dates 엔드포인트를 서버사이드에서 호출해
// 미국 주요 경제지표 발표 일정을 반환합니다.
//
// - API 키는 절대 클라이언트로 노출되지 않도록 이 서버 라우트에서만 사용합니다.
// - year/month 쿼리 파라미터로 특정 월만 필터링하여 응답 페이로드를 줄입니다.
// - 18개 release_id를 Promise.all로 병렬 호출합니다.

import type { CalendarEvent } from "@/types/calendar";

/** FRED release/dates 엔드포인트 베이스 URL */
const FRED_RELEASE_DATES_URL =
  "https://api.stlouisfed.org/fred/release/dates";

/** FRED release_id → 한글 명칭/중요도 메타 정보 매핑 */
// 미국 주요 거시 지표 18종 (물가/고용/성장/금리/부동산/심리/무역).
// 중요도 high: 시장 변동성을 크게 유발하는 핵심 지표
// 중요도 medium: 보조 지표 / 선행 지표
const RELEASE_META: Record<
  number,
  { title: string; importance: CalendarEvent["importance"] }
> = {
  // ── 기존 6개 (변경 금지) ──
  10: { title: "CPI 소비자물가지수", importance: "high" },
  50: { title: "고용/실업률", importance: "high" },
  53: { title: "GDP", importance: "high" },
  392: { title: "FOMC 금리결정", importance: "high" },
  56: { title: "소매판매", importance: "medium" },
  46: { title: "무역수지", importance: "medium" },
  // ── 신규 추가 12개 ──
  54: { title: "PCE 물가지수", importance: "high" },
  82: { title: "PPI 생산자물가지수", importance: "high" },
  112: { title: "신규실업수당청구", importance: "high" },
  17: { title: "주택착공", importance: "medium" },
  13: { title: "산업생산", importance: "medium" },
  184: { title: "ISM 제조업지수", importance: "medium" },
  57: { title: "내구재주문", importance: "medium" },
  245: { title: "소비자신뢰지수", importance: "medium" },
  398: { title: "신규주택판매", importance: "medium" },
  23: { title: "경상수지", importance: "medium" },
  19: { title: "기존주택판매", importance: "medium" },
  111: { title: "미시간대 소비자심리지수", importance: "medium" },
};

/** FRED API 응답 중 우리가 사용하는 필드만 발췌한 타입 */
interface FredReleaseDatesResponse {
  release_dates?: Array<{
    release_id: number;
    release_name?: string;
    date: string; // YYYY-MM-DD
  }>;
}

/**
 * 단일 release_id에 대해 FRED API를 호출하고 CalendarEvent[] 로 변환합니다.
 * - 네트워크/JSON 오류는 빈 배열을 반환해 다른 지표 호출에 영향을 주지 않습니다.
 * - Next.js fetch 캐시를 1시간(3600s) 사용해 API 쿼터 부담을 낮춥니다.
 */
async function fetchReleaseEvents(
  releaseId: number,
  apiKey: string
): Promise<CalendarEvent[]> {
  const meta = RELEASE_META[releaseId];
  if (!meta) return [];

  // FRED 쿼리 파라미터 구성
  // - include_release_dates_with_no_data=true: 미발표 예정일도 포함 (선행 일정 노출)
  // - sort_order=asc: 과거→미래 순서 (필터 후 정렬 부담 감소)
  const url =
    `${FRED_RELEASE_DATES_URL}` +
    `?release_id=${releaseId}` +
    `&include_release_dates_with_no_data=true` +
    `&sort_order=asc` +
    `&api_key=${apiKey}` +
    `&file_type=json`;

  try {
    const res = await fetch(url, {
      // 1시간 단위로 재검증 (FRED 데이터는 자주 변하지 않음)
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(
        `FRED API 오류 (release_id=${releaseId}): ${res.status} ${res.statusText}`
      );
      return [];
    }
    const json = (await res.json()) as FredReleaseDatesResponse;
    const dates = json.release_dates ?? [];

    // CalendarEvent 형태로 변환
    return dates.map((d) => ({
      date: d.date,
      title: meta.title,
      releaseId,
      importance: meta.importance,
      country: "US" as const,
    }));
  } catch (error) {
    console.error(`FRED API 호출 실패 (release_id=${releaseId}):`, error);
    return [];
  }
}

/**
 * GET /api/calendar?year=2026&month=4
 * 지정된 월의 경제 지표 발표 이벤트 목록을 반환합니다.
 */
export async function GET(request: Request) {
  // FRED API 키 확인 — 환경변수 누락 시 명확한 에러 응답
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "FRED_API_KEY 환경변수가 설정되어 있지 않습니다" },
      { status: 500 }
    );
  }

  // 쿼리 파라미터 파싱 (기본값: 현재 연/월)
  const url = new URL(request.url);
  const now = new Date();
  const year = parseInt(
    url.searchParams.get("year") ?? String(now.getFullYear()),
    10
  );
  const month = parseInt(
    url.searchParams.get("month") ?? String(now.getMonth() + 1),
    10
  );

  // 유효성 검사 (year: 1900~2100, month: 1~12)
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    year < 1900 ||
    year > 2100 ||
    month < 1 ||
    month > 12
  ) {
    return Response.json(
      { error: "잘못된 year/month 파라미터입니다" },
      { status: 400 }
    );
  }

  // 6개 release_id 병렬 호출
  const releaseIds = Object.keys(RELEASE_META).map((id) => parseInt(id, 10));
  const results = await Promise.all(
    releaseIds.map((id) => fetchReleaseEvents(id, apiKey))
  );

  // 1차원 배열로 평탄화 + 해당 월만 필터
  // YYYY-MM 접두사 비교로 안전하게 필터링 (Date 객체 변환 불필요)
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const events: CalendarEvent[] = results
    .flat()
    .filter((e) => e.date.startsWith(monthPrefix))
    // 날짜 오름차순, 같은 날은 중요도 → releaseId 순으로 정렬
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const order = { high: 0, medium: 1, low: 2 };
      if (order[a.importance] !== order[b.importance]) {
        return order[a.importance] - order[b.importance];
      }
      return a.releaseId - b.releaseId;
    });

  return Response.json({ events });
}
