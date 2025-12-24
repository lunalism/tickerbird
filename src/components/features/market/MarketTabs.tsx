'use client';

/**
 * MarketTabs 컴포넌트
 * 국가 선택 탭 (한국/미국/일본/홍콩)
 *
 * @description
 * 시세 페이지에서 국가별 시장을 선택할 때 사용하는 탭 컴포넌트입니다.
 * 한국 서비스이므로 한국이 첫 번째로 표시됩니다.
 *
 * 레이아웃:
 * - 데스크톱: 시세 페이지 상단, 카테고리 탭과 같은 줄의 왼쪽에 배치
 * - 모바일: 카테고리 탭 위에 별도 줄로 배치, 가로 스크롤 지원
 *
 * 스타일:
 * - 활성 탭: 파란색 배경 + 흰색 텍스트 + 그림자
 * - 비활성 탭: 흰색/회색 배경 + 테두리 (다크모드 지원)
 *
 * @see /src/constants/market.ts - 탭 데이터 정의
 * @see /src/app/market/page.tsx - 사용처
 */

import { MarketRegion, MarketTab } from '@/types';
import { marketTabs } from '@/constants';

interface MarketTabsProps {
  /** 현재 선택된 국가 ('kr' | 'us' | 'jp' | 'hk') */
  activeMarket: MarketRegion;
  /** 국가 변경 시 호출되는 핸들러 */
  onMarketChange: (market: MarketRegion) => void;
}

export function MarketTabs({ activeMarket, onMarketChange }: MarketTabsProps) {
  return (
    // 가로 스크롤 가능한 탭 컨테이너
    // scrollbar-hide: 스크롤바 숨김 (모바일에서 깔끔한 UI)
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {marketTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onMarketChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeMarket === tab.id
              // 활성화된 탭 스타일: 파란색 배경 + 그림자 효과
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              // 비활성화된 탭 스타일 (다크모드 지원)
              // 라이트: 흰색 배경, 회색 텍스트, 회색 테두리
              // 다크: 진회색 배경, 밝은회색 텍스트, 진회색 테두리
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          {/* 국기 이모지 - 시각적 식별 용이 */}
          <span className="text-lg">{tab.flag}</span>
          {/* 국가 레이블 */}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
