'use client';

import { useState, useCallback, useMemo } from 'react';
import { CalendarEvent, EventCategory, GlossaryTerm } from '@/types';
import { CompanyLogo, FlagLogo } from '@/components/common';
import { glossaryTerms } from '@/constants';
import { GlossaryExplainer } from './GlossaryExplainer';
import { parseTextWithInteractiveTerms } from './InteractiveTerm';

/**
 * 주간 이벤트 패널 컴포넌트 (데스크톱 주간 보기용)
 *
 * 해당 주의 모든 이벤트를 날짜별로 그룹화하여 표시합니다.
 *
 * Props:
 * - currentDate: 현재 표시 중인 주의 기준 날짜
 * - events: 전체 이벤트 목록 (필터링된 이벤트)
 *
 * 기능:
 * - 주 범위 내 이벤트만 필터링
 * - 날짜별 그룹화하여 표시
 * - 용어사전 연동: 용어 hover 시 하단 섹션에 설명 표시
 */
interface WeeklyEventPanelProps {
  currentDate: Date;
  events: CalendarEvent[];
}

export function WeeklyEventPanel({ currentDate, events }: WeeklyEventPanelProps) {
  // 선택된 용어 상태
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);

  // 용어 선택 핸들러
  const handleTermSelect = useCallback((term: GlossaryTerm | null) => {
    setSelectedTerm(term);
  }, []);

  // 해당 주의 시작일과 종료일 계산 (일요일 ~ 토요일)
  const { weekStart, weekEnd, weekDates } = useMemo(() => {
    const start = new Date(currentDate);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    // 주의 모든 날짜 배열 생성
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    return {
      weekStart: start,
      weekEnd: end,
      weekDates: dates,
    };
  }, [currentDate]);

  // 해당 주의 이벤트만 필터링하고 날짜별로 그룹화
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    // 주 범위 내 이벤트만 필터링
    const weekEvents = events.filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    // 날짜별로 그룹화
    weekEvents.forEach((event) => {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    });

    return map;
  }, [events, weekStart, weekEnd]);

  // 해당 주의 총 이벤트 수
  const totalEvents = useMemo(() => {
    return Object.values(eventsByDate).reduce((sum, arr) => sum + arr.length, 0);
  }, [eventsByDate]);

  // 이벤트가 있는 날짜만 필터링 (순서대로)
  const datesWithEvents = useMemo(() => {
    return weekDates.filter((date) => eventsByDate[date]?.length > 0);
  }, [weekDates, eventsByDate]);

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
      case 'holiday':
        return '🚫';
      case 'conference':
        return '🎤';
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
      holiday: 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400',
      conference: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
    };

    // 카테고리별 한글 라벨
    const labels: Record<EventCategory, string> = {
      institution: '경제지표',
      earnings: '실적발표',
      corporate: '기업이벤트',
      crypto: '암호화폐',
      options: '옵션만기',
      dividend: '배당',
      holiday: '휴장일',
      conference: '컨퍼런스',
    };

    // 중요 이벤트는 테두리 추가하여 강조 표시
    const ring = importance === 'high' ? 'ring-2 ring-current ring-offset-1 dark:ring-offset-gray-800' : '';

    return {
      className: `${colors[category]} ${ring}`,
      label: labels[category],
    };
  };

  // 주 범위 포맷팅 (예: "2026년 1월 25일 - 31일")
  const formatWeekRange = () => {
    const startMonth = weekStart.getMonth() + 1;
    const startDay = weekStart.getDate();
    const endMonth = weekEnd.getMonth() + 1;
    const endDay = weekEnd.getDate();
    const year = weekStart.getFullYear();

    // 같은 달인 경우
    if (startMonth === endMonth) {
      return `${year}년 ${startMonth}월 ${startDay}일 - ${endDay}일`;
    }
    // 다른 달인 경우
    return `${year}년 ${startMonth}월 ${startDay}일 - ${endMonth}월 ${endDay}일`;
  };

  // 날짜 포맷팅 (예: "1월 27일 (화)")
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${month}월 ${day}일 (${weekday})`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 h-full flex flex-col">
      {/* 주 범위 헤더 */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{formatWeekRange()}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {totalEvents > 0 ? `${totalEvents}개의 이벤트` : '이벤트 없음'}
        </p>
      </div>

      {/* 날짜별 이벤트 목록 (스크롤 영역) */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {datesWithEvents.map((date) => (
            <div key={date}>
              {/* 날짜 헤더 */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📅</span>
                <h4 className="font-semibold text-gray-900 dark:text-white">{formatDate(date)}</h4>
              </div>

              {/* 해당 날짜의 이벤트 목록 */}
              <div className="space-y-2 pl-7">
                {eventsByDate[date].map((event) => (
                  <div
                    key={event.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* 로고/국기 */}
                      {event.countryCode ? (
                        <FlagLogo countryCode={event.countryCode} size="sm" />
                      ) : event.companyDomain ? (
                        <CompanyLogo domain={event.companyDomain} size="sm" />
                      ) : (
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-base">{getCategoryEmoji(event.category)}</span>
                        </div>
                      )}

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        {/* 이벤트 제목 */}
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                            {parseTextWithInteractiveTerms(
                              event.title,
                              handleTermSelect,
                              false,
                              glossaryTerms
                            )}
                          </h5>
                          {/* 카테고리 뱃지 - 중요 이벤트는 테두리로 강조 */}
                          <span
                            className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                              getCategoryBadge(event.category, event.importance).className
                            }`}
                          >
                            {getCategoryBadge(event.category, event.importance).label}
                          </span>
                        </div>

                        {/* 시간 */}
                        {event.time && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            🕐 {event.time}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 이벤트 없음 */}
          {totalEvents === 0 && (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">🗓️</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                이번 주에 예정된 이벤트가 없습니다
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 하단 용어 설명 섹션 */}
      {totalEvents > 0 && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <GlossaryExplainer selectedTerm={selectedTerm} />
        </div>
      )}
    </div>
  );
}
