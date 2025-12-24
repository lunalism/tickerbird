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
import { IndexCardSkeletonGrid, StockTableSkeleton } from '@/components/skeleton';
import { marketIndices, popularStocks, topGainers, topLosers } from '@/constants';
import { useKoreanIndices, useKoreanStocks } from '@/hooks';

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
    setIsLoading(true);
    // 테스트용 2초 딜레이 (실제 배포 시 제거)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [activeType, activeMarket, activeCategory]);

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

  // 한국 시장 실시간 데이터
  const {
    indices: koreanIndices,
    isLoading: isKoreanIndicesLoading,
    error: koreanIndicesError,
    refetch: refetchKoreanIndices
  } = useKoreanIndices();

  const {
    stocks: koreanStocks,
    isLoading: isKoreanStocksLoading,
    error: koreanStocksError,
    refetch: refetchKoreanStocks
  } = useKoreanStocks();

  // 현재 국가의 데이터 (국가별 시장용)
  // 한국: API 데이터, 그 외: 목업 데이터
  const currentIndices = activeMarket === 'kr' ? koreanIndices : marketIndices[activeMarket];
  const currentStocks = activeMarket === 'kr' ? koreanStocks : popularStocks[activeMarket];
  const currentGainers = topGainers[activeMarket];
  const currentLosers = topLosers[activeMarket];

  // 한국 시장 로딩/에러 상태
  const isKoreanDataLoading = activeMarket === 'kr' && (isKoreanIndicesLoading || isKoreanStocksLoading);
  const koreanDataError = activeMarket === 'kr' ? (koreanIndicesError || koreanStocksError) : null;

  /**
   * 로딩 스켈레톤 렌더링 (국가별 시장)
   */
  const renderCountrySkeleton = () => (
    <>
      {/* 주요 지수 스켈레톤 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">주요 지수</h2>
        <IndexCardSkeletonGrid count={4} />
      </section>

      {/* 인기 종목 스켈레톤 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">인기 종목</h2>
        <StockTableSkeleton rowCount={10} />
      </section>
    </>
  );

  /**
   * 로딩 스켈레톤 렌더링 (글로벌 시장)
   */
  const renderGlobalSkeleton = () => (
    <>
      {/* 지수 카드 스켈레톤 */}
      <section className="mb-8">
        <IndexCardSkeletonGrid count={4} />
      </section>

      {/* 테이블 스켈레톤 */}
      <section>
        <StockTableSkeleton rowCount={10} />
      </section>
    </>
  );

  /**
   * 국가별 시장 콘텐츠 렌더링
   */
  const renderCountryContent = () => {
    // 로딩 중이면 스켈레톤 표시 (한국 시장 제외 - 별도 처리)
    if (isLoading && activeMarket !== 'kr') {
      return renderCountrySkeleton();
    }

    switch (activeCategory) {
      // 전체: 지수 + 인기 종목 + 등락률
      case 'all':
        // 한국 시장 로딩 중
        if (isKoreanDataLoading) {
          return renderCountrySkeleton();
        }

        // 한국 시장 에러
        if (koreanDataError) {
          return (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{koreanDataError}</p>
              <button
                onClick={() => {
                  refetchKoreanIndices();
                  refetchKoreanStocks();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                다시 시도
              </button>
            </div>
          );
        }

        return (
          <>
            {/* 주요 지수 섹션 */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                주요 지수
                {activeMarket === 'kr' && (
                  <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
                    실시간
                  </span>
                )}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {currentIndices.map((index) => (
                  <IndexCard key={index.id} index={index} />
                ))}
              </div>
            </section>

            {/* 인기 종목 섹션 */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                인기 종목
                {activeMarket === 'kr' && (
                  <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
                    실시간
                  </span>
                )}
              </h2>
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
    // 로딩 중이면 스켈레톤 표시
    if (isLoading) {
      return renderGlobalSkeleton();
    }

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

          {/* 콘텐츠 영역 - 로딩 상태에 따라 스켈레톤 또는 실제 데이터 표시 */}
          {activeType === 'country' ? renderCountryContent() : renderGlobalContent()}
        </div>
      </main>
    </div>
  );
}

/**
 * 시세 페이지 로딩 스켈레톤 (Suspense fallback용)
 */
function MarketPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300 pt-14 md:pt-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {/* 헤더 스켈레톤 */}
          <div className="mb-6">
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2 skeleton-shimmer" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer" />
          </div>

          {/* 지수 카드 스켈레톤 */}
          <section className="mb-8">
            <IndexCardSkeletonGrid count={4} />
          </section>

          {/* 테이블 스켈레톤 */}
          <section>
            <StockTableSkeleton rowCount={10} />
          </section>
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
    <Suspense fallback={<MarketPageSkeleton />}>
      <MarketContent />
    </Suspense>
  );
}
