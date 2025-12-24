'use client';

/**
 * ETFContent 컴포넌트
 *
 * ETF 카테고리 선택 시 표시되는 콘텐츠
 *
 * ============================================================
 * 데이터 소스:
 * ============================================================
 * - 한국 (kr): 한국투자증권 Open API 실시간 데이터
 *   - /api/kis/etf/prices 엔드포인트 사용
 *   - 28개 ETF 종목 (지수추종, 레버리지, 섹터, 해외지수, 채권/원자재)
 *
 * - 미국 (us), 일본 (jp), 홍콩 (hk): 목업 데이터 (constants/market.ts)
 *
 * ============================================================
 * UI 구성:
 * ============================================================
 * - ETF 카드 그리드 (1~4열 반응형)
 * - 각 카드: 티커, ETF명, 가격, 등락률, 미니차트
 * - 하단: 거래량 정보 (한국 시장만, API 제공 시)
 *
 * ============================================================
 * 카테고리 필터 (한국 시장만):
 * ============================================================
 * - 전체, 지수추종, 레버리지/인버스, 섹터/테마, 해외지수, 채권/원자재
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ETF, MarketRegion } from '@/types';
import { etfData, etfCategoryLabels, KoreanETFInfo, USETFInfo, usETFCategoryLabels } from '@/constants';
import { useKoreanETFs, ETFPriceData, useUSETFs, USETFPriceData } from '@/hooks';

interface ETFContentProps {
  /** 현재 선택된 국가 */
  market: MarketRegion;
}

// ==================== ETF 카테고리 타입 ====================

/** 한국 ETF 카테고리 (필터용) */
type ETFCategory = 'all' | KoreanETFInfo['category'];

/** 미국 ETF 카테고리 (필터용) */
type USETFCategory = 'all' | USETFInfo['category'];

// ==================== 카테고리 필터 컴포넌트 ====================

/**
 * ETF 카테고리 필터 탭
 *
 * 한국 시장에서만 표시되며, API 데이터를 카테고리별로 필터링
 *
 * 카테고리:
 * - all: 전체 (28개)
 * - index: 지수 추종 (6개)
 * - leverage: 레버리지/인버스 (6개)
 * - sector: 섹터/테마 (6개)
 * - overseas: 해외지수 (6개)
 * - bond: 채권/원자재 (4개)
 */
function CategoryFilter({
  activeCategory,
  onCategoryChange,
}: {
  activeCategory: ETFCategory;
  onCategoryChange: (category: ETFCategory) => void;
}) {
  // 카테고리 탭 목록 (전체 포함)
  const categories: { id: ETFCategory; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: 'index', label: etfCategoryLabels.index },
    { id: 'leverage', label: etfCategoryLabels.leverage },
    { id: 'sector', label: etfCategoryLabels.sector },
    { id: 'overseas', label: etfCategoryLabels.overseas },
    { id: 'bond', label: etfCategoryLabels.bond },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeCategory === cat.id
              // 활성화된 필터 스타일 (다크모드 지원)
              ? 'bg-blue-600 text-white'
              // 비활성화된 필터 스타일 (다크모드 지원)
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 미국 ETF 카테고리 필터 탭
 */
function USCategoryFilter({
  activeCategory,
  onCategoryChange,
}: {
  activeCategory: USETFCategory;
  onCategoryChange: (category: USETFCategory) => void;
}) {
  // 카테고리 탭 목록 (전체 포함)
  const categories: { id: USETFCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'index', label: usETFCategoryLabels.index },
    { id: 'sector', label: usETFCategoryLabels.sector },
    { id: 'bond', label: usETFCategoryLabels.bond },
    { id: 'commodity', label: usETFCategoryLabels.commodity },
    { id: 'international', label: usETFCategoryLabels.international },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeCategory === cat.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

// ==================== 스켈레톤 컴포넌트 ====================

/**
 * ETF 카드 스켈레톤 (로딩 중 표시)
 *
 * 실제 ETF 카드와 동일한 레이아웃으로 shimmer 효과 적용
 */
function ETFCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse">
      {/* 헤더 스켈레톤 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      {/* 가격 스켈레톤 */}
      <div className="mb-3">
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      {/* 하단 스켈레톤 */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

/**
 * ETF 카드 스켈레톤 그리드
 *
 * @param count - 표시할 스켈레톤 카드 수 (기본: 8)
 */
function ETFSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <ETFCardSkeleton key={idx} />
      ))}
    </div>
  );
}

