'use client';

/**
 * MarketCategoryTabs 컴포넌트
 * 시세 페이지의 카테고리 필터 탭
 *
 * @description
 * 마켓 타입에 따라 다른 카테고리를 표시합니다.
 * - 국가별 시장: 전체 / 지수 / 주식 / ETF
 * - 글로벌 시장: 전체 / 암호화폐 / 원자재 / 환율
 *
 * 레이아웃:
 * - 데스크톱 + 국가별 시장: 시세 페이지 상단, 국가 탭과 같은 줄의 오른쪽에 배치
 * - 데스크톱 + 글로벌 시장: 시세 페이지 상단, 왼쪽 정렬
 * - 모바일: 국가 탭 아래에 별도 줄로 배치, 가로 스크롤 지원
 *
 * 스타일:
 * - 활성 탭: 검정색 배경 + 흰색 텍스트 (다크모드: 반전)
 * - 비활성 탭: 회색 배경 (다크모드 지원)
 *
 * @see /src/constants/market.ts - 탭 데이터 정의
 * @see /src/app/market/page.tsx - 사용처
 */

import { MarketCategory, MarketType } from '@/types';
import { countryCategoryTabs, globalCategoryTabs } from '@/constants';

interface MarketCategoryTabsProps {
  /** 현재 마켓 타입 ('country' | 'global') */
  marketType: MarketType;
  /** 현재 선택된 카테고리 */
  activeCategory: MarketCategory;
  /** 카테고리 변경 시 호출되는 핸들러 */
  onCategoryChange: (category: MarketCategory) => void;
}

export function MarketCategoryTabs({
  marketType,
  activeCategory,
  onCategoryChange
}: MarketCategoryTabsProps) {
  // 마켓 타입에 따라 표시할 카테고리 탭 선택
  // country: 전체/지수/주식/ETF
  // global: 전체/암호화폐/원자재/환율
  const tabs = marketType === 'country' ? countryCategoryTabs : globalCategoryTabs;

  return (
    // 가로 스크롤 가능한 탭 컨테이너
    // scrollbar-hide: 스크롤바 숨김 (모바일에서 깔끔한 UI)
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onCategoryChange(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
            activeCategory === tab.id
              // 활성화된 탭 스타일 (다크모드 지원)
              // 라이트: 검정색 배경 + 흰색 텍스트
              // 다크: 흰색 배경 + 검정색 텍스트 (반전)
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              // 비활성화된 탭 스타일 (다크모드 지원)
              // 라이트: 연회색 배경, 회색 텍스트
              // 다크: 진회색 배경, 밝은회색 텍스트
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {/* 카테고리 아이콘 - 시각적 식별 용이 */}
          <span className="text-base">{tab.icon}</span>
          {/* 카테고리 레이블 */}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
