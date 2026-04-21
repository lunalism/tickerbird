// 캘린더 이벤트(또는 기타 위치)에서 사용하는 경제 용어 툴팁
//
// 구현 방식: 순수 CSS group-hover 기반 (base-ui Tooltip 대신)
// - base-ui Tooltip은 내부 restMs(600ms)/move:false 정책 등으로 일반 호버에서
//   잘 열리지 않는 이슈가 있어 CSS hover 방식으로 전환했습니다.
// - 트리거를 상대 위치(span.relative.group)로 감싸고, 절대 위치 팝업이 그 위에
//   group-hover로 표시됩니다. 포털 없이 동작해 z-index만 충분하면 안정적입니다.
//
// - props.releaseId(FRED release_id)를 받아 releaseIdToTerm 매핑으로 용어 ID를 변환합니다.
// - 로컬 GLOSSARY 배열(src/data/glossary.ts)에서 동기적으로 조회합니다.
//   (Supabase DB의 id가 UUID여서 문자열 키("CPI" 등)와 불일치 → 로컬 데이터 사용)
// - 매칭되는 용어가 없으면 children만 렌더링 (툴팁 비활성)

"use client";

import type { ReactNode } from "react";

import { GLOSSARY, releaseIdToTerm } from "@/data/glossary";
import type { TermItem } from "@/data/glossary";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────
// 모듈 레벨 Map — GLOSSARY 배열에서 id("CPI" 등) → TermItem 매핑을 1회 생성.
// 로컬 정적 데이터이므로 네트워크 요청 없이 동기적으로 조회 가능합니다.
// ─────────────────────────────────────────────────────────
const glossaryMap = new Map<string, TermItem>(
  GLOSSARY.map((item) => [item.id, item]),
);

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
  /** FRED release_id (releaseIdToTerm 매핑으로 용어 ID로 변환) */
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
  // release_id → 용어 ID("CPI" 등) → TermItem 동기 조회
  const termId = releaseIdToTerm[releaseId];
  const term = termId ? glossaryMap.get(termId) ?? null : null;

  // 매칭되는 용어가 없으면 툴팁 없이 children만 렌더링
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
