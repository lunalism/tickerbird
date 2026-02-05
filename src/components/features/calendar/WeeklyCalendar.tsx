'use client';

import { useMemo, useState, useCallback } from 'react';
import { CalendarEvent, EventCategory, GlossaryTerm } from '@/types';
import { CompanyLogo, FlagLogo } from '@/components/common';
import { glossaryTerms } from '@/constants';
import { GlossaryExplainer } from './GlossaryExplainer';
import { parseTextWithInteractiveTerms } from './InteractiveTerm';

/**
 * 주간 뷰 캘린더 컴포넌트 (태블릿용)
 *
 * Props:
 * - currentDate: 현재 표시 중인 주의 기준 날짜
 * - events: 이벤트 목록
 * - selectedDate: 선택된 날짜
 * - onSelectDate: 날짜 선택 핸들러
 *
 * 기능:
 * - 용어사전 연동: 용어 tap 시 하단 섹션에 설명 표시
 */
interface WeeklyCalendarProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

export function WeeklyCalendar({
  currentDate,
  events,
  selectedDate,
  onSelectDate,
}: WeeklyCalendarProps) {
  // 선택된 용어 상태
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);

  // 용어 선택 핸들러
  const handleTermSelect = useCallback((term: GlossaryTerm | null) => {
    setSelectedTerm(term);
  }, []);

  // 해당 주의 날짜 배열 생성 (일요일 ~ 토요일)
  const weekDays = useMemo(() => {
    const days: { date: string; day: number; weekday: string; month: number }[] = [];

    // 현재 날짜의 주 시작일 (일요일) 계산
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const weekdayNames = ['일', '월', '화', '수', '목', '금', '토'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        day: date.getDate(),
        weekday: weekdayNames[i],
        month: date.getMonth() + 1,
      });
    }

    return days;
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

  // 현재 선택된 날짜의 이벤트
  const selectedDateEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  // 카테고리 이모지
  const getCategoryEmoji = (category: EventCategory) => {
    switch (category) {
      case 'institution':
        return '🏛️';
      case 'earnings':
        return '📊';
      case 'corporate':
        return '🎉';
      case 'crypto':
        return '🪙';
      case 'options':
        return '📈';
      case 'dividend':
        return '💰';
    }
  };

  // 카테고리별 뱃지 색상 및 라벨
  // - 경제지표: 파란색 (🏛️ 아이콘과 매칭)
  // - 실적발표: 초록색 (📊 아이콘과 매칭)
  // - 기업이벤트: 주황색 (🎉 아이콘과 매칭)
  // - 암호화폐: 보라색 (🪙 아이콘과 매칭)
  // - 중요도가 high인 경우 테두리 추가로 강조
  const getCategoryBadge = (category: EventCategory, importance: string) => {
    // 카테고리별 색상 설정
    const colors: Record<EventCategory, string> = {
      institution: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      earnings: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      corporate: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      crypto: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      options: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      dividend: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    };

    // 카테고리별 한글 라벨
    const labels: Record<EventCategory, string> = {
      institution: '경제지표',
      earnings: '실적발표',
      corporate: '기업이벤트',
      crypto: '암호화폐',
      options: '옵션만기',
      dividend: '배당',
    };

    // 중요 이벤트는 테두리 추가하여 강조 표시
    const ring = importance === 'high' ? 'ring-2 ring-current ring-offset-1 dark:ring-offset-gray-800' : '';

    return {
      className: `${colors[category]} ${ring}`,
      label: labels[category],
    };
  };

  return (
    <div className="space-y-4">
      {/* 주간 날짜 헤더 */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((dayInfo, index) => {
          const isSelected = selectedDate === dayInfo.date;
          const isToday = dayInfo.date === today;
          const hasEvents = (eventsByDate[dayInfo.date] || []).length > 0;

          return (
            <button
              key={dayInfo.date}
              onClick={() => onSelectDate(dayInfo.date)}
              className={`
                flex flex-col items-center py-3 rounded-xl transition-all
                ${isSelected ? 'bg-blue-600 text-white' : ''}
                ${isToday && !isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                ${!isSelected && !isToday ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700' : ''}
                border ${isSelected ? 'border-blue-600' : 'border-gray-100 dark:border-gray-700'}
              `}
            >
              {/* 요일 */}
              <span
                className={`text-xs font-medium mb-1 ${
                  isSelected
                    ? 'text-white'
                    : index === 0
                    ? 'text-red-500 dark:text-red-400'
                    : index === 6
                    ? 'text-blue-500 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {dayInfo.weekday}
              </span>
              {/* 날짜 */}
              <span
                className={`text-lg font-bold ${
                  isSelected ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}
              >
                {dayInfo.day}
              </span>
              {/* 이벤트 표시 점 */}
              {hasEvents && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1 ${
                    isSelected ? 'bg-white' : 'bg-blue-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜의 이벤트 목록 */}
      <div className="space-y-3">
        {selectedDate &&
          selectedDateEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow"
            >
              <div className="flex items-start gap-3">
                {/* 로고/국기 */}
                {event.countryCode ? (
                  <FlagLogo countryCode={event.countryCode} size="md" />
                ) : event.companyDomain ? (
                  <CompanyLogo domain={event.companyDomain} size="md" />
                ) : (
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-xl">{getCategoryEmoji(event.category)}</span>
                  </div>
                )}

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {parseTextWithInteractiveTerms(
                        event.title,
                        handleTermSelect,
                        true,
                        glossaryTerms
                      )}
                    </h3>
                    {/* 카테고리 뱃지 - 중요 이벤트는 테두리로 강조 */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        getCategoryBadge(event.category, event.importance).className
                      }`}
                    >
                      {getCategoryBadge(event.category, event.importance).label}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {parseTextWithInteractiveTerms(
                        event.description,
                        handleTermSelect,
                        true,
                        glossaryTerms
                      )}
                    </p>
                  )}
                  {event.time && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      🕐 {event.time} (한국시간)
                    </p>
                  )}
                </div>

                {/* 카테고리 이모지 */}
                <span className="text-lg flex-shrink-0">{getCategoryEmoji(event.category)}</span>
              </div>
            </div>
          ))}

        {/* 이벤트 없음 */}
        {selectedDate && selectedDateEvents.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-8 text-center">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              이 날짜에 예정된 이벤트가 없습니다
            </p>
          </div>
        )}
      </div>

      {/* 하단 용어 설명 섹션 */}
      {selectedDate && selectedDateEvents.length > 0 && (
        <GlossaryExplainer selectedTerm={selectedTerm} className="mt-4" />
      )}
    </div>
  );
}
