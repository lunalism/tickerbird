'use client';

/**
 * GlobalETFContent 컴포넌트
 *
 * 글로벌 시장 > ETF 탭 선택 시 표시되는 콘텐츠
 *
 * ============================================================
 * 주요 기능:
 * ============================================================
 * 1. 카테고리별 필터: 전체/지수/섹터/테마/채권/원자재/레버리지/해외
 * 2. 미국 ETF + 국내 ETF 통합 표시
 * 3. ETF 선택 시 구성종목 표시
 * 4. 1분 자동 새로고침
 *
 * ============================================================
 * 표시 ETF:
 * ============================================================
 * - 미국 ETF: usETFList에서 카테고리별 필터링 (약 150개)
 * - 국내 ETF: KR_ETF_SYMBOLS (10개)
 */

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  useUSETFs,
  useKoreanETFs,
  useETFHoldings,
  ETFHolding,
} from '@/hooks';
import { USETFInfo } from '@/constants';

// ==================== 타입 정의 ====================

/** 카테고리 필터 타입 */
type CategoryFilter = 'all' | 'index' | 'sector' | 'leveraged' | 'bond' | 'commodity' | 'international' | 'kr';

/** 카테고리 필터 설정 */
const CATEGORY_FILTERS: { key: CategoryFilter; label: string; emoji: string }[] = [
  { key: 'all', label: '전체', emoji: '📊' },
  { key: 'index', label: '지수', emoji: '📈' },
  { key: 'sector', label: '섹터/테마', emoji: '🎯' },
  { key: 'leveraged', label: '레버리지', emoji: '⚡' },
  { key: 'bond', label: '채권', emoji: '📋' },
  { key: 'commodity', label: '원자재', emoji: '🛢️' },
  { key: 'international', label: '해외', emoji: '🌍' },
  { key: 'kr', label: '국내ETF', emoji: '🇰🇷' },
];

// 국내 상장 ETF 심볼 (10개)
const KR_ETF_SYMBOLS = [
  '360750', '069500', '133690', '091160', '464440',
  '472160', '305720', '480360', '466920', '489250',
];

// ETF 한글 설명 매핑
const ETF_DESCRIPTIONS: Record<string, string> = {
  // 미국 ETF - 지수
  SPY: 'S&P 500', QQQ: '나스닥 100', DIA: '다우존스 30', VOO: 'S&P 500 뱅가드',
  VTI: '전체 시장', IWM: '러셀 2000', IVV: 'S&P 500', ACWI: '전세계 지수',
  VIG: '배당성장', SCHD: '배당 ETF', VEA: '선진국', VWO: '신흥국',
  // 미국 ETF - 섹터
  XLK: '기술', XLF: '금융', XLE: '에너지', XLV: '헬스케어', XLI: '산업',
  XLP: '필수소비재', XLY: '임의소비재', XLU: '유틸리티', XLB: '소재',
  XLRE: '부동산', XLC: '통신', ARKK: '혁신기술', ARKG: '유전자혁명',
  SOXX: '반도체', BOTZ: '로봇/AI', TAN: '태양광', ICLN: '클린에너지',
  LIT: '리튬/배터리', BLOK: '블록체인', HACK: '사이버보안', AIQ: 'AI',
  // 미국 ETF - 레버리지
  TQQQ: '나스닥 3X', SQQQ: '나스닥 -3X', UPRO: 'S&P 3X', SPXS: 'S&P -3X',
  SOXL: '반도체 3X', SOXS: '반도체 -3X', TNA: '러셀 3X', TZA: '러셀 -3X',
  LABU: '바이오 3X', LABD: '바이오 -3X',
  // 미국 ETF - 채권
  BND: '미국채권', TLT: '장기국채', IEF: '중기국채', HYG: '하이일드',
  LQD: '회사채',
  // 미국 ETF - 원자재
  GLD: '금', SLV: '은', USO: '원유', UNG: '천연가스', DBA: '농산물',
  // 미국 ETF - 해외
  EWJ: '일본', FXI: '중국대형', EWY: '한국', EWZ: '브라질', EWT: '대만',
  EWG: '독일', EWU: '영국', EWA: '호주', EWC: '캐나다', INDA: '인도',
  // 국내 상장 ETF
  '360750': 'TIGER S&P500', '069500': 'KODEX 200', '133690': 'TIGER 나스닥',
  '091160': 'KODEX 반도체', '464440': 'PLUS K방산', '472160': 'HANARO 원자력',
  '305720': 'KODEX 2차전지', '480360': 'TIGER 로봇', '466920': 'SOL 조선',
  '489250': 'KODEX 배당',
};

