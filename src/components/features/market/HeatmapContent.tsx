'use client';

/**
 * HeatmapContent 컴포넌트
 *
 * Finviz 스타일의 전체 통합 Treemap 히트맵을 표시합니다.
 * 실시간 API 데이터를 연동하여 현재가, 등락률, 시가총액을 표시합니다.
 *
 * ============================================================
 * 핵심 기능:
 * ============================================================
 * 1. 하나의 큰 Treemap으로 모든 섹터/종목 표시 (Finviz 스타일)
 * 2. 종목명 표시 (종목 코드가 아닌 이름)
 * 3. 시가총액 기준 박스 크기 (Treemap 알고리즘)
 * 4. 등락률 기준 색상 (한국/미국 동일: 초록=상승, 빨강=하락)
 * 5. 실시간 API 데이터 연동 (KIS API)
 * 6. 호버 시 상세 툴팁 표시
 * 7. 종목 클릭 시 상세 페이지 이동
 *
 * ============================================================
 * 데이터 소스:
 * ============================================================
 * - 한국 시장: /api/kis/ranking/market-cap (시가총액 순위 API)
 * - 미국 시장: /api/kis/overseas/ranking/market-cap (해외 시가총액 순위 API)
 *
 * ============================================================
 * Finviz 색상 규칙 (한국/미국 동일):
 * ============================================================
 * 상승 (초록 계열):
 *   +5% 이상: #003D00 (가장 진한 초록)
 *   +3~5%:   #006400
 *   +2~3%:   #228B22
 *   +1~2%:   #32CD32
 *   +0.5~1%: #5DBB5D
 *   +0.1~0.5%: #4DAD4D
 *
 * 하락 (빨강 계열):
 *   -5% 이상: #8B0000 (가장 진한 빨강)
 *   -3~5%:   #B22222
 *   -2~3%:   #DC143C
 *   -1~2%:   #F08080
 *   -0.5~1%: #E05555
 *   -0.1~0.5%: #D04545
 *
 * 보합 (±0.1% 미만): #374151 (어두운 회색)
 */

import { useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveTreeMap, ComputedNode } from '@nivo/treemap';
import type { MarketRegion } from '@/types';
import { useMarketCapRanking, useUSMarketCapRanking } from '@/hooks/useKISData';
import type { MarketCapRankingData, OverseasMarketCapRankingData } from '@/types/kis';

// ==================== 타입 정의 ====================

/** 개별 종목 데이터 (API 데이터에서 변환) */
interface StockData {
  symbol: string;        // 티커 심볼 (예: '005930', 'AAPL')
  name: string;          // 종목명 (예: '삼성전자', 'Apple')
  marketCap: number;     // 시가총액 (억원 또는 백만달러)
  changePercent: number; // 등락률 (예: 1.2, -0.5)
  price: number;         // 현재가 (원 또는 달러)
}

/** 섹터 데이터 */
interface SectorData {
  name: string;          // 섹터명 (예: '시가총액 TOP', 'MARKET CAP')
  stocks: StockData[];   // 섹터 내 종목들
}

/** Nivo Treemap용 노드 데이터 */
interface TreemapNode {
  id: string;           // 고유 ID
  name: string;         // 표시 이름
  value?: number;       // 시가총액 (크기 결정)
  change?: number;      // 등락률 (색상 결정)
  symbol?: string;      // 티커 심볼
  price?: number;       // 현재가
  children?: TreemapNode[]; // 하위 노드 (섹터의 경우)
}

/** 툴팁 상태 */
interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  data: {
    name: string;
    symbol: string;
    price: number;
    change: number;
    marketCap: number;
    sector: string;
  } | null;
}

// ==================== 한국 종목명 축약 규칙 ====================
/**
 * 한국 종목명 축약 맵
 *
 * 긴 종목명을 짧게 축약하여 히트맵 박스에 표시합니다.
 */
const KOREAN_NAME_ABBREVIATIONS: Record<string, string> = {
  'LG에너지솔루션': 'LG에너지',
  '에코프로비엠': '에코프로BM',
  '한화에어로스페이스': '한화에어로',
  '포스코퓨처엠': '포스코퓨처',
  '삼성바이오로직스': '삼성바이오',
  '셀트리온헬스케어': '셀트리온HC',
  'SK바이오사이언스': 'SK바이오',
  'HD한국조선해양': 'HD조선해양',
  'HD현대중공업': 'HD현대중공업',
  'SK이노베이션': 'SK이노베이션',
  '카카오엔터테인먼트': '카카오엔터',
  'YG엔터테인먼트': 'YG엔터',
  '현대오토에버': '현대오토에버',
  '삼성에스디에스': '삼성SDS',
  '에스케이하이닉스': 'SK하이닉스',
};

