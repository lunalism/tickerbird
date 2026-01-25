'use client';

/**
 * GlobalETFContent 컴포넌트
 *
 * 글로벌 시장 > ETF 탭 선택 시 표시되는 콘텐츠
 *
 * ============================================================
 * 기능:
 * ============================================================
 * - ETF 카드 클릭 시 아코디언으로 구성종목 펼침/접힘
 * - 펼쳐진 상태에서 "상세내용 확인" 버튼 → ETF 상세 페이지 이동
 * - 각 구성종목 클릭 시 해당 종목 상세 페이지로 이동
 *
 * ============================================================
 * 표시 ETF 목록 (20개):
 * ============================================================
 * 미국 ETF (10개):
 * - QQQ, SPY, VOO, ARKK, DIA
 * - SOXX, SOXL, TQQQ, SCHD, VTI
 *
 * 국내 상장 ETF (10개):
 * - TIGER 미국S&P500 (360750)
 * - KODEX 200 (069500)
 * - TIGER 미국나스닥100 (133690)
 * - KODEX 반도체 (091160)
 * - PLUS K방산 (464440)
 * - HANARO 원자력iSelect (472160)
 * - KODEX 2차전지산업 (305720)
 * - TIGER 차이나휴머노이드로봇 (480360)
 * - SOL 조선TOP3플러스 (466920)
 * - KODEX 미국배당다우존스 (489250)
 *
 * ============================================================
 * 데이터 소스:
 * ============================================================
 * - 실시간 시세: 한국투자증권 API (국내/해외)
 * - 구성종목: Firestore etf_holdings 컬렉션
 */

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  useUSETFs,
  useKoreanETFs,
  USETFPriceData,
  ETFPriceData,
  useETFHoldings,
  ETFHolding,
} from '@/hooks';

// ==================== ETF 목록 정의 ====================

// 미국 ETF 심볼 (10개)
const US_ETF_SYMBOLS = [
  'QQQ',   // 나스닥 100
  'SPY',   // S&P 500
  'VOO',   // Vanguard S&P 500
  'ARKK',  // 혁신 기술
  'DIA',   // 다우존스 30
  'SOXX',  // 반도체 섹터
  'SOXL',  // 반도체 3배 레버리지
  'TQQQ',  // 나스닥 3배 레버리지
  'SCHD',  // 미국 배당주
  'VTI',   // 미국 전체 시장
];

// 국내 상장 ETF 심볼 (10개)
const KR_ETF_SYMBOLS = [
  '360750', // TIGER 미국S&P500
  '069500', // KODEX 200
  '133690', // TIGER 미국나스닥100
  '091160', // KODEX 반도체
  '464440', // PLUS K방산
  '472160', // HANARO 원자력iSelect
  '305720', // KODEX 2차전지산업
  '480360', // TIGER 차이나휴머노이드로봇
  '466920', // SOL 조선TOP3플러스
  '489250', // KODEX 미국배당다우존스
];

// ETF 한글 설명 매핑
const ETF_DESCRIPTIONS: Record<string, string> = {
  // 미국 ETF
  QQQ: '나스닥 100 추종 ETF',
  SPY: 'S&P 500 추종 ETF',
  VOO: 'Vanguard S&P 500 ETF',
  ARKK: '혁신 기술 테마 ETF',
  DIA: '다우존스 30 추종 ETF',
  SOXX: 'iShares 반도체 ETF',
  SOXL: '반도체 3배 레버리지 ETF',
  TQQQ: '나스닥 3배 레버리지 ETF',
  SCHD: 'Schwab 미국 배당 ETF',
  VTI: 'Vanguard 전체 시장 ETF',
  // 국내 상장 ETF
  '360750': 'TIGER 미국S&P500',
  '069500': 'KODEX 200',
  '133690': 'TIGER 미국나스닥100',
  '091160': 'KODEX 반도체',
  '464440': 'PLUS K방산',
  '472160': 'HANARO 원자력iSelect',
  '305720': 'KODEX 2차전지산업',
  '480360': 'TIGER 차이나휴머노이드로봇',
  '466920': 'SOL 조선TOP3플러스',
  '489250': 'KODEX 미국배당다우존스',
};

// ==================== 통합 ETF 타입 ====================

// 미국/국내 ETF를 통합하여 표시하기 위한 공통 타입
interface UnifiedETFData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  isUS: boolean;  // 미국 ETF 여부 (국기 표시용)
}

// ==================== 스켈레톤 컴포넌트 ====================

/**
 * ETF 카드 스켈레톤 (로딩 중 표시)
 */
function ETFCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="mb-3">
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

/**
 * ETF 카드 스켈레톤 그리드
 */
function ETFSkeletonGrid({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <ETFCardSkeleton key={idx} />
      ))}
    </div>
  );
}

/**
 * 구성종목 스켈레톤 (아코디언 펼침 시 로딩)
 */
function HoldingsSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg animate-pulse"
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded-full" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded" />
          </div>
          <div className="h-4 w-10 bg-gray-200 dark:bg-gray-600 rounded" />
        </div>
      ))}
    </div>
  );
}

// ==================== 미니 차트 컴포넌트 ====================

/**
 * 미니 차트 컴포넌트
 *
 * ETF의 최근 가격 추이를 SVG 라인으로 시각화
 */
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
    <svg viewBox="0 0 100 100" className="w-14 h-7" preserveAspectRatio="none">
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

// ==================== 포맷팅 함수 ====================

function formatPrice(price: number, isUS: boolean): string {
  if (isUS) {
    return '$' + price.toFixed(2);
  }
  return price.toLocaleString('ko-KR') + '원';
}

function formatChange(change: number, isUS: boolean): string {
  const sign = change >= 0 ? '+' : '';
  if (isUS) {
    return sign + '$' + Math.abs(change).toFixed(2);
  }
  return sign + Math.abs(change).toLocaleString('ko-KR') + '원';
}

function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

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

// ==================== 구성종목 행 컴포넌트 ====================

/**
 * 구성종목 개별 행 컴포넌트
 *
 * 클릭 시 해당 종목 상세 페이지로 이동
 */
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
      onClick={(e) => {
        e.stopPropagation(); // 부모 카드 클릭 이벤트 방지
        onClick(holding.symbol);
      }}
      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg
                 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2">
        {/* 순위 */}
        <span className="w-5 h-5 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
          {rank}
        </span>
        {/* 종목 정보 */}
        <div>
          <span className="font-medium text-gray-900 dark:text-white text-sm">{holding.symbol}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 hidden sm:inline">
            {holding.name}
          </span>
        </div>
      </div>
      {/* 비중 */}
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {holding.weight.toFixed(1)}%
      </span>
    </div>
  );
}

// ==================== ETF 아코디언 카드 컴포넌트 ====================

/**
 * ETF 아코디언 카드 컴포넌트
 *
 * 기능:
 * - 카드 클릭 시 아코디언 펼침/접힘
 * - 펼쳐진 상태에서 상위 5개 구성종목 표시
 * - "상세내용 확인" 버튼으로 ETF 상세 페이지 이동
 * - 구성종목 클릭 시 해당 종목 페이지로 이동
 */