// ==================== 통합 ETF 타입 ====================

interface UnifiedETFData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  isUS: boolean;
  category?: USETFInfo['category'];
}

// ==================== 포맷팅 함수 ====================

function formatPrice(price: number, isUS: boolean): string {
  if (isUS) {
    return '$' + price.toFixed(2);
  }
  return price.toLocaleString('ko-KR') + '원';
}

function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

function formatChange(change: number, isUS: boolean): string {
  const sign = change >= 0 ? '+' : '';
  if (isUS) {
    return `${sign}$${Math.abs(change).toFixed(2)}`;
  }
  return `${sign}${change.toLocaleString('ko-KR')}원`;
}

function generateChartData(currentPrice: number, changePercent: number): number[] {
  const points = 9;
  const data: number[] = [];
  const trend = changePercent / 100;
  const volatility = Math.abs(trend) * 0.5;

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const baseChange = trend * (1 - progress);
    const noise = (Math.random() - 0.5) * volatility * (1 - progress);
    const price = currentPrice * (1 - baseChange + noise);
    data.push(Math.round(price * 100) / 100);
  }
  return data;
}

// ==================== 컴포넌트 ====================

function MiniChart({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-20 h-10" preserveAspectRatio="none">
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

function ETFCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div>
            <div className="w-20 h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
        <div className="w-20 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="w-24 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <ETFCardSkeleton key={idx} />
      ))}
    </div>
  );
}

function HoldingsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="flex items-center justify-between p-2 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded-full" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded" />
          </div>
          <div className="h-4 w-10 bg-gray-200 dark:bg-gray-600 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * ETF 카드 컴포넌트 (환율 카드 스타일)
 */