// ==================== 미니 차트 컴포넌트 ====================

/**
 * 미니 차트 컴포넌트
 *
 * ETF의 최근 가격 추이를 SVG 라인으로 시각화
 * 상승 시 녹색, 하락 시 빨간색
 *
 * @param data - 차트 데이터 배열 (숫자 9개)
 * @param isPositive - 상승 여부 (색상 결정용)
 */
function MiniChart({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  // 데이터 범위 계산 (최소~최대)
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // 0 방지

  // SVG polyline 포인트 생성
  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-16 h-8" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={isPositive ? '#22c55e' : '#ef4444'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// ==================== 가격 포맷팅 함수 ====================

/**
 * 국가별 가격 포맷팅
 *
 * @param price - 가격 (숫자)
 * @param market - 국가 코드
 * @returns 포맷팅된 가격 문자열
 *
 * 형식:
 * - 미국: $xxx.xx
 * - 한국: xxx,xxx원
 * - 일본: ¥xxx,xxx
 * - 홍콩: HK$xxx.xx
 */
function formatPrice(price: number, market: MarketRegion): string {
  switch (market) {
    case 'kr':
      return price.toLocaleString('ko-KR') + '원';
    case 'jp':
      return '¥' + price.toLocaleString('ja-JP');
    case 'hk':
      return 'HK$' + price.toFixed(2);
    default:
      return '$' + price.toFixed(2);
  }
}

/**
 * 국가별 변동폭 포맷팅
 *
 * @param change - 변동폭 (숫자)
 * @param market - 국가 코드
 * @returns 포맷팅된 변동폭 문자열 (부호 포함)
 */
function formatChange(change: number, market: MarketRegion): string {
  const sign = change >= 0 ? '+' : '';
  switch (market) {
    case 'kr':
      return sign + change.toLocaleString('ko-KR') + '원';
    case 'jp':
      return sign + '¥' + Math.abs(change).toLocaleString('ja-JP');
    case 'hk':
      return sign + 'HK$' + Math.abs(change).toFixed(2);
    default:
      return sign + '$' + Math.abs(change).toFixed(2);
  }
}

/**
 * 등락률 포맷팅
 *
 * @param percent - 등락률 (숫자)
 * @returns 퍼센트 문자열 (부호 포함)
 */
function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * 거래량 포맷팅 (숫자 → 문자열)
 *
 * @param volume - 거래량 (숫자)
 * @returns 포맷팅된 거래량 문자열
 *
 * @example
 * formatVolume(365079995) → "365.1M"
 * formatVolume(1234567) → "1.2M"
 * formatVolume(123456) → "123.5K"
 */
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return (volume / 1000000).toFixed(1) + 'M';
  }
  if (volume >= 1000) {
    return (volume / 1000).toFixed(1) + 'K';
  }
  return volume.toLocaleString('ko-KR');
}

/**
 * 차트 데이터 생성 (현재가 기준 가상 데이터)
 *
 * 실제 일별 시세 API가 없으므로, 현재가와 등락률을 기반으로
 * 9개의 데이터 포인트를 생성합니다.
 *
 * @param currentPrice - 현재가
 * @param changePercent - 등락률
 * @returns 차트 데이터 배열 (9개)
 */
function generateChartData(currentPrice: number, changePercent: number): number[] {
  const basePrice = currentPrice / (1 + changePercent / 100);
  const data: number[] = [];
  for (let i = 0; i < 9; i++) {
    const progress = i / 8;
    const noise = (Math.random() - 0.5) * 0.01 * currentPrice;
    const price = basePrice + (currentPrice - basePrice) * progress + noise;
    data.push(Math.round(price * 100) / 100);
  }
  return data;
}

// ==================== ETF 카드 컴포넌트 (목업 데이터용) ====================

/**
 * ETF 카드 컴포넌트 (목업 데이터용)
 *
 * 미국, 일본, 홍콩 시장에서 사용
 * constants/market.ts의 목업 데이터를 표시
 */