/**
 * 한국 종목명 축약 함수
 */
function abbreviateKoreanName(name: string, maxLength: number): string {
  if (KOREAN_NAME_ABBREVIATIONS[name]) {
    const abbreviated = KOREAN_NAME_ABBREVIATIONS[name];
    if (abbreviated.length <= maxLength) {
      return abbreviated;
    }
    return abbreviated.slice(0, maxLength);
  }
  return name.length > maxLength ? name.slice(0, maxLength) : name;
}

// ==================== 색상 함수 ====================

/**
 * Finviz 정확한 색상 반환
 *
 * @param changePercent - 등락률 (예: 1.5, -2.3)
 * @returns CSS 색상 문자열
 */
function getHeatmapColor(changePercent: number): string {
  const absChange = Math.abs(changePercent);

  // 보합 (±0.1% 미만)
  if (absChange < 0.1) {
    return '#374151';
  }

  if (changePercent > 0) {
    // 상승 (초록 계열)
    if (absChange >= 5) return '#003D00';
    if (absChange >= 3) return '#006400';
    if (absChange >= 2) return '#228B22';
    if (absChange >= 1) return '#32CD32';
    if (absChange >= 0.5) return '#5DBB5D';
    return '#4DAD4D';
  } else {
    // 하락 (빨강 계열)
    if (absChange >= 5) return '#8B0000';
    if (absChange >= 3) return '#B22222';
    if (absChange >= 2) return '#DC143C';
    if (absChange >= 1) return '#F08080';
    if (absChange >= 0.5) return '#E05555';
    return '#D04545';
  }
}

// ==================== 포맷팅 함수 ====================

/** 등락률 포맷팅 (+1.2%, -0.5% 형식) */
function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/** 가격 포맷팅 (한국: ₩58,000, 미국: $195.50) */
function formatPrice(value: number, isKorean: boolean): string {
  if (isKorean) {
    return `₩${value.toLocaleString()}`;
  }
  return `$${value.toFixed(2)}`;
}

