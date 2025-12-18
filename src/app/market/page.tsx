'use client';

/**
 * 시세 페이지 (Market Page)
 *
 * 탭 구조:
 * 1. 1차 탭: [국가별 시장] / [글로벌 시장]
 *
 * 2. 국가별 시장 선택 시:
 *    - 국가 탭: 미국 / 한국 / 일본 / 홍콩
 *    - 카테고리 탭: 전체 / 지수 / 주식 / ETF
 *
 * 3. 글로벌 시장 선택 시:
 *    - 국가 탭: 숨김
 *    - 카테고리 탭: 전체 / 암호화폐 / 원자재 / 환율
 *
 * URL 구조:
 * - /market?type=country&country=us&category=stocks
 * - /market?type=global&category=crypto
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MarketRegion, MarketCategory, MarketType } from '@/types';
import { Sidebar, BottomNav } from '@/components/layout';
import { MobileSearchHeader, GlobalSearch } from '@/components/features/search';
import {
  MarketTabs,
  MarketTypeTabs,
  MarketCategoryTabs,
  IndexCard,
  StockTable,
  TopMovers,
  IndicesContent,
  StocksContent,
  ETFContent,
  CryptoContent,
  CommodityContent,
  ForexContent,
  GlobalOverviewContent,
} from '@/components/features/market';
import { marketIndices, popularStocks, topGainers, topLosers } from '@/constants';

/**
 * 메인 마켓 컨텐츠 컴포넌트
 * useSearchParams를 사용하므로 Suspense로 감싸야 함
 */
function MarketContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL에서 초기값 읽기
  const initialType = (searchParams.get('type') as MarketType) || 'country';
  const initialCountry = (searchParams.get('country') as MarketRegion) || 'us';
  const initialCategory = (searchParams.get('category') as MarketCategory) || 'all';

  // 상태 관리
  const [activeMenu, setActiveMenu] = useState('market');
  const [activeType, setActiveType] = useState<MarketType>(initialType);
  const [activeMarket, setActiveMarket] = useState<MarketRegion>(initialCountry);
  const [activeCategory, setActiveCategory] = useState<MarketCategory>(initialCategory);

  /**
   * URL 쿼리 파라미터 업데이트
   */
  const updateURL = (type: MarketType, country: MarketRegion, category: MarketCategory) => {
    const params = new URLSearchParams();
    params.set('type', type);
    if (type === 'country') {
      params.set('country', country);
    }
    params.set('category', category);
    router.replace(`/market?${params.toString()}`, { scroll: false });
  };

  /**
   * 1차 탭 변경 핸들러
   * 타입 변경 시 카테고리를 'all'로 초기화
   */
  const handleTypeChange = (type: MarketType) => {
    setActiveType(type);
    setActiveCategory('all');
    updateURL(type, activeMarket, 'all');
  };

  /**
   * 국가 탭 변경 핸들러
   */
  const handleMarketChange = (market: MarketRegion) => {
    setActiveMarket(market);
    updateURL(activeType, market, activeCategory);
  };

  /**
   * 카테고리 탭 변경 핸들러
   */
  const handleCategoryChange = (category: MarketCategory) => {
    setActiveCategory(category);
    updateURL(activeType, activeMarket, category);
  };

  // 현재 국가의 데이터 (국가별 시장용)
  const currentIndices = marketIndices[activeMarket];
  const currentStocks = popularStocks[activeMarket];
  const currentGainers = topGainers[activeMarket];
  const currentLosers = topLosers[activeMarket];

  /**
   * 국가별 시장 콘텐츠 렌더링
   */
  const renderCountryContent = () => {
    switch (activeCategory) {
      // 전체: 지수 + 인기 종목 + 등락률
      case 'all':
        return (
          <>
            {/* 주요 지수 섹션 */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">주요 지수</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {currentIndices.map((index) => (
                  <IndexCard key={index.id} index={index} />
                ))}
              </div>
            </section>

            {/* 인기 종목 섹션 */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">인기 종목</h2>
              <StockTable stocks={currentStocks} market={activeMarket} />
            </section>

            {/* 등락률 TOP 섹션 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">등락률 TOP</h2>
              <TopMovers gainers={currentGainers} losers={currentLosers} />
            </section>
          </>
        );

      case 'indices':
        return <IndicesContent market={activeMarket} />;

      case 'stocks':
        return <StocksContent market={activeMarket} />;

      case 'etf':
        return <ETFContent market={activeMarket} />;

      default:
        return null;
    }
  };

  /**
   * 글로벌 시장 콘텐츠 렌더링
   */
  const renderGlobalContent = () => {
    switch (activeCategory) {
      // 전체: 암호화폐 + 원자재 + 환율 요약
      case 'all':
        return <GlobalOverviewContent />;

      case 'crypto':
        return <CryptoContent />;

      case 'commodities':
        return <CommodityContent />;

      case 'forex':
        return <ForexContent />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      {/* 모바일 헤더 (검색 포함) */}
      <MobileSearchHeader title="시세" />

      {/* Sidebar - 모바일에서 숨김 */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Bottom Navigation - 모바일에서만 표시 */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* 메인 콘텐츠 영역 */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300 pt-14 md:pt-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {/* 페이지 헤더 + 검색바 */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">시세</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">실시간 글로벌 시장 정보</p>
            </div>
            {/* 데스크톱 검색바 (lg 이상에서만 표시) */}
            <div className="hidden lg:block w-72 flex-shrink-0">
              <GlobalSearch compact />
            </div>
          </div>

          {/* 1차 탭: 국가별 시장 / 글로벌 시장 */}
          <div className="mb-6">
            <MarketTypeTabs activeType={activeType} onTypeChange={handleTypeChange} />
          </div>

          {/* 국가 탭 (국가별 시장 선택 시에만 표시) */}
          {activeType === 'country' && (
            <div className="mb-4">
              <MarketTabs activeMarket={activeMarket} onMarketChange={handleMarketChange} />
            </div>
          )}

          {/* 카테고리 탭 */}
          <div className="mb-6">
            <MarketCategoryTabs
              marketType={activeType}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>

          {/* 콘텐츠 영역 */}
          {activeType === 'country' ? renderCountryContent() : renderGlobalContent()}
        </div>
      </main>
    </div>
  );
}

/**
 * 시세 페이지 메인 컴포넌트
 * Suspense로 감싸서 useSearchParams 지원
 */
export default function MarketPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">로딩 중...</div>
      </div>
    }>
      <MarketContent />
    </Suspense>
  );
}