function ETFCard({ etf, market }: { etf: ETF; market: MarketRegion }) {
  const router = useRouter();
  const isPositive = etf.change >= 0;

  return (
    <div
      onClick={() => router.push(`/market/${etf.ticker}`)}
      className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700
                 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600
                 transition-all duration-200 cursor-pointer"
    >
      {/* 헤더: 티커 + 미니차트 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          {/* 티커 심볼 */}
          <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg mb-2">
            {etf.ticker}
          </span>
          {/* ETF 이름 */}
          <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">{etf.name}</h3>
        </div>
        <MiniChart data={etf.chartData} isPositive={isPositive} />
      </div>

      {/* 가격 정보 */}
      <div className="mb-3">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(etf.price, market)}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatChange(etf.change, market)}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isPositive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {formatPercent(etf.changePercent)}
          </span>
        </div>
      </div>

      {/* 추가 정보: AUM, 보수율 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">운용자산</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{etf.aum}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">보수율</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{etf.expenseRatio}</p>
        </div>
      </div>
    </div>
  );
}

// ==================== ETF 카드 컴포넌트 (API 데이터용) ====================

/**
 * ETF 카드 컴포넌트 (API 데이터용)
 *
 * 한국 시장에서 사용
 * 한국투자증권 API로 조회한 실시간 데이터를 표시
 *
 * 표시 정보:
 * - 티커 (종목코드)
 * - ETF명
 * - 현재가, 등락폭, 등락률
 * - 거래량 (API 제공 시)
 * - 운용사
 */
function KoreanETFCard({ etf }: { etf: ETFPriceData }) {
  const router = useRouter();
  const isPositive = etf.changePercent >= 0;

  // 차트 데이터 생성 (현재가 기반)
  const chartData = generateChartData(etf.currentPrice, etf.changePercent);

  return (
    <div
      onClick={() => router.push(`/market/${etf.symbol}`)}
      className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700
                 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600
                 transition-all duration-200 cursor-pointer"
    >
      {/* 헤더: 티커 + 미니차트 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          {/* 티커 심볼 + 카테고리 배지 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg">
              {etf.symbol}
            </span>
            {/* 카테고리 표시 (작은 배지) */}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {etfCategoryLabels[etf.category]}
            </span>
          </div>
          {/* ETF 이름 */}
          <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">{etf.name}</h3>
        </div>
        <MiniChart data={chartData} isPositive={isPositive} />
      </div>

      {/* 가격 정보 */}
      <div className="mb-3">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatPrice(etf.currentPrice, 'kr')}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-sm font-medium ${
            isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {formatChange(etf.change, 'kr')}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isPositive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {formatPercent(etf.changePercent)}
          </span>
        </div>
      </div>

      {/* 추가 정보: 거래량, 운용사 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">거래량</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatVolume(etf.volume)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">운용사</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{etf.issuer}</p>
        </div>
      </div>
    </div>
  );
}

// ==================== ETF 카드 컴포넌트 (미국 API 데이터용) ====================

/**
 * 미국 ETF 카드 컴포넌트 (API 데이터용)
 *
 * 미국 시장에서 사용
 * 한국투자증권 해외주식 API로 조회한 실시간 데이터를 표시
 */
function USETFCard({ etf }: { etf: USETFPriceData }) {
  const router = useRouter();
  const isPositive = etf.changePercent >= 0;

  // 차트 데이터 생성 (현재가 기반)
  const chartData = generateChartData(etf.currentPrice, etf.changePercent);

  return (
    <div
      onClick={() => router.push(`/market/${etf.symbol}`)}
      className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700
                 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600
                 transition-all duration-200 cursor-pointer"
    >
      {/* 헤더: 티커 + 미니차트 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          {/* 티커 심볼 + 카테고리 배지 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg">
              {etf.symbol}
            </span>
            {/* 카테고리 표시 (작은 배지) */}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {usETFCategoryLabels[etf.category]}
            </span>
          </div>
          {/* ETF 이름 */}
          <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">{etf.name}</h3>
        </div>
        <MiniChart data={chartData} isPositive={isPositive} />
      </div>

      {/* 가격 정보 */}
      <div className="mb-3">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatPrice(etf.currentPrice, 'us')}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-sm font-medium ${
            isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {formatChange(etf.change, 'us')}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isPositive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {formatPercent(etf.changePercent)}
          </span>
        </div>
      </div>

      {/* 추가 정보: 거래량, 운용사 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Volume</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatVolume(etf.volume)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">Issuer</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{etf.issuer}</p>
        </div>
      </div>
    </div>
  );
}

// ==================== 메인 컴포넌트 ====================

/**
 * ETFContent 메인 컴포넌트
 *
 * 시장에 따라 다른 데이터 소스 사용:
 * - 한국 (kr): 한국투자증권 API (실시간)
 * - 기타: 목업 데이터 (constants)
 */
export function ETFContent({ market }: ETFContentProps) {
  // ========== 한국 시장: 실시간 API 데이터 ==========
  const [activeCategory, setActiveCategory] = useState<ETFCategory>('all');

  // useKoreanETFs 훅 사용 (한국 시장일 때만 실제 호출)
  // 카테고리가 'all'이면 전체 조회, 그 외에는 해당 카테고리만 조회
  const apiCategory = activeCategory === 'all' ? 'all' : activeCategory;
  const {
    etfs: koreanETFs,
    isLoading: isKoreanLoading,
    error: koreanError,
    refetch: refetchKorean,
  } = useKoreanETFs(apiCategory);

  // ========== 미국 시장: 실시간 API 데이터 ==========
  const [usActiveCategory, setUSActiveCategory] = useState<USETFCategory>('all');

  // useUSETFs 훅 사용 (미국 시장일 때만 실제 호출)
  const usApiCategory = usActiveCategory === 'all' ? 'all' : usActiveCategory;
  const {
    etfs: usETFs,
    isLoading: isUSLoading,
    error: usError,
    refetch: refetchUS,
  } = useUSETFs(usApiCategory);

  // ========== 한국 시장 렌더링 ==========
  if (market === 'kr') {
    return (
      <section>
        {/* 섹션 헤더: 제목 + 실시간 배지 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          주요 ETF
          <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
            실시간
          </span>
        </h2>

        {/* 카테고리 필터 (한국 시장에서만 표시) */}
        <CategoryFilter
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* 로딩 중: 스켈레톤 표시 */}
        {isKoreanLoading && <ETFSkeletonGrid count={8} />}

        {/* 에러 발생: 에러 메시지 + 재시도 버튼 */}
        {koreanError && !isKoreanLoading && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{koreanError}</p>
            <button
              onClick={() => refetchKorean()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 데이터 로드 완료: ETF 카드 그리드 */}
        {!isKoreanLoading && !koreanError && koreanETFs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {koreanETFs.map((etf) => (
              <KoreanETFCard key={etf.symbol} etf={etf} />
            ))}
          </div>
        )}

        {/* 데이터 없음 */}
        {!isKoreanLoading && !koreanError && koreanETFs.length === 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              해당 카테고리의 ETF가 없습니다.
            </p>
          </div>
        )}
      </section>
    );
  }

  // ========== 미국 시장 렌더링 ==========
  if (market === 'us') {
    return (
      <section>
        {/* 섹션 헤더: 제목 + 실시간 배지 */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Popular ETFs
          <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
            Real-time
          </span>
        </h2>

        {/* 카테고리 필터 (미국 시장에서만 표시) */}
        <USCategoryFilter
          activeCategory={usActiveCategory}
          onCategoryChange={setUSActiveCategory}
        />

        {/* 로딩 중: 스켈레톤 표시 */}
        {isUSLoading && <ETFSkeletonGrid count={8} />}

        {/* 에러 발생: 에러 메시지 + 재시도 버튼 */}
        {usError && !isUSLoading && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{usError}</p>
            <button
              onClick={() => refetchUS()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* 데이터 로드 완료: ETF 카드 그리드 */}
        {!isUSLoading && !usError && usETFs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {usETFs.map((etf) => (
              <USETFCard key={etf.symbol} etf={etf} />
            ))}
          </div>
        )}

        {/* 데이터 없음 */}
        {!isUSLoading && !usError && usETFs.length === 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No ETFs found in this category.
            </p>
          </div>
        )}
      </section>
    );
  }

  // ========== 기타 시장: 목업 데이터 ==========
  const currentETFs = etfData[market];

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        주요 ETF
      </h2>
      {/* ETF 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {currentETFs.map((etf) => (
          <ETFCard key={etf.id} etf={etf} market={market} />
        ))}
      </div>
    </section>
  );
}