/** 시가총액 포맷팅 (한국: 350조, 미국: $3T) */
function formatMarketCap(value: number, isKorean: boolean): string {
  if (isKorean) {
    // 억원 단위 → 조 단위 변환
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}조`;
    }
    return `${value.toLocaleString()}억`;
  } else {
    // 백만달러 → T/B 변환
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}T`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}B`;
    }
    return `$${value}M`;
  }
}

// ==================== 데이터 변환 함수 ====================

/**
 * 한국 시가총액 순위 데이터를 섹터 데이터로 변환
 *
 * API에서 받은 시가총액 순위 데이터를 히트맵용 섹터 구조로 변환합니다.
 * 상위 30개 종목을 하나의 '시가총액 TOP' 섹터로 표시합니다.
 */
function convertKoreanDataToSectors(data: MarketCapRankingData[]): SectorData[] {
  if (!data || data.length === 0) return [];

  // 시가총액 순으로 정렬 (이미 정렬되어 있지만 확인)
  const sortedData = [...data].sort((a, b) => b.marketCap - a.marketCap);

  // 상위 30개 종목을 하나의 섹터로 표시
  const topStocks: StockData[] = sortedData.slice(0, 30).map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    marketCap: stock.marketCap,
    changePercent: stock.changePercent,
    price: stock.currentPrice,
  }));

  return [
    {
      name: '시가총액 TOP 30',
      stocks: topStocks,
    },
  ];
}

/**
 * 미국 시가총액 순위 데이터를 섹터 데이터로 변환
 *
 * NASDAQ + NYSE 데이터를 합쳐서 시가총액 순으로 정렬합니다.
 */
function convertUSDataToSectors(
  nasData: OverseasMarketCapRankingData[],
  nysData: OverseasMarketCapRankingData[]
): SectorData[] {
  // 두 거래소 데이터 합치기
  const allData = [...nasData, ...nysData];

  if (allData.length === 0) return [];

  // 시가총액 순으로 정렬
  const sortedData = allData.sort((a, b) => b.marketCap - a.marketCap);

  // 상위 30개 종목
  const topStocks: StockData[] = sortedData.slice(0, 30).map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    marketCap: stock.marketCap,
    changePercent: stock.changePercent,
    price: stock.currentPrice,
  }));

  return [
    {
      name: 'MARKET CAP TOP 30',
      stocks: topStocks,
    },
  ];
}

/**
 * 섹터 데이터를 Nivo Treemap 형식으로 변환
 */
function convertToTreemapData(
  sectors: SectorData[],
  isKorean: boolean
): TreemapNode {
  return {
    id: 'root',
    name: isKorean ? '한국시장' : '미국시장',
    children: sectors.map((sector) => ({
      id: sector.name,
      name: sector.name,
      children: sector.stocks.map((stock) => ({
        id: stock.symbol,
        name: stock.name,
        value: stock.marketCap,
        change: stock.changePercent,
        symbol: stock.symbol,
        price: stock.price,
      })),
    })),
  };
}

// ==================== 커스텀 라벨 레이어 ====================

/**
 * TreeMap 커스텀 라벨 레이어
 *
 * 2줄 레이아웃으로 종목명과 등락률을 표시합니다.
 */
function CustomLabelsLayer({
  nodes,
}: {
  nodes: ComputedNode<TreemapNode>[];
}) {
  return (
    <g>
      {nodes.map((node) => {
        // ==================== 섹터 라벨 (강화) ====================
        if (node.pathComponents.length === 2) {
          if (node.width < 60 || node.height < 30) {
            return null;
          }

          const sectorName = String(node.id);

          return (
            <g key={`sector-${node.id}`}>
              {/* 반투명 어두운 배경 (가독성 향상) */}
              <rect
                x={node.x + 3}
                y={node.y + 3}
                width={Math.min(sectorName.length * 8 + 12, node.width - 6)}
                height={18}
                rx={3}
                fill="rgba(0, 0, 0, 0.6)"
              />
              {/* 섹터명 텍스트 */}
              <text
                x={node.x + 9}
                y={node.y + 15}
                style={{
                  fill: '#e5e7eb',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                  textTransform: 'uppercase',
                  pointerEvents: 'none',
                }}
              >
                {sectorName.toUpperCase()}
              </text>
            </g>
          );
        }

        // ==================== 종목 라벨 ====================
        if (node.pathComponents.length !== 3) {
          return null;
        }

        const width = node.width;
        const height = node.height;
        const minDimension = Math.min(width, height);

        if (minDimension < 50) {
          return null;
        }

        const fullName = node.data.name || String(node.id);
        const symbol = node.data.symbol || String(node.id);
        const change = node.data.change ?? 0;

        // 한국 종목인지 미국 종목인지 판단
        const isKoreanStock = /^\d+$/.test(symbol);

        let displayName: string;
        let nameFontSize: number;
        let changeFontSize: number;

        if (minDimension >= 150) {
          nameFontSize = 14;
          changeFontSize = 12;
          if (isKoreanStock) {
            displayName = abbreviateKoreanName(fullName, 8);
          } else {
            displayName = fullName.length > 10 ? fullName.slice(0, 10) : fullName;
          }
        } else if (minDimension >= 80) {
          nameFontSize = 11;
          changeFontSize = 10;
          if (isKoreanStock) {
            displayName = abbreviateKoreanName(fullName, 5);
          } else {
            displayName = fullName.length <= 6 ? fullName : symbol;
          }
        } else {
          nameFontSize = 10;
          changeFontSize = 9;
          if (isKoreanStock) {
            displayName = abbreviateKoreanName(fullName, 3);
          } else {
            displayName = symbol;
          }
        }

        const changeText = formatPercent(change);
        const centerX = node.x + width / 2;
        const centerY = node.y + height / 2;

        return (
          <g key={node.id} transform={`translate(${centerX}, ${centerY})`}>
            <text
              textAnchor="middle"
              dominantBaseline="auto"
              dy={-changeFontSize / 2 - 1}
              style={{
                fill: '#ffffff',
                fontSize: `${nameFontSize}px`,
                fontWeight: 700,
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                pointerEvents: 'none',
              }}
            >
              {displayName}
            </text>
            <text
              textAnchor="middle"
              dominantBaseline="hanging"
              dy={nameFontSize / 2}
              style={{
                fill: 'rgba(255, 255, 255, 0.9)',
                fontSize: `${changeFontSize}px`,
                fontWeight: 500,
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                pointerEvents: 'none',
              }}
            >
              {changeText}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ==================== 로딩 스켈레톤 ====================

/**
 * 히트맵 로딩 스켈레톤
 */
function HeatmapSkeleton() {
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 animate-pulse" style={{ height: '700px' }}>
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>실시간 데이터 로딩 중...</span>
          </div>
          <p className="text-xs text-gray-500">시가총액 순위 데이터를 가져오고 있습니다</p>
        </div>
      </div>
    </div>
  );
}

// ==================== 에러 표시 ====================

/**
 * 에러 표시 컴포넌트
 */
function HeatmapError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700" style={{ height: '700px' }}>
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            데이터를 불러올 수 없습니다
          </h3>
          <p className="text-sm text-gray-400 mb-4">{message}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 모바일 리스트 뷰 ====================

/**
 * 모바일 환경용 리스트 뷰
 */
function MobileListView({
  sectors,
  isKorean,
  onStockClick,
  isLoading,
}: {
  sectors: SectorData[];
  isKorean: boolean;
  onStockClick: (symbol: string) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32" />
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-1" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16" />
                  </div>
                  <div className="text-right ml-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20 mb-1" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-12 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sectors.map((sector) => (
        <div
          key={sector.name}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-600">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
              {sector.name}
              <span className="ml-2 text-xs text-gray-500 font-normal">
                ({sector.stocks.length}개 종목)
              </span>
            </h4>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {sector.stocks.map((stock) => {
              const isPositive = stock.changePercent >= 0;
              return (
                <div
                  key={stock.symbol}
                  onClick={() => onStockClick(stock.symbol)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {stock.name}
                    </div>
                    <div className="text-xs text-gray-500">{stock.symbol}</div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                      {formatPrice(stock.price, isKorean)}
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        isPositive ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {formatPercent(stock.changePercent)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== 메인 컴포넌트 ====================

interface HeatmapContentProps {
  /** 선택된 국가 (kr: 한국, us: 미국) */
  country: MarketRegion;
}

/**
 * Finviz 스타일 통합 Treemap 히트맵 컴포넌트
 *
 * 실시간 API 데이터를 연동하여 시가총액, 현재가, 등락률을 표시합니다.
 */
export function HeatmapContent({ country }: HeatmapContentProps) {
  const router = useRouter();
  const isKorean = country === 'kr';

  // ========================================
  // 실시간 데이터 페칭 (API 연동)
  // ========================================

  // 한국 시장: 시가총액 순위 API
  const {
    data: krData,
    isLoading: krLoading,
    error: krError,
    refetch: krRefetch,
  } = useMarketCapRanking('all', { autoRefresh: true, refreshInterval: 60000 });

  // 미국 시장: NASDAQ + NYSE 시가총액 순위 API
  const {
    data: nasData,
    isLoading: nasLoading,
    error: nasError,
    refetch: nasRefetch,
  } = useUSMarketCapRanking('NAS', { autoRefresh: true, refreshInterval: 60000 });

  const {
    data: nysData,
    isLoading: nysLoading,
    error: nysError,
    refetch: nysRefetch,
  } = useUSMarketCapRanking('NYS', { autoRefresh: true, refreshInterval: 60000 });

  // ========================================
  // 로딩 및 에러 상태
  // ========================================
  const isLoading = isKorean ? krLoading : (nasLoading || nysLoading);
  const error = isKorean ? krError : (nasError || nysError);
  const refetch = isKorean ? krRefetch : () => { nasRefetch(); nysRefetch(); };

  // ========================================
  // 섹터 데이터 변환
  // ========================================
  const sectors = useMemo(() => {
    if (isKorean) {
      return convertKoreanDataToSectors(krData);
    } else {
      return convertUSDataToSectors(nasData, nysData);
    }
  }, [isKorean, krData, nasData, nysData]);

  // Treemap용 데이터 변환
  const treemapData = useMemo(
    () => convertToTreemapData(sectors, isKorean),
    [sectors, isKorean]
  );

  // 툴팁 상태
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    data: null,
  });

  // 종목 클릭 핸들러
  const handleStockClick = useCallback(
    (symbol: string) => {
      router.push(`/market/${symbol}`);
    },
    [router]
  );

  // 총 종목 수 계산
  const totalStocks = useMemo(
    () => sectors.reduce((sum, sector) => sum + sector.stocks.length, 0),
    [sectors]
  );

  // 일본/홍콩 미지원 메시지
  if (country === 'jp' || country === 'hk') {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">🚧</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          준비 중입니다
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {country === 'jp' ? '일본' : '홍콩'} 시장 히트맵은 곧 제공될 예정입니다.
        </p>
      </div>
    );
  }

  return (
    <section>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isKorean ? '🇰🇷 한국 시장 히트맵' : '🇺🇸 미국 시장 히트맵'}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({totalStocks}개 종목)
          </span>
          {/* 실시간 표시 배지 */}
          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            실시간
          </span>
        </h2>
        {/* 색상 범례 */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#228B22' }} />
            <span className="text-gray-600 dark:text-gray-400">상승</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#DC143C' }} />
            <span className="text-gray-600 dark:text-gray-400">하락</span>
          </div>
        </div>
      </div>

      {/* 설명 */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        박스 크기는 시가총액, 색상 강도는 등락률을 나타냅니다. 클릭하면 상세 페이지로 이동합니다.
      </p>

      {/* 데스크톱: Finviz 스타일 Treemap */}
      <div className="hidden md:block">
        {/* 로딩 상태 */}
        {isLoading && <HeatmapSkeleton />}

        {/* 에러 상태 */}
        {!isLoading && error && (
          <HeatmapError message={error} onRetry={refetch} />
        )}

        {/* 데이터 표시 */}
        {!isLoading && !error && sectors.length > 0 && (
          <>
            <div
              className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700"
              style={{ height: '700px' }}
            >
              <ResponsiveTreeMap
                data={treemapData}
                identity="id"
                value="value"
                tile="squarify"
                leavesOnly={false}
                innerPadding={1}
                outerPadding={3}
                colors={(node) => {
                  if (node.pathComponents.length === 1) {
                    return '#000000';
                  }
                  if (node.pathComponents.length === 2) {
                    return '#111827';
                  }
                  const change = node.data.change ?? 0;
                  return getHeatmapColor(change);
                }}
                borderWidth={1}
                borderColor={(node) => {
                  if (node.pathComponents.length === 2) {
                    return '#000000';
                  }
                  return 'rgba(0, 0, 0, 0.4)';
                }}
                enableLabel={false}
                enableParentLabel={false}
                tooltip={({ node }) => {
                  if (node.pathComponents.length === 2) {
                    return null;
                  }

                  const change = node.data.change ?? 0;
                  const price = node.data.price ?? 0;
                  const symbol = node.data.symbol ?? node.id;
                  const isPositive = change >= 0;
                  const sector = node.pathComponents[1] ?? '';

                  return (
                    <div className="bg-gray-900 text-white rounded-lg shadow-xl border border-gray-600 p-3 min-w-[220px]">
                      <div className="font-bold text-base mb-2 border-b border-gray-700 pb-2">
                        {node.data.name}
                        <span className="text-gray-400 ml-2 font-normal text-xs">
                          {symbol}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-400 text-xs">현재가</span>
                        <span className="font-semibold text-sm">
                          {formatPrice(price, isKorean)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-400 text-xs">등락률</span>
                        <span
                          className={`font-bold text-sm ${
                            isPositive ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {formatPercent(change)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-400 text-xs">시가총액</span>
                        <span className="font-semibold text-sm">
                          {formatMarketCap(node.value, isKorean)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs">섹터</span>
                        <span className="text-sm text-gray-300">{sector}</span>
                      </div>
                    </div>
                  );
                }}
                onClick={(node) => {
                  if (node.pathComponents.length === 3 && node.data.symbol) {
                    handleStockClick(node.data.symbol);
                  }
                }}
                layers={['nodes', CustomLabelsLayer]}
                animate={false}
                motionConfig="gentle"
              />
            </div>

            {/* 색상 범례 */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 mr-1">상승</span>
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#4DAD4D' }} title="+0.1~0.5%" />
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#5DBB5D' }} title="+0.5~1%" />
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#32CD32' }} title="+1~2%" />
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#228B22' }} title="+2~3%" />
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#006400' }} title="+3~5%" />
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#003D00' }} title="+5%↑" />
                <span className="text-xs text-gray-500 ml-1">+5%</span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#374151' }} />
                <span className="text-xs text-gray-500">0%</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 mr-1">하락</span>
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#D04545' }} title="-0.1~0.5%" />
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#E05555' }} title="-0.5~1%" />
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#F08080' }} title="-1~2%" />
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#DC143C' }} title="-2~3%" />
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#B22222' }} title="-3~5%" />
                <div className="w-5 h-5 rounded-sm border border-gray-600" style={{ backgroundColor: '#8B0000' }} title="-5%↓" />
                <span className="text-xs text-gray-500 ml-1">-5%</span>
              </div>
            </div>
          </>
        )}

        {/* 데이터 없음 */}
        {!isLoading && !error && sectors.length === 0 && (
          <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 p-8 text-center" style={{ height: '700px' }}>
            <div className="h-full flex items-center justify-center">
              <div>
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-400">데이터가 없습니다</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 모바일: 리스트 뷰 */}
      <div className="md:hidden">
        <MobileListView
          sectors={sectors}
          isKorean={isKorean}
          onStockClick={handleStockClick}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
