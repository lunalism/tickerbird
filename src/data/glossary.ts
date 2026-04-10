/**
 * 경제 지표 용어집 (Glossary)
 *
 * 경제 캘린더 등에서 사용하는 미국 주요 거시 지표의 한글 설명/카테고리를 정의합니다.
 * - TermItem[] 배열: UI에서 검색/리스트로 활용할 수 있는 1차원 데이터
 * - releaseIdToTerm: FRED release_id → TermItem.id 매핑 (캘린더 이벤트와 용어 연결용)
 *
 * id는 영문 키(예: "PCE")로, 같은 지표를 가리키는 코드 전반에서 안정적인 식별자로 사용합니다.
 */

/** 용어 항목 */
export interface TermItem {
  /** 영문 식별자 (예: "PCE", "ISM") */
  id: string;
  /** 한글 풀네임 */
  term: string;
  /** 한글 설명 (1~2 문장) */
  definition: string;
  /** 분류 (물가/고용/경기/소비/부동산/무역 등) */
  category: string;
}

/**
 * 경제 지표 용어 목록
 * 카테고리별로 묶어 정의 — 새 항목을 추가할 때는 기존 카테고리를 우선 활용해주세요.
 */
export const GLOSSARY: TermItem[] = [
  // ── 물가 ──
  {
    id: "PCE",
    term: "개인소비지출 물가지수",
    definition:
      "연준이 선호하는 인플레이션 지표. CPI보다 더 넓은 범위의 소비 지출을 측정.",
    category: "물가",
  },
  {
    id: "PPI",
    term: "생산자물가지수",
    definition:
      "생산자가 받는 상품/서비스 가격 변동 측정. 소비자 물가 선행지표.",
    category: "물가",
  },

  // ── 고용 ──
  {
    id: "신규실업수당청구",
    term: "신규실업수당청구건수",
    definition:
      "매주 새로 실업수당을 신청한 사람 수. 노동시장 건전성을 빠르게 파악하는 주간 지표.",
    category: "고용",
  },

  // ── 경기 ──
  {
    id: "ISM",
    term: "ISM 제조업지수",
    definition:
      "미국 제조업 경기를 나타내는 지수. 50 이상이면 경기 확장, 이하면 수축.",
    category: "경기",
  },
  {
    id: "내구재주문",
    term: "내구재주문",
    definition:
      "3년 이상 사용 가능한 제품 신규 주문액. 기업 투자 의향과 제조업 경기를 나타냄.",
    category: "경기",
  },
  {
    id: "산업생산",
    term: "산업생산지수",
    definition:
      "제조업/광업/전기가스업의 생산량 변화. 경제 전반의 생산 활동 수준을 측정.",
    category: "경기",
  },

  // ── 소비 ──
  {
    id: "소비자신뢰지수",
    term: "소비자신뢰지수",
    definition:
      "소비자들의 경제 상황 인식과 미래 전망을 지수화. 소비 지출 선행지표.",
    category: "소비",
  },
  {
    id: "미시간대소비자심리",
    term: "미시간대 소비자심리지수",
    definition:
      "미시간대학교가 발표하는 소비자 심리 지수. 향후 소비 동향 예측에 활용.",
    category: "소비",
  },

  // ── 부동산 ──
  {
    id: "주택착공",
    term: "주택착공건수",
    definition:
      "신규 주택 건설 시작 건수. 부동산 시장과 건설 경기를 나타내는 지표.",
    category: "부동산",
  },
  {
    id: "기존주택판매",
    term: "기존주택판매",
    definition:
      "이미 건설된 주택의 매매 건수. 부동산 시장 활성화 정도를 나타냄.",
    category: "부동산",
  },
  {
    id: "신규주택판매",
    term: "신규주택판매",
    definition:
      "새로 건설된 주택의 판매 건수. 건설 경기와 주택 수요를 파악하는 지표.",
    category: "부동산",
  },

  // ── 무역 ──
  {
    id: "경상수지",
    term: "경상수지",
    definition:
      "상품/서비스 교역과 소득 이전을 포함한 대외 거래 수지. 국가 경쟁력 지표.",
    category: "무역",
  },
];

/**
 * FRED release_id → 용어 ID 매핑
 *
 * 캘린더 이벤트(CalendarEvent.releaseId)에서 용어 설명으로 빠르게 찾아갈 때 사용합니다.
 * 매핑되지 않은 release_id는 용어 설명이 없는 것으로 처리하면 됩니다.
 */
export const releaseIdToTerm: Record<number, string> = {
  54: "PCE",
  82: "PPI",
  112: "신규실업수당청구",
  184: "ISM",
  57: "내구재주문",
  13: "산업생산",
  245: "소비자신뢰지수",
  111: "미시간대소비자심리",
  17: "주택착공",
  19: "기존주택판매",
  398: "신규주택판매",
  23: "경상수지",
};

/**
 * 용어 ID로 TermItem을 찾는 헬퍼.
 * 매칭되는 항목이 없으면 undefined를 반환합니다.
 */
export function getTermById(id: string): TermItem | undefined {
  return GLOSSARY.find((t) => t.id === id);
}

/**
 * FRED release_id로 곧장 TermItem을 찾는 헬퍼.
 * 매핑이 없거나 용어가 정의되지 않은 경우 undefined.
 */
export function getTermByReleaseId(releaseId: number): TermItem | undefined {
  const id = releaseIdToTerm[releaseId];
  if (!id) return undefined;
  return getTermById(id);
}