function CompactETFCard({
  etf,
  isSelected,
  onClick,
}: {
  etf: UnifiedETFData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isPositive = etf.changePercent >= 0;
  const displayName = etf.isUS ? etf.symbol : (ETF_DESCRIPTIONS[etf.symbol] || etf.name);
  const subText = etf.isUS ? (ETF_DESCRIPTIONS[etf.symbol] || '') : etf.symbol;

  const chartData = useMemo(
    () => generateChartData(etf.currentPrice, etf.changePercent),
    [etf.currentPrice, etf.changePercent]
  );

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border cursor-pointer
        transition-all duration-200 hover:shadow-lg
        ${isSelected
          ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30 shadow-lg'
          : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
        }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{etf.isUS ? '🇺🇸' : '🇰🇷'}</div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{displayName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{subText}</p>
          </div>
        </div>
        <MiniChart data={chartData} isPositive={isPositive} />
      </div>

      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatPrice(etf.currentPrice, etf.isUS)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-sm font-medium ${
            isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {formatChange(etf.change, etf.isUS)}
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
    </div>
  );
}

function HoldingRow({
  holding,
  rank,
  onClick,
}: {
  holding: ETFHolding;
  rank: number;
  onClick: (symbol: string) => void;
}) {
  return (
    <div
      onClick={() => onClick(holding.symbol)}
      className="flex items-center justify-between p-2 rounded-lg
                 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
          {rank}
        </span>
        <div>
          <span className="font-medium text-gray-900 dark:text-white text-sm">{holding.symbol}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 hidden sm:inline">
            {holding.name}
          </span>
        </div>
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {holding.weight.toFixed(1)}%
      </span>
    </div>
  );
}

function SelectedETFPanel({
  etf,
  onClose,
  onDetailClick,
}: {
  etf: UnifiedETFData;
  onClose: () => void;
  onDetailClick: () => void;
}) {
  const router = useRouter();
  const isPositive = etf.changePercent >= 0;
  const description = ETF_DESCRIPTIONS[etf.symbol] || etf.name;
  const { holdings, isLoading } = useETFHoldings(etf.symbol);

  const handleHoldingClick = useCallback(
    (symbol: string) => {
      const cleanSymbol = symbol.replace('.', '-');
      router.push(`/market/${cleanSymbol}`);
    },
    [router]
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-200 dark:border-blue-700 shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{etf.isUS ? '🇺🇸' : '🇰🇷'}</span>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-bold rounded-lg">
              {etf.symbol}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{description}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatPrice(etf.currentPrice, etf.isUS)}
          </span>
          <span
            className={`text-sm font-medium px-2 py-1 rounded-lg ${
              isPositive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {formatPercent(etf.changePercent)}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">상위 구성종목</h4>
          <button
            onClick={onDetailClick}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400
                       hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            상세내용 확인
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {isLoading && <HoldingsSkeleton />}

        {!isLoading && holdings.length > 0 && (
          <div className="space-y-1">
            {holdings.slice(0, 5).map((holding, idx) => (
              <HoldingRow key={holding.symbol} holding={holding} rank={idx + 1} onClick={handleHoldingClick} />
            ))}
          </div>
        )}

        {!isLoading && holdings.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            구성종목 데이터가 없습니다.
          </p>
        )}

        {!isLoading && holdings.length > 5 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
            외 {holdings.length - 5}개 종목 • 상세내용에서 전체 확인
          </p>
        )}
      </div>
    </div>
  );
}

function MiniETFCard({
  etf,
  isSelected,
  onClick,
}: {
  etf: UnifiedETFData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isPositive = etf.changePercent >= 0;
  const displayName = etf.isUS ? etf.symbol : (ETF_DESCRIPTIONS[etf.symbol] || etf.name);
  const subText = etf.isUS ? (ETF_DESCRIPTIONS[etf.symbol] || '') : etf.symbol;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl cursor-pointer transition-all duration-150 border
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 shadow-sm'
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm'
        }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{etf.isUS ? '🇺🇸' : '🇰🇷'}</span>
        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{displayName}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{subText}</span>
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            isPositive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {formatPercent(etf.changePercent)}
        </span>
      </div>
    </div>
  );
}

function MobileAccordionCard({
  etf,
  isExpanded,
  onToggle,
}: {
  etf: UnifiedETFData;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const isPositive = etf.changePercent >= 0;
  const displayName = etf.isUS ? etf.symbol : (ETF_DESCRIPTIONS[etf.symbol] || etf.name);
  const subText = etf.isUS ? (ETF_DESCRIPTIONS[etf.symbol] || '') : etf.symbol;
  const { holdings, isLoading } = useETFHoldings(isExpanded ? etf.symbol : null);

  const handleHoldingClick = useCallback(
    (symbol: string) => {
      const cleanSymbol = symbol.replace('.', '-');
      router.push(`/market/${cleanSymbol}`);
    },
    [router]
  );

  const handleDetailClick = useCallback(() => {
    router.push(`/market/${etf.symbol}`);
  }, [router, etf.symbol]);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-all duration-200
        ${isExpanded
          ? 'border-blue-300 dark:border-blue-600 shadow-md'
          : 'border-gray-100 dark:border-gray-700'
        }`}
    >
      <div onClick={onToggle} className="p-3 cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{etf.isUS ? '🇺🇸' : '🇰🇷'}</span>
            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded">
              {displayName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{subText}</span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-sm text-gray-900 dark:text-white">
            {formatPrice(etf.currentPrice, etf.isUS)}
          </span>
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              isPositive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {formatPercent(etf.changePercent)}
          </span>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between py-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">상위 구성종목</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDetailClick();
              }}
              className="text-xs text-blue-600 dark:text-blue-400"
            >
              상세 →
            </button>
          </div>

          {isLoading && <HoldingsSkeleton />}

          {!isLoading && holdings.length > 0 && (
            <div className="space-y-1">
              {holdings.slice(0, 5).map((holding, idx) => (
                <HoldingRow key={holding.symbol} holding={holding} rank={idx + 1} onClick={handleHoldingClick} />
              ))}
            </div>
          )}

          {!isLoading && holdings.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-2">데이터 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 메인 컴포넌트 ====================

const AUTO_REFRESH_INTERVAL = 60000;

export function GlobalETFContent() {
  const router = useRouter();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // 미국 ETF 데이터 조회 (전체)
  const { etfs: allUSETFs, isLoading: isUSLoading, error: usError, refetch: refetchUS } = useUSETFs('all', {
    autoRefresh: true,
    refreshInterval: AUTO_REFRESH_INTERVAL,
  });

  // 국내 ETF 데이터 조회
  const { etfs: allKRETFs, isLoading: isKRLoading, error: krError, refetch: refetchKR } = useKoreanETFs('all', {
    autoRefresh: true,
    refreshInterval: AUTO_REFRESH_INTERVAL,
  });

  const isLoading = isUSLoading || isKRLoading;
  const error = usError || krError;

  // 미국 ETF 변환
  const usETFs: UnifiedETFData[] = useMemo(() => {
    if (!allUSETFs || allUSETFs.length === 0) return [];
    return allUSETFs.map((etf) => ({
      symbol: etf.symbol,
      name: etf.name,
      currentPrice: etf.currentPrice,
      change: etf.change,
      changePercent: etf.changePercent,
      isUS: true,
      category: etf.category,
    }));
  }, [allUSETFs]);

  // 국내 ETF 변환
  const krETFs: UnifiedETFData[] = useMemo(() => {
    if (!allKRETFs || allKRETFs.length === 0) return [];
    return KR_ETF_SYMBOLS
      .map((symbol) => {
        const etf = allKRETFs.find((e) => e.symbol === symbol);
        if (!etf) return null;
        return {
          symbol: etf.symbol,
          name: etf.name,
          currentPrice: etf.currentPrice,
          change: etf.change,
          changePercent: etf.changePercent,
          isUS: false,
        };
      })
      .filter((etf): etf is UnifiedETFData => etf !== null);
  }, [allKRETFs]);

  // 카테고리 필터링
  const filteredETFs = useMemo(() => {
    if (categoryFilter === 'all') {
      return [...usETFs, ...krETFs];
    }
    if (categoryFilter === 'kr') {
      return krETFs;
    }
    return usETFs.filter((etf) => etf.category === categoryFilter);
  }, [usETFs, krETFs, categoryFilter]);

  // 선택된 ETF
  const selectedETF = useMemo(
    () => filteredETFs.find((etf) => etf.symbol === selectedSymbol) || null,
    [filteredETFs, selectedSymbol]
  );

  const handleSelect = useCallback((symbol: string) => {
    setSelectedSymbol((prev) => (prev === symbol ? null : symbol));
  }, []);

  const handleDetailClick = useCallback(() => {
    if (selectedSymbol) {
      router.push(`/market/${selectedSymbol}`);
    }
  }, [router, selectedSymbol]);

  const handleRefetch = useCallback(() => {
    refetchUS();
    refetchKR();
  }, [refetchUS, refetchKR]);

  // 카테고리별 카운트
  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: usETFs.length + krETFs.length,
      index: usETFs.filter(e => e.category === 'index').length,
      sector: usETFs.filter(e => e.category === 'sector').length,
      leveraged: usETFs.filter(e => e.category === 'leveraged').length,
      bond: usETFs.filter(e => e.category === 'bond').length,
      commodity: usETFs.filter(e => e.category === 'commodity').length,
      international: usETFs.filter(e => e.category === 'international').length,
      kr: krETFs.length,
    };
    return counts;
  }, [usETFs, krETFs]);

  return (
    <section>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          글로벌 ETF
          <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">실시간</span>
        </h2>
        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
          {filteredETFs.length}개
        </span>
      </div>

      {/* 카테고리 필터 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.key}
            onClick={() => {
              setCategoryFilter(cat.key);
              setSelectedSymbol(null);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
              ${categoryFilter === cat.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
            <span className="text-xs opacity-70">({categoryCounts[cat.key]})</span>
          </button>
        ))}
      </div>

      {/* 로딩 */}
      {isLoading && <SkeletonGrid count={12} />}

      {/* 에러 */}
      {error && !isLoading && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={handleRefetch}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 데스크톱 레이아웃 */}
      {!isLoading && !error && filteredETFs.length > 0 && (
        <div className="hidden md:block">
          {selectedETF ? (
            <div className="flex gap-4">
              <div className="flex-[11]">
                <SelectedETFPanel etf={selectedETF} onClose={() => setSelectedSymbol(null)} onDetailClick={handleDetailClick} />
              </div>
              <div className="flex-[9] bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 max-h-[520px] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">다른 ETF</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {filteredETFs.length - 1}개
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {filteredETFs
                    .filter((etf) => etf.symbol !== selectedSymbol)
                    .map((etf) => (
                      <MiniETFCard key={etf.symbol} etf={etf} isSelected={false} onClick={() => handleSelect(etf.symbol)} />
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredETFs.map((etf) => (
                <CompactETFCard
                  key={etf.symbol}
                  etf={etf}
                  isSelected={selectedSymbol === etf.symbol}
                  onClick={() => handleSelect(etf.symbol)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 모바일 레이아웃 */}
      {!isLoading && !error && filteredETFs.length > 0 && (
        <div className="md:hidden space-y-2">
          {filteredETFs.map((etf) => (
            <MobileAccordionCard
              key={etf.symbol}
              etf={etf}
              isExpanded={selectedSymbol === etf.symbol}
              onToggle={() => handleSelect(etf.symbol)}
            />
          ))}
        </div>
      )}

      {/* 데이터 없음 */}
      {!isLoading && !error && filteredETFs.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">해당 카테고리에 ETF가 없습니다.</p>
        </div>
      )}
    </section>
  );
}
