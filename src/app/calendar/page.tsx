'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Sidebar, BottomNav } from '@/components/layout';
import { MobileSearchHeader, GlobalSearch } from '@/components/features/search';
import {
  MonthlyCalendar,
  WeeklyCalendar,
  EventDetailPanel,
  CalendarNavigation,
  MobileEventCard,
} from '@/components/features/calendar';
import { EventCardSkeletonList, EventDetailPanelSkeleton, Skeleton } from '@/components/skeleton';
import { eventCategoryFilters } from '@/constants';
import { useCalendarEvents } from '@/hooks';
import { EventCategory, CalendarEvent } from '@/types';

/**
 * 경제 캘린더 페이지
 *
 * 반응형 레이아웃:
 * - 데스크톱 (1024px+): 월간 그리드 + 이벤트 상세 패널
 * - 태블릿 (768px-1023px): 주간 뷰
 * - 모바일 (767px-): 월별 리스트 뷰
 */
export default function CalendarPage() {
  // ========== 상태 관리 ==========
  const [activeMenu, setActiveMenu] = useState('calendar');
  const [activeFilter, setActiveFilter] = useState<EventCategory | 'all'>('all');

  // 현재 표시 중인 날짜 (월/주 네비게이션용)
  const [currentDate, setCurrentDate] = useState(new Date());

  // 선택된 날짜 (이벤트 표시용)
  const [selectedDate, setSelectedDate] = useState<string | null>(
    new Date().toISOString().split('T')[0]
  );

  // 데스크톱 보기 모드 (월간/주간) - 데스크톱에서만 사용
  const [desktopViewMode, setDesktopViewMode] = useState<'month' | 'week'>('month');

  // ========== API에서 이벤트 데이터 조회 ==========
  // useCalendarEvents 훅으로 /api/calendar/events API 호출
  // 현재는 정적 데이터(constants/calendar.ts)를 반환
  // 추후 Finnhub 등 실제 API 연동 시 자동으로 반영됨
  const { events: calendarEvents, isLoading, error: apiError, source } = useCalendarEvents();

  // API 에러 로깅 (개발용)
  useEffect(() => {
    if (apiError) {
      console.warn('[Calendar] API 에러:', apiError);
    }
    if (source && source !== 'static') {
      console.log(`[Calendar] 데이터 소스: ${source}`);
    }
  }, [apiError, source]);

  // ========== 필터링된 이벤트 ==========
  // 주의: calendarEvents가 의존성 배열에 포함되어야 API 로딩 완료 시 재계산됨
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return calendarEvents;
    return calendarEvents.filter((event) => event.category === activeFilter);
  }, [activeFilter, calendarEvents]);

  // ========== 선택된 날짜의 이벤트 ==========
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return filteredEvents.filter((event) => event.date === selectedDate);
  }, [filteredEvents, selectedDate]);

  // ========== 모바일용: 월별 그룹화 ==========
  // 현재 월 이후 이벤트만 표시 (과거 데이터 필터링)
  const eventsByMonth = useMemo(() => {
    // 현재 월 기준 (YYYY-MM 형식)
    const currentMonth = currentDate.toISOString().substring(0, 7);

    const grouped: Record<string, CalendarEvent[]> = {};
    filteredEvents
      // 현재 월 이후 이벤트만 필터링
      .filter((event) => event.date.substring(0, 7) >= currentMonth)
      .forEach((event) => {
        const month = event.date.substring(0, 7); // "2026-01"
        if (!grouped[month]) grouped[month] = [];
        grouped[month].push(event);
      });

    // 각 월 내에서 날짜순 정렬
    Object.keys(grouped).forEach((month) => {
      grouped[month].sort((a, b) => a.date.localeCompare(b.date));
    });

    return grouped;
  }, [filteredEvents, currentDate]);

  // ========== 네비게이션 핸들러 ==========
  // 이전 월/주로 이동
  const handlePreviousMonth = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const handlePreviousWeek = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  }, []);

  // 다음 월/주로 이동
  const handleNextMonth = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  }, []);

  // 오늘로 이동
  const handleToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today.toISOString().split('T')[0]);
  }, []);

  // 날짜 선택
  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  // ========== 유틸리티 함수 ==========
  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    return `${year}년 ${parseInt(m)}월`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return { day, weekday };
  };

  /**
   * 캘린더 스켈레톤 렌더링
   */
  const renderCalendarSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      {/* 월/주 헤더 스켈레톤 */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton width={120} height={24} rounded="md" />
        <div className="flex gap-2">
          <Skeleton width={32} height={32} rounded="lg" />
          <Skeleton width={32} height={32} rounded="lg" />
        </div>
      </div>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} height={20} rounded="md" />
        ))}
      </div>
      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} height={60} rounded="lg" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      {/* 모바일 헤더 (검색 포함) */}
      <MobileSearchHeader title="캘린더" />

      {/* 사이드바 - 모바일에서 숨김 */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* 하단 네비게이션 - 모바일에서만 표시 */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* 메인 콘텐츠 */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300 pt-14 md:pt-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {/* ========== 페이지 헤더 + 검색바 ========== */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">경제 캘린더</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                주요 경제 이벤트 일정을 확인하세요
              </p>
            </div>
            {/* 데스크톱 검색바 (lg 이상에서만 표시) */}
            <div className="hidden lg:block w-72 flex-shrink-0">
              <GlobalSearch />
            </div>
          </div>

          {/* ========== 카테고리 필터 (공통) ========== */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {eventCategoryFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === filter.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span>{filter.emoji}</span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>

          {/* ========== 데스크톱 뷰 (1024px 이상) ========== */}
          {/* 월간/주간 캘린더 + 이벤트 상세 패널 (전환 가능) */}
          <div className="hidden lg:block">
            {/* 캘린더 네비게이션 - 월/주 전환 탭 포함 */}
            <div className="mb-4">
              <CalendarNavigation
                currentDate={currentDate}
                onPrevious={desktopViewMode === 'month' ? handlePreviousMonth : handlePreviousWeek}
                onNext={desktopViewMode === 'month' ? handleNextMonth : handleNextWeek}
                onToday={handleToday}
                viewMode={desktopViewMode}
                onViewModeChange={setDesktopViewMode}
                showViewModeToggle={true}
              />
            </div>

            {/* 2열 그리드: 캘린더 + 이벤트 패널 */}
            <div className="grid grid-cols-3 gap-6">
              {/* 왼쪽: 월간 또는 주간 캘린더 (2/3) */}
              <div className="col-span-2">
                {isLoading ? (
                  renderCalendarSkeleton()
                ) : desktopViewMode === 'month' ? (
                  /* 월간 캘린더 */
                  <MonthlyCalendar
                    currentDate={currentDate}
                    events={filteredEvents}
                    selectedDate={selectedDate}
                    onSelectDate={handleSelectDate}
                    activeFilter={activeFilter}
                  />
                ) : (
                  /* 주간 캘린더 (데스크톱용) */
                  <WeeklyCalendar
                    currentDate={currentDate}
                    events={filteredEvents}
                    selectedDate={selectedDate}
                    onSelectDate={handleSelectDate}
                  />
                )}
              </div>

              {/* 오른쪽: 이벤트 상세 패널 (1/3) */}
              <div className="col-span-1">
                {isLoading ? (
                  <EventDetailPanelSkeleton />
                ) : (
                  <EventDetailPanel selectedDate={selectedDate} events={selectedDateEvents} />
                )}
              </div>
            </div>
          </div>

          {/* ========== 태블릿 뷰 (768px ~ 1023px) ========== */}
          {/* 주간 뷰 */}
          <div className="hidden md:block lg:hidden">
            {/* 주 네비게이션 */}
            <div className="mb-4">
              <CalendarNavigation
                currentDate={currentDate}
                onPrevious={handlePreviousWeek}
                onNext={handleNextWeek}
                onToday={handleToday}
                viewMode="week"
              />
            </div>

            {/* 주간 캘린더 */}
            {isLoading ? (
              <EventCardSkeletonList count={5} />
            ) : (
              <WeeklyCalendar
                currentDate={currentDate}
                events={filteredEvents}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
              />
            )}
          </div>

          {/* ========== 모바일 뷰 (767px 이하) ========== */}
          {/* 월별 리스트 뷰 + 아코디언 확장 */}
          <div className="md:hidden">
            {/* 안내 문구 */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>이벤트 카드를 터치하면 용어 설명을 볼 수 있어요</span>
              </div>
            </div>

            {/* 로딩 중이면 스켈레톤, 완료되면 실제 데이터 */}
            {isLoading ? (
              <EventCardSkeletonList count={5} />
            ) : (
              <div className="space-y-8">
                {Object.entries(eventsByMonth)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([month, events]) => (
                    <section key={month}>
                      {/* 월 헤더 */}
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        {formatMonth(month)}
                      </h2>

                      {/* 이벤트 목록 (아코디언 카드) */}
                      <div className="space-y-3">
                        {events.map((event) => {
                          const { day, weekday } = formatDate(event.date);
                          return (
                            <MobileEventCard
                              key={event.id}
                              event={event}
                              day={day}
                              weekday={weekday}
                            />
                          );
                        })}
                      </div>
                    </section>
                  ))}
              </div>
            )}

            {/* 빈 상태 */}
            {!isLoading && filteredEvents.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📅</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  이벤트가 없습니다
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  선택한 카테고리에 해당하는 이벤트가 없습니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
