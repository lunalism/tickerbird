// 캘린더 이벤트(또는 기타 위치)에서 사용하는 경제 용어 툴팁
//
// 구현 방식: 순수 CSS group-hover 기반 (base-ui Tooltip 대신)
// - base-ui Tooltip은 내부 restMs(600ms)/move:false 정책 등으로 일반 호버에서
//   잘 열리지 않는 이슈가 있어 CSS hover 방식으로 전환했습니다.
// - 트리거를 상대 위치(span.relative.group)로 감싸고, 절대 위치 팝업이 그 위에
//   group-hover로 표시됩니다. 포털 없이 동작해 z-index만 충분하면 안정적입니다.
//
// - props.releaseId(FRED release_id)를 받아 releaseIdToTerm 매핑으로 glossary.id로 변환합니다.
// - 첫 마운트 시 glossary 테이블 전체를 1회 fetch하고 모듈 레벨 캐시에 저장합니다.
//   (모든 TermTooltip 인스턴스가 동일 캐시를 공유 → 페이지에 카드가 여러 개 있어도 네트워크 1회)
// - 매칭되는 용어가 없거나 로딩 전이면 children만 렌더링 (툴팁 비활성)

"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { releaseIdToTerm } from "@/data/glossary";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { GlossaryTerm } from "@/types/database";

// ─────────────────────────────────────────────────────────
// 모듈 레벨 캐시 — 페이지 내 모든 TermTooltip이 공유합니다.
// useRef보다 우월: 컴포넌트 마운트/언마운트와 무관하게 살아있고
// 동시에 여러 인스턴스가 호출해도 inflight Promise를 공유해 네트워크 1회만 수행.
// ─────────────────────────────────────────────────────────
let cachedMap: Map<string, GlossaryTerm> | null = null;
let inflight: Promise<Map<string, GlossaryTerm>> | null = null;

/** glossary 테이블 전체를 1회 fetch하여 id → GlossaryTerm Map으로 캐시합니다. */
async function loadGlossaryMap(): Promise<Map<string, GlossaryTerm>> {
  if (cachedMap) return cachedMap;
  if (!inflight) {
    inflight = (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("glossary")
        .select("id, term, term_en, definition, category, created_at");
      if (error) {
        // 실패 시 inflight 초기화 — 다음 호출에서 재시도 가능하도록
        inflight = null;
        throw error;
      }
      const map = new Map<string, GlossaryTerm>();
      for (const row of (data ?? []) as GlossaryTerm[]) {
        map.set(row.id, row);
      }
      cachedMap = map;
      return map;
    })();
  }
  return inflight;
}

/** 카테고리별 배지 색상 (GlossaryClient와 동일 팔레트) */
function categoryBadgeClass(category: string): string {
  switch (category) {
    case "물가":
      return "bg-red-500/15 text-red-600 dark:text-red-400";
    case "고용":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
    case "성장":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "통화정책":
      return "bg-violet-500/15 text-violet-600 dark:text-violet-400";
    case "소비":
      return "bg-pink-500/15 text-pink-600 dark:text-pink-400";
    case "경기":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "무역":
      return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400";
    case "부동산":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
    case "외환":
      return "bg-teal-500/15 text-teal-600 dark:text-teal-400";
    default:
      return "bg-gray-500/15 text-gray-600 dark:text-gray-400";
  }
}

interface TermTooltipProps {
  /** FRED release_id (releaseIdToTerm 매핑으로 glossary.id로 변환) */
  releaseId: number;
  /**
   * 호버 대상이 될 컨텐츠 (예: 지표명 span).
   * 단일 element 또는 텍스트 모두 가능합니다.
   */
  children: ReactNode;
}

export default function TermTooltip({
  releaseId,
  children,
}: TermTooltipProps) {
  // 매칭된 용어 (없으면 null)
  const [term, setTerm] = useState<GlossaryTerm | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadGlossaryMap()
      .then((map) => {
        if (cancelled) return;
        // 1) release_id → glossary.id 변환
        const id = releaseIdToTerm[releaseId];
        if (!id) return;
        // 2) Map에서 단건 조회
        const found = map.get(id);
        if (found) setTerm(found);
      })
      .catch((err) => {
        // 조회 실패 시 콘솔만 남기고 툴팁은 그냥 비활성 (children 그대로)
        console.error("용어 로드 실패:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [releaseId]);

  // 데이터가 없거나 로딩 중인 경우엔 툴팁 없이 children만 렌더링
  if (!term) {
    return <>{children}</>;
  }

  return (
    // 상대 위치 컨테이너 + group — 자식의 group-hover:로 호버 상태 전파
    // inline-block을 써서 컨테이너 크기가 children(트리거)에만 맞춰지도록 합니다.
    // (절대 위치 팝업은 컨테이너 size 계산에 포함되지 않음 → 호버 영역 = 트리거 영역)
    <span className="group relative inline-block">
      {children}

      {/* 툴팁 팝업 — group-hover 시 표시 */}
      <span
        role="tooltip"
        className={cn(
          // 기본 상태: 숨김 (보이지도 않고 포인터 이벤트도 안 받음)
          "pointer-events-none invisible absolute z-50 opacity-0",
          // 위치: 트리거 바로 위, 가로 중앙 정렬, 8px 간격
          "bottom-full left-1/2 mb-2 -translate-x-1/2",
          // 크기: 컨텐츠 길이만큼, 단 최대 300px
          "w-max max-w-[300px] whitespace-normal break-words text-left",
          // 카드 스타일 (popover 토큰으로 라이트/다크 자동 대응)
          "rounded-md border border-border bg-popover px-3 py-2 shadow-lg",
          // 호버 시 표시 (group-hover로 부모 hover 상태에 반응)
          "group-hover:visible group-hover:opacity-100",
          // 부드러운 페이드 인
          "transition-opacity duration-150"
        )}
      >
        {/* 상단: 카테고리 배지 + 한국어명 */}
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold",
              categoryBadgeClass(term.category)
            )}
          >
            {term.category}
          </span>
          <span className="text-sm font-semibold text-popover-foreground">
            {term.term}
          </span>
        </div>

        {/* 중간: 영문명 (있을 경우만) */}
        {term.term_en && (
          <div className="mb-1 text-[11px] italic text-muted-foreground">
            {term.term_en}
          </div>
        )}

        {/* 하단: 설명 */}
        <p className="text-xs leading-relaxed text-popover-foreground/90">
          {term.definition}
        </p>
      </span>
    </span>
  );
}
