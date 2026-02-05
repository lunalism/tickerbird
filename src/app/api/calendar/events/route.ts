/**
 * 경제 캘린더 이벤트 API
 *
 * @route GET /api/calendar/events
 * @query from - 시작 날짜 (YYYY-MM-DD, 선택)
 * @query to - 종료 날짜 (YYYY-MM-DD, 선택)
 * @query category - 카테고리 필터 (institution, earnings, corporate, crypto, options, dividend, holiday, conference, 선택)
 *
 * @description
 * Firestore에서 경제 캘린더 이벤트 데이터를 조회합니다.
 * Firestore에 데이터가 없으면 정적 데이터(constants/calendar.ts)를 폴백으로 사용합니다.
 *
 * 데이터 소스:
 * 1. Firestore (calendar_events 컬렉션) - 우선
 * 2. 정적 데이터 (constants/calendar.ts) - 폴백
 *
 * @example
 * // 전체 이벤트 조회
 * GET /api/calendar/events
 *
 * // 날짜 범위 필터
 * GET /api/calendar/events?from=2026-01-01&to=2026-01-31
 *
 * // 카테고리 필터
 * GET /api/calendar/events?category=institution
 */

import { NextRequest, NextResponse } from 'next/server';
import { calendarEvents as staticEvents } from '@/constants/calendar';
import { CalendarEvent, EventCategory } from '@/types';
import {
  calendarEventsCollection,
  queryCollection,
  where,
  orderBy,
  FirestoreCalendarEvent,
} from '@/lib/firestore';

// ==================== 타입 정의 ====================

/**
 * API 성공 응답 타입
 */
interface CalendarEventsResponse {
  success: true;
  events: CalendarEvent[];
  totalCount: number;
  filters: {
    from: string | null;
    to: string | null;
    category: EventCategory | 'all';
  };
  /**
   * 데이터 소스 정보
   * - 'firestore': Firestore 데이터베이스
   * - 'static': constants/calendar.ts 정적 데이터 (폴백)
   */
  source: 'firestore' | 'static';
  timestamp: string;
}

/**
 * API 에러 응답 타입
 */
interface CalendarEventsErrorResponse {
  success: false;
  error: string;
  message: string;
}

// ==================== 유틸리티 함수 ====================

/**
 * 날짜 유효성 검사
 *
 * @param dateStr YYYY-MM-DD 형식 문자열
 * @returns 유효한 날짜이면 true
 */
function isValidDate(dateStr: string): boolean {
  // YYYY-MM-DD 형식 체크
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * 카테고리 유효성 검사
 *
 * @param category 카테고리 문자열
 * @returns 유효한 카테고리이면 true
 */
function isValidCategory(category: string): category is EventCategory {
  const validCategories: EventCategory[] = ['institution', 'earnings', 'corporate', 'crypto', 'options', 'dividend', 'holiday', 'conference'];
  return validCategories.includes(category as EventCategory);
}

// ==================== 데이터 조회 함수 ====================

/**
 * Firestore에서 이벤트 데이터 조회
 *
 * @param from - 시작 날짜 (선택)
 * @param to - 종료 날짜 (선택)
 * @param category - 카테고리 필터 (선택)
 * @returns 이벤트 배열 및 소스 정보
 */
async function fetchEventsFromFirestore(
  from?: string | null,
  to?: string | null,
  category?: string | null
): Promise<{ events: CalendarEvent[]; source: 'firestore' | 'static' }> {
  try {
    // Firestore 쿼리 조건 빌드
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const constraints: any[] = [];

    // 날짜 범위 필터
    if (from) {
      constraints.push(where('date', '>=', from));
    }
    if (to) {
      constraints.push(where('date', '<=', to));
    }

    // 카테고리 필터
    if (category && category !== 'all') {
      constraints.push(where('category', '==', category));
    }

    // 날짜순 정렬
    constraints.push(orderBy('date', 'asc'));

    // Firestore 쿼리 실행
    const firestoreEvents = await queryCollection<FirestoreCalendarEvent>(
      calendarEventsCollection(),
      constraints
    );

    // Firestore에 데이터가 있으면 사용
    if (firestoreEvents.length > 0) {
      const events: CalendarEvent[] = firestoreEvents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        titleEn: doc.titleEn,
        date: doc.date,
        endDate: doc.endDate,
        category: doc.category,
        countryCode: doc.countryCode,
        companyDomain: doc.companyDomain,
        importance: doc.importance,
        time: doc.time,
        description: doc.description,
        relatedTerms: doc.relatedTerms,
      }));

      return { events, source: 'firestore' };
    }

    // Firestore에 데이터가 없으면 정적 데이터 폴백
    console.log('[Calendar API] Firestore에 데이터 없음, 정적 데이터 사용');
    return { events: staticEvents, source: 'static' };
  } catch (error) {
    // Firestore 오류 시 정적 데이터 폴백
    console.error('[Calendar API] Firestore 조회 오류, 정적 데이터 사용:', error);
    return { events: staticEvents, source: 'static' };
  }
}

// ==================== API 핸들러 ====================

/**
 * GET /api/calendar/events
 *
 * 경제 캘린더 이벤트를 조회합니다.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<CalendarEventsResponse | CalendarEventsErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;

  // 쿼리 파라미터 파싱
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const categoryParam = searchParams.get('category');

  // 날짜 유효성 검사
  if (fromParam && !isValidDate(fromParam)) {
    return NextResponse.json(
      {
        success: false,
        error: 'INVALID_DATE',
        message: 'from 파라미터가 유효한 날짜 형식(YYYY-MM-DD)이 아닙니다.',
      },
      { status: 400 }
    );
  }

  if (toParam && !isValidDate(toParam)) {
    return NextResponse.json(
      {
        success: false,
        error: 'INVALID_DATE',
        message: 'to 파라미터가 유효한 날짜 형식(YYYY-MM-DD)이 아닙니다.',
      },
      { status: 400 }
    );
  }

  // 카테고리 유효성 검사
  if (categoryParam && categoryParam !== 'all' && !isValidCategory(categoryParam)) {
    return NextResponse.json(
      {
        success: false,
        error: 'INVALID_CATEGORY',
        message: `유효하지 않은 카테고리입니다. 가능한 값: institution, earnings, corporate, crypto, options, dividend, holiday, conference`,
      },
      { status: 400 }
    );
  }

  try {
    // Firestore에서 이벤트 데이터 조회 (폴백: 정적 데이터)
    let { events, source } = await fetchEventsFromFirestore(fromParam, toParam, categoryParam);

    // 정적 데이터 사용 시 클라이언트 측 필터링 적용
    if (source === 'static') {
      // 날짜 범위 필터링
      if (fromParam) {
        events = events.filter((event) => event.date >= fromParam);
      }
      if (toParam) {
        events = events.filter((event) => event.date <= toParam);
      }

      // 카테고리 필터링
      if (categoryParam && categoryParam !== 'all') {
        events = events.filter((event) => event.category === categoryParam);
      }

      // 날짜순 정렬 (오름차순)
      events.sort((a, b) => a.date.localeCompare(b.date));
    }

    return NextResponse.json({
      success: true,
      events,
      totalCount: events.length,
      filters: {
        from: fromParam,
        to: toParam,
        category: (categoryParam as EventCategory) || 'all',
      },
      source,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Calendar API] 에러:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'FETCH_ERROR',
        message: '이벤트 데이터를 가져오는 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
