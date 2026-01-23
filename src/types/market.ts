export type MarketRegion = 'us' | 'kr' | 'jp' | 'hk';

// 1차 탭 타입: 국가별 시장 / 글로벌 시장
export type MarketType = 'country' | 'global';

// 국가별 시장 카테고리: 전체, 지수, 주식, ETF
export type CountryCategory = 'all' | 'indices' | 'stocks' | 'etf';

// 글로벌 시장 카테고리: 전체, 암호화폐, 원자재, 환율
export type GlobalCategory = 'all' | 'crypto' | 'commodities' | 'forex';

// 전체 카테고리 타입 (하위 호환성 유지)
export type MarketCategory = 'all' | 'indices' | 'stocks' | 'etf' | 'crypto' | 'commodities' | 'forex';

// 주식 섹터 타입
export type StockSector = 'all' | 'tech' | 'finance' | 'healthcare' | 'energy' | 'consumer' | 'telecom';

// 1차 탭 인터페이스
export interface MarketTypeTab {
  id: MarketType;
  label: string;
  icon: string;
}

export interface MarketTab {
  id: MarketRegion;
  label: string;
  flag: string;
}

// 카테고리 탭 인터페이스
export interface CategoryTab {
  id: MarketCategory;
  label: string;
  icon: string;
}

// 섹터 탭 인터페이스
export interface SectorTab {
  id: StockSector;
  label: string;
}

export interface MarketIndex {
  id: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  chartData: number[];
  isEstimated?: boolean;  // ETF 기반 추정치 여부 (true: ETF 가격으로 추정)
}

export interface Stock {
  rank: number;
  name: string;
  nameKr?: string; // 한글 종목명 (미국 주식의 경우 종목 마스터에서 제공)
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  domain?: string; // Brandfetch 로고용 도메인 (예: 'apple.com')
  sector?: StockSector; // 섹터 분류
}

export interface TopMover {
  name: string;
  nameKr?: string; // 한글 종목명 (미국 주식의 경우 종목 마스터에서 제공)
  ticker: string;
  changePercent: number;
}

// ETF 인터페이스
export interface ETF {
  id: string;
  name: string;
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  aum: string; // 운용자산규모
  expenseRatio: string; // 보수율
  chartData: number[];
}

// 암호화폐 인터페이스
export interface Crypto {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  marketCap: string;
  volume24h: string;
  icon: string;
  chartData: number[];
}

// 원자재 인터페이스
export interface Commodity {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
  chartData: number[];
}

// 환율 인터페이스
export interface Forex {
  id: string;
  pair: string;
  name: string;
  rate: number;
  change: number;
  changePercent: number;
  chartData: number[];
}

// ==================== 종목 상세 관련 타입 ====================

// 자산 유형
export type AssetType = 'stock' | 'etf' | 'crypto' | 'commodity' | 'forex' | 'index';

// 차트 기간
export type ChartPeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

// 차트 데이터 포인트
export interface ChartDataPoint {
  date: string;
  price: number;
  volume?: number;
}

// 종목 상세 정보
export interface AssetDetail {
  // 기본 정보
  ticker: string;
  name: string;
  assetType: AssetType;
  market: MarketRegion;
  domain?: string; // 로고용

  // 가격 정보
  price: number;
  change: number;
  changePercent: number;
  currency: string; // USD, KRW, JPY, HKD

  // OHLC (시가/고가/저가/종가)
  open: number;
  high: number;
  low: number;
  close: number;

  // 52주 고저
  high52w: number;
  low52w: number;

  // 거래 정보
  volume: string;
  marketCap?: string;

  // 주식/ETF 전용
  per?: number;
  pbr?: number;
  eps?: number;
  dividendYield?: string;

  // ETF 전용
  aum?: string;
  expenseRatio?: string;

  // 암호화폐 전용
  volume24h?: string;
  circulatingSupply?: string;

  // 원자재/환율 전용
  unit?: string;

  // 차트 데이터 (기간별)
  chartData: Record<ChartPeriod, ChartDataPoint[]>;
}

// 관련 뉴스
export interface RelatedNews {
  id: string;
  title: string;
  source: string;
  date: string;
  imageUrl?: string;
}
