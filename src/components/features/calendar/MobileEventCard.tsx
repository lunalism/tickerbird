'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { CalendarEvent, EventCategory, GlossaryTerm } from '@/types';
import { CompanyLogo, FlagLogo } from '@/components/common';
import { glossaryTerms } from '@/constants';
import { extractGlossaryTerms } from './InteractiveTerm';

/**
 * 모바일용 아코디언 이벤트 카드 컴포넌트
 *
 * 터치 시 확장되어 용어 설명 표시
 * 용어가 없는 이벤트는 확장 불가
 */
interface MobileEventCardProps {
  event: CalendarEvent;
  day: number;
  weekday: string;
}

export function MobileEventCard({ event, day, weekday }: MobileEventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 이벤트에서 용어사전 용어 추출
  const eventTerms = useMemo(() => {
    const titleTerms = extractGlossaryTerms(event.title, glossaryTerms);
    const descTerms = event.description
      ? extractGlossaryTerms(event.description, glossaryTerms)
      : [];
    // 중복 제거
    const allTerms = [...titleTerms, ...descTerms];
    const uniqueTerms = allTerms.filter(
      (term, index) => allTerms.findIndex((t) => t.id === term.id) === index
    );
    return uniqueTerms;
  }, [event.title, event.description]);

  // 용어가 있는지 여부
  const hasTerms = eventTerms.length > 0;

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

  // 카드 클릭 핸들러
  const handleCardClick = () => {
    if (hasTerms) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 ${
        isExpanded ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
      } ${hasTerms ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      {/* 메인 카드 내용 */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* 날짜 */}
          <div className="flex-shrink-0 w-14 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{day}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{weekday}요일</div>
          </div>

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
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{event.title}</h3>
              {/* 카테고리 뱃지 - 중요 이벤트는 테두리로 강조 */}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                  getCategoryBadge(event.category, event.importance).className
                }`}
              >
                {getCategoryBadge(event.category, event.importance).label}
              </span>
            </div>
            {event.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {event.description}
              </p>
            )}
            {event.time && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                🕐 {event.time} (한국시간)
              </p>
            )}
          </div>

          {/* 카테고리 뱃지 + 확장 아이콘 */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <span className="text-lg">{getCategoryEmoji(event.category)}</span>
            {hasTerms && (
              <svg
                className={`w-4 h-4 text-blue-500 dark:text-blue-400 transition-transform duration-300 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* 확장된 용어 설명 영역 */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 pt-0">
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            {/* 용어 설명 헤더 */}
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-4 h-4 text-blue-500 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                관련 용어 설명
              </span>
            </div>

            {/* 용어 목록 */}
            <div className="space-y-3">
              {eventTerms.map((term) => (
                <TermExplanation key={term.id} term={term} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 개별 용어 설명 컴포넌트
 */
function TermExplanation({ term }: { term: GlossaryTerm }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800/50">
      {/* 헤더 */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-base font-bold text-blue-600 dark:text-blue-400">
          {term.abbreviation}
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">{term.korean}</span>
      </div>

      {/* 영문명 */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{term.fullName}</p>

      {/* 설명 */}
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2 mb-2">
        {term.description}
      </p>

      {/* 용어사전 링크 */}
      <Link
        href={`/glossary?search=${term.abbreviation}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400"
        onClick={(e) => e.stopPropagation()}
      >
        용어사전에서 더 보기
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
