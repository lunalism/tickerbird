import { Timestamp } from 'firebase/firestore';

// ==================== 이벤트 카테고리 및 중요도 ====================

export type EventCategory = 'institution' | 'earnings' | 'corporate' | 'crypto' | 'options' | 'dividend';
export type EventImportance = 'high' | 'medium' | 'low';

// ==================== 캘린더 이벤트 인터페이스 ====================

/**
 * 캘린더 이벤트 기본 인터페이스
 * API 응답 및 프론트엔드에서 사용
 */
export interface CalendarEvent {
  id: string;
  date: string; // "2024-04-19"
  title: string;
  category: EventCategory;
  countryCode?: string; // 국기 표시용 (institution)
  companyDomain?: string; // 기업 로고용 (earnings, corporate, crypto)
  importance: EventImportance;
  time?: string; // 한국 시간 "04:00"
  description?: string;
  // 확장 필드 (선택)
  titleEn?: string; // 영문 제목
  endDate?: string; // 종료일 (2일 이상인 경우)
  relatedTerms?: string[]; // 관련 용어 배열 (용어사전 연동용)
}

/**
 * Firestore 캘린더 이벤트 문서 타입
 * Firestore에 저장되는 형식
 */
export interface FirestoreCalendarEvent {
  title: string;
  titleEn?: string; // 영문 제목
  date: string; // "2026-01-27"
  endDate?: string; // 종료일 (2일 이상인 경우, 선택)
  category: EventCategory;
  countryCode?: string; // 국가 코드 (us, kr, jp 등)
  companyDomain?: string; // 기업 도메인 (로고용)
  importance: EventImportance;
  time?: string; // 한국 시간 "22:30"
  description?: string;
  relatedTerms?: string[]; // 관련 용어 배열 (용어사전 연동용)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==================== 필터 인터페이스 ====================

export interface EventCategoryFilter {
  id: EventCategory | 'all';
  label: string;
  emoji: string;
}
