'use client';

import { useState, useCallback } from 'react';
import { CalendarEvent, EventCategory, GlossaryTerm } from '@/types';
import { CompanyLogo, FlagLogo } from '@/components/common';
import { glossaryTerms } from '@/constants';
import { GlossaryExplainer } from './GlossaryExplainer';
import { parseTextWithInteractiveTerms } from './InteractiveTerm';

/**
 * 이벤트 상세 패널 컴포넌트 (데스크톱 오른쪽 사이드바용)
 *
 * Props:
 * - selectedDate: 선택된 날짜
 * - events: 해당 날짜의 이벤트 목록
 *
 * 기능:
 * - 용어사전 연동: 용어 hover 시 하단 섹션에 설명 표시
 */
interface EventDetailPanelProps {
  selectedDate: string | null;
  events: CalendarEvent[];
}

export function EventDetailPanel({ selectedDate, events }: EventDetailPanelProps) {
  // 선택된 용어 상태
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);

  // 용어 선택 핸들러
  const handleTermSelect = useCallback((term: GlossaryTerm | null) => {
    setSelectedTerm(term);
  }, []);

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

  // 날짜 포맷팅
  const formatSelectedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${weekday})`;
  };

  // 날짜가 선택되지 않은 경우
  if (!selectedDate) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 h-full flex flex-col items-center justify-center">
        <div className="text-5xl mb-4">📅</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          날짜를 선택하세요
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
          캘린더에서 날짜를 클릭하면
          <br />
          해당 날짜의 이벤트를 확인할 수 있습니다
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 h-full flex flex-col">
      {/* 선택된 날짜 헤더 */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {formatSelectedDate(selectedDate)}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {events.length > 0 ? `${events.length}개의 이벤트` : '이벤트 없음'}
        </p>
      </div>

      {/* 이벤트 목록 (스크롤 영역) */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* 로고/국기 */}
                {event.countryCode ? (
                  <FlagLogo countryCode={event.countryCode} size="md" />
                ) : event.companyDomain ? (
                  <CompanyLogo domain={event.companyDomain} size="md" />
                ) : (
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-xl">{getCategoryEmoji(event.category)}</span>
                  </div>
                )}

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  {/* 이벤트 제목 (용어 인터랙티브) */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                      {parseTextWithInteractiveTerms(
                        event.title,
                        handleTermSelect,
                        false,
                        glossaryTerms
                      )}
                    </h4>
                    <span className="text-lg flex-shrink-0">{getCategoryEmoji(event.category)}</span>
                  </div>

                  {/* 카테고리 뱃지 - 중요 이벤트는 테두리로 강조 */}
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${
                      getCategoryBadge(event.category, event.importance).className
                    }`}
                  >
                    {getCategoryBadge(event.category, event.importance).label}
                  </span>

                  {/* 설명 (용어 인터랙티브) */}
                  {event.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {parseTextWithInteractiveTerms(
                        event.description,
                        handleTermSelect,
                        false,
                        glossaryTerms
                      )}
                    </p>
                  )}

                  {/* 시간 */}
                  {event.time && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      🕐 {event.time} (한국시간)
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* 이벤트 없음 */}
          {events.length === 0 && (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">🗓️</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                이 날짜에 예정된 이벤트가 없습니다
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 하단 용어 설명 섹션 */}
      {events.length > 0 && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <GlossaryExplainer selectedTerm={selectedTerm} />
        </div>
      )}
    </div>
  );
}