function ETFAccordionCard({
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

  // 차트 데이터 생성
  const chartData = useMemo(
    () => generateChartData(etf.currentPrice, etf.changePercent),
    [etf.currentPrice, etf.changePercent]
  );

  // 한글 설명
  const description = ETF_DESCRIPTIONS[etf.symbol] || etf.name;

  // ETF 구성종목 조회 (펼쳐진 상태일 때만 로드)
  const { holdings, isLoading: isHoldingsLoading } = useETFHoldings(isExpanded ? etf.symbol : null);

  // 구성종목 클릭 핸들러 - 해당 종목 페이지로 이동
  const handleHoldingClick = useCallback(
    (symbol: string) => {
      // BRK.B 같은 특수 심볼 처리
      const cleanSymbol = symbol.replace('.', '-');
      router.push(`/market/${cleanSymbol}`);
    },
    [router]
  );

  // 상세내용 확인 버튼 클릭 핸들러
  const handleDetailClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // 아코디언 토글 방지
      router.push(`/market/${etf.symbol}`);
    },
    [router, etf.symbol]
  );

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-300 overflow-hidden
        ${isExpanded
          ? 'border-blue-300 dark:border-blue-600 shadow-lg ring-2 ring-blue-100 dark:ring-blue-900/30'
          : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
        }`}
    >
      {/* ========== 카드 헤더 (클릭 영역) ========== */}
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer"
      >
        <div className="flex items-center justify-between">
          {/* 왼쪽: ETF 정보 */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* 국기 + 티커 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-lg">{etf.isUS ? '🇺🇸' : '🇰🇷'}</span>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg">
                {etf.symbol}
              </span>
            </div>
            {/* 이름 + 설명 */}
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                {description}
              </p>
            </div>
          </div>

          {/* 오른쪽: 가격 + 차트 + 펼침 아이콘 */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* 가격 정보 */}
            <div className="text-right hidden sm:block">
              <p className="font-bold text-gray-900 dark:text-white">
                {formatPrice(etf.currentPrice, etf.isUS)}
              </p>
              <span
                className={`text-xs font-medium ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatPercent(etf.changePercent)}
              </span>
            </div>
            {/* 미니 차트 */}
            <MiniChart data={chartData} isPositive={isPositive} />
            {/* 펼침/접힘 아이콘 */}
            <svg
              className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* 모바일에서만 표시: 가격 정보 */}
        <div className="flex items-center justify-between mt-2 sm:hidden">
          <p className="font-bold text-gray-900 dark:text-white">
            {formatPrice(etf.currentPrice, etf.isUS)}
          </p>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isPositive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {formatPercent(etf.changePercent)}
          </span>
        </div>
      </div>

      {/* ========== 아코디언 펼침 영역 (구성종목) ========== */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
          {/* 구성종목 헤더 */}
          <div className="flex items-center justify-between py-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              상위 구성종목
            </h4>
            {/* 상세내용 확인 버튼 */}
            <button
              onClick={handleDetailClick}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400
                         hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              상세내용 확인
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 구성종목 로딩 */}
          {isHoldingsLoading && <HoldingsSkeleton />}

          {/* 구성종목 목록 (상위 5개) */}
          {!isHoldingsLoading && holdings.length > 0 && (
            <div className="space-y-1.5">
              {holdings.slice(0, 5).map((holding, idx) => (
                <HoldingRow
                  key={holding.symbol}
                  holding={holding}
                  rank={idx + 1}
                  onClick={handleHoldingClick}
                />
              ))}
            </div>
          )}

          {/* 구성종목 없음 */}
          {!isHoldingsLoading && holdings.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              구성종목 데이터가 없습니다.
            </p>
          )}

          {/* 더 많은 구성종목 보기 안내 */}
          {!isHoldingsLoading && holdings.length > 5 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
              외 {holdings.length - 5}개 종목 • 상세내용에서 전체 확인
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 메인 컴포넌트 ====================

/**
 * GlobalETFContent 메인 컴포넌트
 *
 * 글로벌 시장 > ETF 탭에서 주요 20개 ETF를 아코디언 형태로 표시
 * (미국 ETF 10개 + 국내 상장 ETF 10개)
 */
export function GlobalETFContent() {
  // 펼쳐진 ETF 심볼 상태 (한 번에 하나만 펼침)
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  // 미국 ETF 데이터 조회
  const { etfs: allUSETFs, isLoading: isUSLoading, error: usError, refetch: refetchUS } = useUSETFs('all');

  // 국내 ETF 데이터 조회
  const { etfs: allKRETFs, isLoading: isKRLoading, error: krError, refetch: refetchKR } = useKoreanETFs('all');

  // 통합 로딩 상태
  const isLoading = isUSLoading || isKRLoading;
  const error = usError || krError;

  // 미국 ETF 필터링 및 통합 형식으로 변환
  const usETFs: UnifiedETFData[] = useMemo(() => {
    if (!allUSETFs || allUSETFs.length === 0) return [];

    return US_ETF_SYMBOLS
      .map((symbol) => {
        const etf = allUSETFs.find((e) => e.symbol === symbol);
        if (!etf) return null;
        return {
          symbol: etf.symbol,
          name: etf.name,
          currentPrice: etf.currentPrice,
          change: etf.change,
          changePercent: etf.changePercent,
          isUS: true,
        };
      })
      .filter((etf): etf is UnifiedETFData => etf !== null);
  }, [allUSETFs]);

  // 국내 ETF 필터링 및 통합 형식으로 변환
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

  // 전체 ETF 목록 (미국 + 국내)
  const allETFs = useMemo(() => [...usETFs, ...krETFs], [usETFs, krETFs]);

  // 아코디언 토글 핸들러
  const handleToggle = useCallback((symbol: string) => {
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol));
  }, []);

  // 새로고침 핸들러
  const handleRefetch = useCallback(() => {
    refetchUS();
    refetchKR();
  }, [refetchUS, refetchKR]);

  return (
    <section>
      {/* 섹션 헤더 */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        글로벌 ETF
        <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">실시간</span>
      </h2>

      {/* 설명 */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        카드를 클릭하면 구성종목을 확인할 수 있습니다. (총 {allETFs.length}개)
      </p>

      {/* 로딩 중 */}
      {isLoading && <ETFSkeletonGrid count={10} />}

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

      {/* 미국 ETF 섹션 */}
      {!isLoading && !error && usETFs.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
            <span>🇺🇸</span>
            미국 ETF ({usETFs.length}개)
          </h3>
          <div className="space-y-3">
            {usETFs.map((etf) => (
              <ETFAccordionCard
                key={etf.symbol}
                etf={etf}
                isExpanded={expandedSymbol === etf.symbol}
                onToggle={() => handleToggle(etf.symbol)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 국내 ETF 섹션 */}
      {!isLoading && !error && krETFs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
            <span>🇰🇷</span>
            국내 상장 ETF ({krETFs.length}개)
          </h3>
          <div className="space-y-3">
            {krETFs.map((etf) => (
              <ETFAccordionCard
                key={etf.symbol}
                etf={etf}
                isExpanded={expandedSymbol === etf.symbol}
                onToggle={() => handleToggle(etf.symbol)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 데이터 없음 */}
      {!isLoading && !error && allETFs.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">ETF 데이터를 불러올 수 없습니다.</p>
        </div>
      )}
    </section>
  );
}
