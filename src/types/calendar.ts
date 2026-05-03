/**
 * 경제 캘린더 도메인 타입 정의
 * FRED(Federal Reserve Economic Data) API 응답을 정규화한 이벤트 모델입니다.
 */

/** 경제 지표 발표 이벤트 (UI에서 사용하는 정규화 형태) */
export interface CalendarEvent {
  /** 발표일 (YYYY-MM-DD, 예: "2026-04-10") */
  date: string;
  /** 지표 한글 명칭 (예: "CPI 소비자물가지수") */
  title: string;
  /** FRED release_id (정렬/식별용) */
  releaseId: number;
  /** 시장 영향도 — 색상 점/배지에 사용 */
  importance: "high" | "medium" | "low";
  /** 발표 국가 코드 (현재는 미국 지표만) */
  country: "US";
}

/**
 * DB 의 glossary 테이블 row 를 표현하는 타입.
 * 캘린더 지표 클릭 시 용어 모달에 표시할 정보를 담는다.
 */
export interface CalendarDBTerm {
  /** uuid primary key (TypeScript 에서는 string) */
  id: string;
  /** 한글 표시명 (예: "고용/실업률") */
  term: string;
  /** 한글 부제 (동일 또는 별도) */
  korean: string;
  /** 영문 풀네임 (예: "Employment Situation") */
  term_en: string;
  /** 설명 */
  definition: string;
  /** 분류 (예: "고용", "물가") */
  category: string;
  /** 국가 코드 배열 (예: ["US"]) */
  countries: string[];
  /** FRED release_id (NOT NULL 인 row 만 여기 저장됨) */
  release_id: number;
}
