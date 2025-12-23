'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar, BottomNav } from '@/components/layout';
import { MobileSearchHeader, GlobalSearch } from '@/components/features/search';
import { GlossaryCardSkeletonGrid } from '@/components/skeleton';
import { glossaryTerms, glossaryCategoryFilters } from '@/constants';
import { GlossaryCategory, GlossaryTerm } from '@/types';

/**
 * 용어사전 페이지
 *
 * 기능:
 * - 검색: 약어, 영문명, 한글명으로 검색
 * - 카테고리 필터: 전체/경제지표/중앙은행/금융/기술적분석/암호화폐
 * - 정렬: 알파벳순(약어) / 가나다순(한글명)
 * - 반응형 카드 레이아웃
 */
export default function GlossaryPage() {
  // ========== 상태 관리 ==========
  const [activeMenu, setActiveMenu] = useState('glossary');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'alphabet' | 'korean'>('alphabet');
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);

  // ========== 로딩 상태 관리 ==========
  // isLoading: 데이터 로딩 중 여부
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 데이터 로딩 시뮬레이션
   *
   * 실제 API 호출 시에는 이 부분을 fetch/axios로 대체합니다.
   * 테스트용으로 2초 딜레이를 추가했습니다.
   *
   * TODO: 실제 API 연동 시 아래 코드를 수정하세요
   */
  useEffect(() => {
    // 테스트용 2초 딜레이 (실제 배포 시 제거)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // ========== 필터링 및 정렬 ==========
  const filteredAndSortedTerms = useMemo(() => {
    let result = glossaryTerms;

    // 카테고리 필터
    if (activeCategory !== 'all') {
      result = result.filter((term) => term.category === activeCategory);
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (term) =>
          term.abbreviation.toLowerCase().includes(query) ||
          term.fullName.toLowerCase().includes(query) ||
          term.korean.includes(searchQuery)
      );
    }

    // 정렬
    result = [...result].sort((a, b) => {
      if (sortBy === 'alphabet') {
        return a.abbreviation.localeCompare(b.abbreviation);
      }
      return a.korean.localeCompare(b.korean, 'ko');
    });

    return result;
  }, [activeCategory, searchQuery, sortBy]);

  // ========== 카테고리 이모지 ==========
  const getCategoryEmoji = (category: GlossaryCategory) => {
    const filter = glossaryCategoryFilters.find((f) => f.id === category);
    return filter?.emoji || '📖';
  };

  // ========== 카테고리 라벨 ==========
  const getCategoryLabel = (category: GlossaryCategory) => {
    const filter = glossaryCategoryFilters.find((f) => f.id === category);
    return filter?.label || category;
  };

  // ========== 카드 토글 ==========
  const toggleExpand = (termId: string) => {
    setExpandedTermId(expandedTermId === termId ? null : termId);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      {/* 모바일 헤더 (검색 포함) */}
      <MobileSearchHeader title="용어사전" />

      {/* 사이드바 - 모바일에서 숨김 */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* 하단 네비게이션 - 모바일에서만 표시 */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* 메인 콘텐츠 */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300 pt-14 md:pt-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {/* ========== 페이지 헤더 + 글로벌 검색바 ========== */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">용어사전</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                경제/금융 용어를 쉽게 찾아보세요
              </p>
            </div>
            {/* 데스크톱 글로벌 검색바 (lg 이상에서만 표시) */}
            <div className="hidden lg:block w-72 flex-shrink-0">
              <GlobalSearch compact />
            </div>
          </div>

          {/* ========== 검색 바 ========== */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="용어 검색 (CPI, FOMC, 주가수익비율...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {/* 검색 아이콘 */}
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {/* 검색어 지우기 버튼 */}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ========== 필터 및 정렬 ========== */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* 카테고리 필터 */}
            <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
              {glossaryCategoryFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveCategory(filter.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === filter.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{filter.emoji}</span>
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>

            {/* 정렬 버튼 */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setSortBy('alphabet')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'alphabet'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                ABC순
              </button>
              <button
                onClick={() => setSortBy('korean')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'korean'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                가나다순
              </button>
            </div>
          </div>

          {/* ========== 검색 결과 수 ========== */}
          <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            총 <span className="font-semibold text-gray-900 dark:text-white">
              {isLoading ? '-' : filteredAndSortedTerms.length}
            </span>개의 용어
          </div>

          {/* ========== 용어 카드 그리드 - 로딩 중이면 스켈레톤 ========== */}
          {isLoading ? (
            // 로딩 스켈레톤 (6개의 용어 카드 플레이스홀더)
            <GlossaryCardSkeletonGrid count={6} />
          ) : (
            // 실제 데이터
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAndSortedTerms.map((term) => (
                <GlossaryCard
                  key={term.id}
                  term={term}
                  isExpanded={expandedTermId === term.id}
                  onToggle={() => toggleExpand(term.id)}
                  getCategoryEmoji={getCategoryEmoji}
                  getCategoryLabel={getCategoryLabel}
                />
              ))}
            </div>
          )}

          {/* ========== 빈 상태 ========== */}
          {!isLoading && filteredAndSortedTerms.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                검색 결과가 없습니다
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                다른 검색어나 카테고리를 선택해보세요.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * 용어 카드 컴포넌트
 */
interface GlossaryCardProps {
  term: GlossaryTerm;
  isExpanded: boolean;
  onToggle: () => void;
  getCategoryEmoji: (category: GlossaryCategory) => string;
  getCategoryLabel: (category: GlossaryCategory) => string;
}

function GlossaryCard({
  term,
  isExpanded,
  onToggle,
  getCategoryEmoji,
  getCategoryLabel,
}: GlossaryCardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md dark:hover:shadow-gray-900/50 ${
        isExpanded ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      {/* 카드 헤더 (클릭 가능) */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-start gap-3"
      >
        {/* 카테고리 아이콘 */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <span className="text-xl">{getCategoryEmoji(term.category)}</span>
        </div>

        {/* 용어 정보 */}
        <div className="flex-1 min-w-0">
          {/* 약어 + 카테고리 뱃지 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {term.abbreviation}
            </span>
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-500 dark:text-gray-400">
              {getCategoryLabel(term.category)}
            </span>
          </div>

          {/* 영문 전체명 */}
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {term.fullName}
          </p>

          {/* 한글명 */}
          <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
            {term.korean}
          </p>
        </div>

        {/* 확장 아이콘 */}
        <div className="flex-shrink-0">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
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
        </div>
      </button>

      {/* 확장된 설명 */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
            {term.description}
          </p>

          {/* 관련 용어 */}
          {term.relatedTerms && term.relatedTerms.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">관련 용어: </span>
              {term.relatedTerms.map((relatedId, index) => {
                const relatedTerm = glossaryTerms.find((t) => t.id === relatedId);
                return relatedTerm ? (
                  <span key={relatedId}>
                    <Link
                      href={`/glossary?search=${relatedTerm.abbreviation}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {relatedTerm.abbreviation}
                    </Link>
                    {index < term.relatedTerms!.length - 1 && ', '}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
