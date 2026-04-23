// 경제 캘린더 클라이언트 컴포넌트
// FRED API에서 받아온 미국 주요 경제지표 발표 일정을 월간 달력 그리드로 표시합니다.
//
// 구조:
//  - 상단: 타이틀 + 이전월/다음월 이동
//  - 주간 헤더: 일~토
//  - 6주 × 7일 그리드: 날짜 + 중요도 점
//  - 하단: 선택한 날짜의 이벤트 카드 목록

"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarDBTerm, CalendarEvent } from "@/types/calendar";

/**
 * CalendarClient 가 서버 컴포넌트로부터 받는 props.
 * termsByReleaseId: release_id 를 key 로 하는 용어 맵.
 * 3c 커밋에서 지표 클릭 시 모달 표시에 활용 예정.
 */
interface CalendarClientProps {
  termsByReleaseId: Record<number, CalendarDBTerm>;
}

/** 주간 헤더 라벨 (일요일 시작) */
const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 한글 월 라벨 */
function formatMonthLabel(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

/** YYYY-MM-DD 포맷터 (로컬 타임존 기준 — UTC 변환으로 인한 하루 밀림 방지) */
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 6주(42칸) 달력 셀 배열을 생성합니다.
 * 첫 주 앞부분은 이전 달, 마지막 주 뒷부분은 다음 달 날짜로 채워 항상 42칸을 유지합니다.
 */
function buildMonthGrid(year: number, month: number): Date[] {
  // month는 1-based(사용자 인터페이스), Date는 0-based이므로 month-1 사용
  const firstOfMonth = new Date(year, month - 1, 1);
  const startWeekday = firstOfMonth.getDay(); // 0(일) ~ 6(토)

  // 그리드 시작일 = 이번 달 1일에서 startWeekday만큼 앞으로
  const gridStart = new Date(year, month - 1, 1 - startWeekday);

  // 42칸 채우기
  const cells: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

/** 중요도 → 점 색상 클래스 */
function importanceDotClass(importance: CalendarEvent["importance"]): string {
  switch (importance) {
    case "high":
      return "bg-red-500";
    case "medium":
      return "bg-yellow-500";
    default:
      return "bg-gray-400";
  }
}

/** 중요도 → 한글 배지 라벨 */
function importanceLabel(importance: CalendarEvent["importance"]): string {
  switch (importance) {
    case "high":
      return "높음";
    case "medium":
      return "보통";
    default:
      return "낮음";
  }
}

export default function CalendarClient({
  termsByReleaseId,
}: CalendarClientProps) {
  // 다음 커밋(3c) 에서 지표 클릭 핸들러 구현 시 사용 예정.
  void termsByReleaseId;

  // 현재 표시 중인 연/월 (오늘 날짜로 초기화)
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1);

  // 선택된 날짜 (기본: 오늘)
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(today));

  // API 응답 상태
  // - React 19의 set-state-in-effect 규칙을 피하기 위해
  //   "어떤 year/month에 대한 결과인지"를 함께 저장합니다.
  //   현재 year/month와 비교해 loading/events/error를 파생합니다.
  type FetchResult = {
    key: string;
    events: CalendarEvent[];
  };
  type FetchError = {
    key: string;
    message: string;
  };
  const [fetched, setFetched] = useState<FetchResult | null>(null);
  const [errorState, setErrorState] = useState<FetchError | null>(null);

  // 현재 표시 중인 키 (year-month) — 파생 상태 비교용
  const currentKey = `${year}-${month}`;

  // 파생: 현재 키에 해당하는 이벤트/에러/로딩 여부
  const events: CalendarEvent[] =
    fetched?.key === currentKey ? fetched.events : [];
  const error: string | null =
    errorState?.key === currentKey ? errorState.message : null;
  const isLoading =
    fetched?.key !== currentKey && errorState?.key !== currentKey;

  // 월이 바뀔 때마다 /api/calendar 호출
  // setState는 async then/catch 콜백에서만 호출하므로 이펙트 본문에서 동기 cascade가 발생하지 않습니다.
  useEffect(() => {
    let cancelled = false;
    const key = `${year}-${month}`;

    fetch(`/api/calendar?year=${year}&month=${month}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`API 오류: ${res.status}`);
        return (await res.json()) as { events: CalendarEvent[] };
      })
      .then((data) => {
        if (cancelled) return;
        setFetched({ key, events: data.events ?? [] });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("경제 캘린더 조회 실패:", err);
        setErrorState({ key, message: "일정을 불러오지 못했습니다" });
      });

    // StrictMode/언마운트 안전장치
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  // 날짜별 이벤트 인덱스 (date → CalendarEvent[])
  // events 배열은 매 렌더마다 새로 파생되므로 fetched 원본을 의존성으로 사용합니다.
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.date);
      if (list) list.push(ev);
      else map.set(ev.date, [ev]);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetched, currentKey]);

  // 6주 × 7일 그리드 셀
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // 오늘 날짜 키 (문자열 비교용)
  const todayKey = toDateKey(today);

  // 이전/다음 달 이동
  const goPrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const goNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // 선택된 날짜의 이벤트 목록
  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      {/* 헤더: 타이틀 + 월 이동 */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground md:text-2xl">
          경제 캘린더
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goPrevMonth}
            aria-label="이전 달"
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-[6.5rem] text-center text-sm font-medium text-foreground">
            {formatMonthLabel(year, month)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goNextMonth}
            aria-label="다음 달"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {/* 주간 헤더 */}
      <div className="grid grid-cols-7 border-t border-l border-border bg-muted/30 text-xs font-medium text-muted-foreground">
        {WEEK_DAYS.map((label, idx) => (
          <div
            key={label}
            className={cn(
              "border-r border-b border-border px-2 py-2 text-center",
              // 일요일은 빨강, 토요일은 파랑 톤
              idx === 0 && "text-red-500",
              idx === 6 && "text-blue-500"
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 월간 그리드 (6주 × 7일) */}
      <div className="grid grid-cols-7 border-l border-border">
        {cells.map((cellDate, idx) => {
          const cellKey = toDateKey(cellDate);
          const isCurrentMonth = cellDate.getMonth() === month - 1;
          const isToday = cellKey === todayKey;
          const isSelected = cellKey === selectedDate;
          const cellEvents = eventsByDate.get(cellKey) ?? [];

          return (
            <button
              key={`${cellKey}-${idx}`}
              type="button"
              onClick={() => setSelectedDate(cellKey)}
              className={cn(
                "relative flex h-20 flex-col items-start gap-1 border-r border-b border-border p-1.5 text-left transition-colors md:h-24",
                "hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                // 다른 달 날짜는 흐리게
                !isCurrentMonth && "bg-muted/20 text-muted-foreground/60",
                // 선택된 셀 강조
                isSelected && "bg-primary/10 ring-1 ring-inset ring-primary/40"
              )}
            >
              {/* 날짜 숫자 — 오늘은 동그란 배경 */}
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday &&
                    "bg-primary text-primary-foreground font-semibold",
                  !isToday && isCurrentMonth && "text-foreground"
                )}
              >
                {cellDate.getDate()}
              </span>

              {/* 이벤트 중요도 점 (최대 4개까지만 노출, 초과는 +N) */}
              {cellEvents.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {cellEvents.slice(0, 4).map((ev) => (
                    <span
                      key={`${ev.releaseId}-${ev.date}`}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        importanceDotClass(ev.importance)
                      )}
                      aria-hidden
                    />
                  ))}
                  {cellEvents.length > 4 && (
                    <span className="text-[10px] leading-none text-muted-foreground">
                      +{cellEvents.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 하단 이벤트 목록 */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          {selectedDate} 일정
        </h2>

        {/* 로딩 스켈레톤 */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-14 w-full animate-pulse rounded-lg border border-border bg-muted/40"
              />
            ))}
          </div>
        )}

        {/* 에러 표시 */}
        {!isLoading && error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* 이벤트 카드 목록 (혹은 빈 상태) */}
        {!isLoading && !error && (
          <>
            {selectedEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                이벤트가 없습니다
              </div>
            ) : (
              <ul className="space-y-2">
                {selectedEvents.map((ev) => (
                  <li
                    key={`${ev.releaseId}-${ev.date}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
                  >
                    {/* 중요도 배지 */}
                    <span
                      className={cn(
                        "inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[11px] font-semibold",
                        ev.importance === "high"
                          ? "bg-red-500/15 text-red-600 dark:text-red-400"
                          : ev.importance === "medium"
                            ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                            : "bg-gray-500/15 text-gray-600 dark:text-gray-400"
                      )}
                    >
                      {importanceLabel(ev.importance)}
                    </span>

                    {/* 국기 + 지표명 (현재는 미국만) */}
                    <span className="text-base" aria-label="미국">
                      🇺🇸
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {ev.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
