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
  VolumeMovers,
  MarketStatusBanner,
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
import {
  useKoreanIndices,
  useKoreanStocks,
  useVolumeRanking,
  useFluctuationRanking,
  useMarketCapRanking,
  // 미국 시장 훅
  useUSIndices,
  useUSStocks,
  // 가격 알림 체크 훅
  usePriceAlertCheck,
  type PriceData,
} from '@/hooks';
import { useAuthStore } from '@/stores';

/**
 * 거래량 포맷팅 (표시용)
 * 1백만 이상: xxM, 1천 이상: xxK
 */
function formatVolumeForDisplay(volume: number): string {
  if (volume >= 1000000) {
    return (volume / 1000000).toFixed(1) + 'M';
  }
  if (volume >= 1000) {
    return (volume / 1000).toFixed(1) + 'K';
  }
  return volume.toString();
}

/**
 * 메인 마켓 컨텐츠 컴포넌트
 * useSearchParams를 사용하므로 Suspense로 감싸야 함
 */
function MarketContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL에서 초기값 읽기
  // 한국 서비스이므로 기본 국가를 한국(kr)으로 설정
  const initialType = (searchParams.get('type') as MarketType) || 'country';
  const initialCountry = (searchParams.get('country') as MarketRegion) || 'kr';
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

  // ========== 한국 시장 실시간 데이터 (한국투자증권 API) ==========

  // 한국 지수 데이터
  const {
    indices: koreanIndices,
    isLoading: isKoreanIndicesLoading,
    error: koreanIndicesError,
    refetch: refetchKoreanIndices
  } = useKoreanIndices();

  // 기존 주식 데이터 (폴백용)
  const {
    stocks: koreanStocks,
    isLoading: isKoreanStocksLoading,
    error: koreanStocksError,
    refetch: refetchKoreanStocks
  } = useKoreanStocks();

  // ========== 순위 API 데이터 ==========

  // 거래량순위 (인기 종목용) - 상위 10개
  const {
    data: volumeRankingData,
    isLoading: isVolumeRankingLoading,
    error: volumeRankingError,
    refetch: refetchVolumeRanking
  } = useVolumeRanking('all');

  // 등락률순위 - 상승 TOP
  const {
    data: gainersRankingData,
    isLoading: isGainersLoading,
    error: gainersError,
    refetch: refetchGainers
  } = useFluctuationRanking('all', 'asc');

  // 등락률순위 - 하락 TOP
  const {
    data: losersRankingData,
    isLoading: isLosersLoading,
    error: losersError,
    refetch: refetchLosers
  } = useFluctuationRanking('all', 'desc');

  // 시가총액순위 (주식 카테고리용)
  const {
    data: marketCapRankingData,
    isLoading: isMarketCapLoading,
    error: marketCapError,
    refetch: refetchMarketCap
  } = useMarketCapRanking('all');

  // ========== 미국 시장 실시간 데이터 (한국투자증권 해외주식 API) ==========

  // 미국 지수 데이터 (S&P500, NASDAQ, DOW JONES)
  const {
    indices: usIndices,
    isLoading: isUSIndicesLoading,
    error: usIndicesError,
    refetch: refetchUSIndices
  } = useUSIndices();

  // 미국 주식 데이터 (시가총액 상위 50개)
  const {
    stocks: usStockPrices,
    isLoading: isUSStocksLoading,
    error: usStocksError,
    refetch: refetchUSStocks
  } = useUSStocks();

  // ========== 가격 알림 체크 ==========

  // 인증 상태 (알림 체크용)
  const { isLoggedIn } = useAuthStore();

  // 가격 알림 체크 훅
  const { checkPriceAlerts } = usePriceAlertCheck();

  /**
   * 시세 데이터 로드 완료 시 가격 알림 체크
   *
   * 한국 종목: 거래량 순위 API 데이터 사용
   * 미국 종목: 해외주식 시세 API 데이터 사용
   *
   * 로그인 상태일 때만 체크 실행
   */
  useEffect(() => {
    // 비로그인 상태에서는 체크하지 않음
    if (!isLoggedIn) return;

    // 한국 시장 데이터가 로드되면 알림 체크
    if (activeMarket === 'kr' && volumeRankingData.length > 0 && !isVolumeRankingLoading) {
      const priceDataList: PriceData[] = volumeRankingData.map(stock => ({
        ticker: stock.symbol,
        price: stock.currentPrice,
        market: 'KR' as const,
      }));

      console.log('[MarketPage] 한국 시장 가격 알림 체크:', priceDataList.length, '종목');
      checkPriceAlerts(priceDataList);
    }

    // 미국 시장 데이터가 로드되면 알림 체크
    if (activeMarket === 'us' && usStockPrices.length > 0 && !isUSStocksLoading) {
      const priceDataList: PriceData[] = usStockPrices.map(stock => ({
        ticker: stock.symbol,
        price: stock.currentPrice,
        market: 'US' as const,
      }));

      console.log('[MarketPage] 미국 시장 가격 알림 체크:', priceDataList.length, '종목');
      checkPriceAlerts(priceDataList);
    }
  }, [
    isLoggedIn,
    activeMarket,
    volumeRankingData,
    isVolumeRankingLoading,
    usStockPrices,
    isUSStocksLoading,
    checkPriceAlerts,
  ]);

  // ========== 데이터 변환 ==========

  // 미국 지수 데이터를 MarketIndex 형식으로 변환
  // useUSIndices 훅에서 가져온 데이터를 UI에 맞게 변환
  // - isEstimated: ETF 기반 추정치 여부 (SPX는 실제 데이터, CCMP/INDU는 ETF 추정)
  const usMarketIndices = usIndices.length > 0
    ? usIndices.map((idx) => ({
        id: idx.indexCode.toLowerCase(),
        name: idx.indexName,
        value: idx.currentValue,
        change: idx.change,
        changePercent: idx.changePercent,
        chartData: [idx.currentValue], // 차트 데이터는 추후 확장 가능
        isEstimated: idx.isEstimated,  // ETF 기반 추정치 여부
      }))
    : marketIndices['us']; // API 실패 시 목업 데이터 폴백

  // 미국 주식 데이터를 Stock 형식으로 변환
  // useUSStocks 훅에서 가져온 데이터를 UI에 맞게 변환 (상위 10개)
  const usPopularStocks = usStockPrices.length > 0
    ? usStockPrices.slice(0, 10).map((stock, idx) => ({
        rank: idx + 1,
        name: stock.name,
        ticker: stock.symbol,
        price: stock.currentPrice,
        change: stock.change,
        changePercent: stock.changePercent,
        volume: formatVolumeForDisplay(stock.volume),
        domain: '', // 도메인 정보 없음
      }))
    : popularStocks['us']; // API 실패 시 목업 데이터 폴백

  // 미국 등락률 TOP 데이터 (API 데이터에서 정렬)
  // 상승 TOP: changePercent 내림차순 정렬 후 상위 5개
  const usGainers = usStockPrices.length > 0
    ? [...usStockPrices]
        .filter(s => s.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 5)
        .map(stock => ({
          name: stock.name,
          ticker: stock.symbol,
          changePercent: stock.changePercent,
        }))
    : topGainers['us'];

  // 하락 TOP: changePercent 오름차순 정렬 후 상위 5개
  const usLosers = usStockPrices.length > 0
    ? [...usStockPrices]
        .filter(s => s.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 5)
        .map(stock => ({
          name: stock.name,
          ticker: stock.symbol,
          changePercent: stock.changePercent,
        }))
    : topLosers['us'];

  // ========== 미국 거래량/거래대금 TOP 5 데이터 ==========
  // VolumeMovers 컴포넌트에서 사용하는 형식으로 변환

  // 거래량 TOP 5: volume 기준 내림차순 정렬
  const usVolumeTop5 = usStockPrices.length > 0
    ? [...usStockPrices]
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5)
        .map(stock => ({
          name: stock.name,
          ticker: stock.symbol,
          changePercent: stock.changePercent,
          volume: stock.volume,
          tradingValue: stock.tradingValue,
        }))
    : [];

  // 거래대금 TOP 5: tradingValue 기준 내림차순 정렬
  const usTradingValueTop5 = usStockPrices.length > 0
    ? [...usStockPrices]
        .sort((a, b) => b.tradingValue - a.tradingValue)
        .slice(0, 5)
        .map(stock => ({
          name: stock.name,
          ticker: stock.symbol,
          changePercent: stock.changePercent,
          volume: stock.volume,
          tradingValue: stock.tradingValue,
        }))
    : [];

  // 현재 국가의 지수 데이터
  // 한국: 한국투자증권 국내지수 API
  // 미국: 한국투자증권 해외지수 API
  // 기타: 목업 데이터
  const currentIndices = activeMarket === 'kr'
    ? koreanIndices
    : activeMarket === 'us'
      ? usMarketIndices
      : marketIndices[activeMarket];

  // 현재 국가의 인기 종목
  // 한국: 거래량순위 API 데이터
  // 미국: 해외주식 시세 API 데이터 (상위 10개)
  // 기타: 목업 데이터
  const currentStocks = activeMarket === 'kr' && volumeRankingData.length > 0
    ? volumeRankingData.slice(0, 10).map((item, idx) => ({
        rank: idx + 1,
        name: item.name,
        ticker: item.symbol,
        price: item.currentPrice,
        change: item.change,
        changePercent: item.changePercent,
        volume: formatVolumeForDisplay(item.volume),
        domain: '', // 도메인 정보 없음
      }))
    : activeMarket === 'kr'
      ? koreanStocks // 거래량순위 실패 시 기존 데이터 폴백
      : activeMarket === 'us'
        ? usPopularStocks // 미국: 해외주식 시세 API
        : popularStocks[activeMarket];

  // ========== 등락률 TOP 계산 ==========
  // 한국 시장: 등락률순위 API 데이터 사용
  // 미국 시장: 해외주식 시세 API 데이터에서 계산
  // 그 외 시장: 목업 데이터 사용

  const currentGainers = activeMarket === 'kr' && gainersRankingData.length > 0
    ? gainersRankingData
        .filter(item => item.symbol) // symbol이 있는 항목만 필터
        .slice(0, 5)
        .map(item => ({
          name: item.name,
          ticker: item.symbol,
          changePercent: item.changePercent,
        }))
    : activeMarket === 'kr' && koreanStocks.length > 0
      // 등락률순위 API 실패 시 기존 데이터 폴백
      ? koreanStocks
          .filter(stock => stock.changePercent > 0)
          .slice(0, 5)
          .map(stock => ({
            name: stock.name,
            ticker: stock.ticker,
            changePercent: stock.changePercent,
          }))
      : activeMarket === 'us'
        ? usGainers // 미국: 해외주식 시세 API에서 계산
        : topGainers[activeMarket];

  const currentLosers = activeMarket === 'kr' && losersRankingData.length > 0
    ? losersRankingData
        .filter(item => item.symbol) // symbol이 있는 항목만 필터
        .slice(0, 5)
        .map(item => ({
          name: item.name,
          ticker: item.symbol,
          changePercent: item.changePercent,
        }))
    : activeMarket === 'kr' && koreanStocks.length > 0
      // 등락률순위 API 실패 시 기존 데이터 폴백
      ? koreanStocks
          .filter(stock => stock.changePercent < 0)
          .sort((a, b) => a.changePercent - b.changePercent)
          .slice(0, 5)
          .map(stock => ({
            name: stock.name,
            ticker: stock.ticker,
            changePercent: stock.changePercent,
          }))
      : activeMarket === 'us'
        ? usLosers // 미국: 해외주식 시세 API에서 계산
        : topLosers[activeMarket];

  // 한국 시장 로딩/에러 상태
  const isKoreanDataLoading = activeMarket === 'kr' && (
    isKoreanIndicesLoading ||
    isVolumeRankingLoading ||
    isGainersLoading ||
    isLosersLoading
  );
  const koreanDataError = activeMarket === 'kr' ? (
    koreanIndicesError || volumeRankingError || gainersError || losersError
  ) : null;

  // 미국 시장 로딩/에러 상태
  const isUSDataLoading = activeMarket === 'us' && (
    isUSIndicesLoading ||
    isUSStocksLoading
  );
  const usDataError = activeMarket === 'us' ? (
    usIndicesError || usStocksError
  ) : null;

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
    // 로딩 중이면 스켈레톤 표시 (한국/미국 시장 제외 - 별도 처리)
    if (isLoading && activeMarket !== 'kr' && activeMarket !== 'us') {
      return renderCountrySkeleton();
    }

    switch (activeCategory) {
      // 전체: 지수 + 인기 종목 + 등락률
      case 'all':
        // 한국 시장 로딩 중
        if (isKoreanDataLoading) {
          return renderCountrySkeleton();
        }

        // 미국 시장 로딩 중
        if (isUSDataLoading) {
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
                  refetchVolumeRanking();
                  refetchGainers();
                  refetchLosers();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                다시 시도
              </button>
            </div>
          );
        }

        // 미국 시장 에러
        if (usDataError) {
          return (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">{usDataError}</p>
              <button
                onClick={() => {
                  refetchUSIndices();
                  refetchUSStocks();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                다시 시도
              </button>
            </div>
          );
        }

        // ========== 거래량/거래대금 TOP 데이터 준비 ==========
        // 거래량순위 API 데이터를 활용하여 거래량/거래대금 기준 정렬
        // 거래량순위: volume 기준 정렬 (API 기본값)
        // 거래대금순위: tradingValue 기준 정렬
        const volumeTop5 = activeMarket === 'kr' && volumeRankingData.length > 0
          ? volumeRankingData.slice(0, 5).map(item => ({
              name: item.name,
              ticker: item.symbol,
              changePercent: item.changePercent,
              volume: item.volume,
              tradingValue: item.tradingValue,
            }))
          : [];

        // 거래대금 기준으로 정렬 후 상위 5개 추출
        const tradingValueTop5 = activeMarket === 'kr' && volumeRankingData.length > 0
          ? [...volumeRankingData]
              .sort((a, b) => b.tradingValue - a.tradingValue)
              .slice(0, 5)
              .map(item => ({
                name: item.name,
                ticker: item.symbol,
                changePercent: item.changePercent,
                volume: item.volume,
                tradingValue: item.tradingValue,
              }))
          : [];

        return (
          <>
            {/* ========== 시장 상태 배너 (휴장/프리마켓/애프터마켓 시 표시) ========== */}
            {/* 한국/미국 시장의 현재 상태를 상단에 표시 */}
            {(activeMarket === 'kr' || activeMarket === 'us') && (
              <MarketStatusBanner market={activeMarket} className="mb-6" />
            )}

            {/* ========== 주요 지수 섹션 ========== */}
            {/* 한국/미국: 한국투자증권 API 실시간 데이터, 기타: 목업 데이터 */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                주요 지수
                {(activeMarket === 'kr' || activeMarket === 'us') && (
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

            {/* ========== 인기 종목 섹션 (테이블 형태) ========== */}
            {/* 한국 시장: 거래량순위 API 데이터 (상위 10개) */}
            {/* 미국 시장: 해외주식 시세 API 데이터 (상위 10개) */}
            {/* 기타 시장: 목업 데이터 */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                인기 종목
                {(activeMarket === 'kr' || activeMarket === 'us') && (
                  <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
                    실시간
                  </span>
                )}
              </h2>
              <StockTable stocks={currentStocks} market={activeMarket} />
            </section>

            {/* ========== 상승/하락 TOP 섹션 ========== */}
            {/* 한국 시장: 등락률순위 API 데이터 (상위 5개씩) */}
            {/* 2열 그리드: 상승 TOP 5 / 하락 TOP 5 */}
            <section className="mb-8">
              <TopMovers gainers={currentGainers} losers={currentLosers} />
            </section>

            {/* ========== 거래량/거래대금 TOP 섹션 (한국/미국 시장) ========== */}
            {/* 한국: 거래량순위 API 데이터 사용 (단위: 억원) */}
            {/* 미국: 해외주식 시세 API 데이터에서 정렬 (단위: USD) */}
            {/* 2열 그리드: 거래량 TOP 5 / 거래대금 TOP 5 */}
            {activeMarket === 'kr' && volumeTop5.length > 0 && (
              <section>
                <VolumeMovers volumeData={volumeTop5} tradingValueData={tradingValueTop5} market="kr" />
              </section>
            )}
            {activeMarket === 'us' && usVolumeTop5.length > 0 && (
              <section>
                <VolumeMovers volumeData={usVolumeTop5} tradingValueData={usTradingValueTop5} market="us" />
              </section>
            )}
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

          {/* ========== 필터 탭 영역 ========== */}
          {/*
           * 레이아웃 구조:
           * - 국가별 시장 선택 시: 국가 탭(왼쪽) + 카테고리 탭(오른쪽) 같은 줄 배치
           * - 글로벌 시장 선택 시: 카테고리 탭만 왼쪽 정렬
           *
           * 반응형 처리:
           * - 데스크톱 (md 이상): flex justify-between으로 양쪽 정렬
           * - 모바일 (md 미만): 수직 스택 (국가 탭 → 카테고리 탭)
           */}
          {activeType === 'country' ? (
            // 국가별 시장: 국가 탭 + 카테고리 탭 같은 줄
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* 국가 탭 - 왼쪽 정렬 */}
              <div className="flex-shrink-0">
                <MarketTabs activeMarket={activeMarket} onMarketChange={handleMarketChange} />
              </div>
              {/* 카테고리 탭 - 오른쪽 정렬 (데스크톱), 왼쪽 정렬 (모바일) */}
              <div className="flex-shrink-0">
                <MarketCategoryTabs
                  marketType={activeType}
                  activeCategory={activeCategory}
                  onCategoryChange={handleCategoryChange}
                />
              </div>
            </div>
          ) : (
            // 글로벌 시장: 카테고리 탭만 왼쪽 정렬
            <div className="mb-6">
              <MarketCategoryTabs
                marketType={activeType}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
              />
            </div>
          )}

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
