'use client';

import { useMemo } from 'react';
import { CalendarEvent, EventCategory } from '@/types';

/**
 * 월간 그리드 캘린더 컴포넌트 (데스크톱용)
 *
 * Props:
 * - currentDate: 현재 표시 중인 월의 기준 날짜
 * - events: 이벤트 목록
 * - selectedDate: 선택된 날짜 (클릭된 날짜)
 * - onSelectDate: 날짜 선택 핸들러
 * - activeFilter: 현재 활성화된 카테고리 필터
 */
interface MonthlyCalendarProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  activeFilter: EventCategory | 'all';
}

export function MonthlyCalendar({
  currentDate,
  events,
  selectedDate,
  onSelectDate,
  activeFilter,
}: MonthlyCalendarProps) {
  // 해당 월의 날짜 배열 생성
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 해당 월의 첫째 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 달력 시작 요일 (일요일 = 0)
    const startDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    // 이전 달의 날짜 (빈 칸 채우기)
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays: { date: string; day: number; isCurrentMonth: boolean }[] = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const prevMonth = month === 0 ? 12 : month;
      const prevYear = month === 0 ? year - 1 : year;
      prevMonthDays.push({
        date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        isCurrentMonth: false,
      });
    }

    // 현재 달의 날짜
    const currentMonthDays: { date: string; day: number; isCurrentMonth: boolean }[] = [];
    for (let day = 1; day <= totalDays; day++) {
      currentMonthDays.push({
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        isCurrentMonth: true,
      });
    }

    // 다음 달의 날짜 (빈 칸 채우기, 6주 고정)
    const totalCells = 42; // 6주 x 7일
    const remainingCells = totalCells - prevMonthDays.length - currentMonthDays.length;
    const nextMonthDays: { date: string; day: number; isCurrentMonth: boolean }[] = [];
    for (let day = 1; day <= remainingCells; day++) {
      const nextMonth = month === 11 ? 1 : month + 2;
      const nextYear = month === 11 ? year + 1 : year;
      nextMonthDays.push({
        date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        isCurrentMonth: false,
      });
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  }, [currentDate]);

  // 날짜별 이벤트 맵 생성
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    });
    return map;
  }, [events]);

  // 오늘 날짜 문자열
  const today = new Date().toISOString().split('T')[0];

  // 요일 레이블
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  // 카테고리별 색상 (이벤트 점 표시용)
  const getCategoryColor = (category: EventCategory) => {
    switch (category) {
      case 'institution':
        return 'bg-blue-500';
      case 'earnings':
        return 'bg-green-500';
      case 'corporate':
        return 'bg-purple-500';
      case 'crypto':
        return 'bg-orange-500';
      case 'options':
        return 'bg-red-500';
      case 'dividend':
        return 'bg-amber-500';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-2">
        {weekdays.map((day, index) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-2 ${
              index === 0
                ? 'text-red-500 dark:text-red-400'
                : index === 6
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayInfo, index) => {
          const dayEvents = eventsByDate[dayInfo.date] || [];
          const isSelected = selectedDate === dayInfo.date;
          const isToday = dayInfo.date === today;
          const hasEvents = dayEvents.length > 0;
          const dayOfWeek = index % 7;

          return (
            <button
              key={dayInfo.date}
              onClick={() => onSelectDate(dayInfo.date)}
              className={`
                relative aspect-square p-1 rounded-lg transition-all text-sm
                ${!dayInfo.isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                ${
                  dayInfo.isCurrentMonth && dayOfWeek === 0
                    ? 'text-red-500 dark:text-red-400'
                    : ''
                }
                ${
                  dayInfo.isCurrentMonth && dayOfWeek === 6
                    ? 'text-blue-500 dark:text-blue-400'
                    : ''
                }
                ${
                  dayInfo.isCurrentMonth && dayOfWeek !== 0 && dayOfWeek !== 6
                    ? 'text-gray-900 dark:text-white'
                    : ''
                }
                ${isSelected ? 'bg-blue-600 text-white!' : ''}
                ${isToday && !isSelected ? 'bg-blue-100 dark:bg-blue-900/30 font-bold' : ''}
                ${!isSelected && dayInfo.isCurrentMonth ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
              `}
            >
              {/* 날짜 숫자 */}
              <span className="block">{dayInfo.day}</span>

              {/* 이벤트 점 표시 (최대 3개) */}
              {hasEvents && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((event, idx) => (
                    <span
                      key={idx}
                      className={`w-1 h-1 rounded-full ${
                        isSelected ? 'bg-white' : getCategoryColor(event.category)
                      }`}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className={`text-[8px] ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
