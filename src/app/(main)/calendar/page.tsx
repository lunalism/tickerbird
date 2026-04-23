// 경제 캘린더 페이지 (서버 컴포넌트)
// FRED API 연동 월간 달력뷰의 진입점입니다.
// - metadata: 페이지 타이틀/설명
// - 실제 UI는 클라이언트 상태(월 이동, 날짜 선택)가 필요하므로 CalendarClient에서 처리
// - 용어 데이터(glossary)는 서버에서 한 번에 조회해 props 로 전달

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { CalendarDBTerm } from "@/types/calendar";
import CalendarClient from "./CalendarClient";

export const metadata: Metadata = {
  title: "경제 캘린더 | Tickerbird",
  description:
    "미국 주요 경제지표 발표 일정(CPI · 고용 · GDP · FOMC · 소매판매 · 무역수지)을 월간 달력으로 한눈에.",
};

/**
 * Supabase glossary 테이블에서 캘린더 매칭용 용어 데이터를 가져온다.
 * release_id 가 있는 row 만 (= FRED 이벤트로 발표되는 지표) 대상.
 * 반환 형태: { 10: {...}, 50: {...}, 53: {...}, ... } 형태의 맵.
 */
async function getTermsByReleaseId(): Promise<Record<number, CalendarDBTerm>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("glossary")
    .select("*")
    .not("release_id", "is", null);

  if (error) {
    // DB 오류 시에도 캘린더 자체는 동작해야 하므로 빈 맵 반환.
    // 결과적으로 지표 클릭 시 "용어 정보 없음" 상태가 됨.
    console.error("[Calendar] glossary 조회 실패:", error.message);
    return {};
  }

  // release_id 를 key 로 하는 맵으로 변환.
  const map: Record<number, CalendarDBTerm> = {};
  for (const row of data ?? []) {
    if (row.release_id !== null) {
      map[row.release_id] = row as CalendarDBTerm;
    }
  }
  return map;
}

export default async function CalendarPage() {
  // 용어 데이터를 서버에서 미리 조회해 클라이언트로 전달.
  // FRED 이벤트 데이터는 CalendarClient 내부에서 useEffect 로 계속 처리.
  const termsByReleaseId = await getTermsByReleaseId();
  return <CalendarClient termsByReleaseId={termsByReleaseId} />;
}
