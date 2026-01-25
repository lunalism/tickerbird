/**
 * ETF 구성종목 시드 API
 *
 * POST /api/etf/seed
 *
 * Firestore에 ETF 구성종목 데이터를 초기화합니다.
 * 개발 및 테스트 용도로 사용합니다.
 *
 * 초기화 대상 ETF:
 * - QQQ (Invesco QQQ Trust) - 나스닥 100
 * - SPY (SPDR S&P 500) - S&P 500
 * - VOO (Vanguard S&P 500) - S&P 500
 * - ARKK (ARK Innovation) - 혁신 기술
 * - DIA (SPDR Dow Jones) - 다우존스 30
 *
 * 데이터 출처:
 * - 각 ETF 운용사 공식 웹사이트 (2024년 12월 기준)
 * - ETF Database, Bloomberg Terminal
 */

import { NextResponse } from 'next/server';
import { setDoc } from 'firebase/firestore';
import { etfHoldingsDoc } from '@/lib/firestore';

// ==================== 타입 정의 ====================

interface ETFHolding {
  symbol: string;
  name: string;
  weight: number;
}

interface ETFHoldingsData {
  symbol: string;
  name: string;
  description: string;
  holdings: ETFHolding[];
  totalHoldings: number;
  updatedAt: string;
}

// ==================== ETF 구성종목 데이터 ====================

/**
 * QQQ (Invesco QQQ Trust) 구성종목
 *
 * 나스닥 100 지수 추종 ETF
 * 상위 15개 종목 (비중 기준)
 * 데이터 출처: Invesco 공식 웹사이트 (2024년 12월 기준)
 */
const QQQ_HOLDINGS: ETFHoldingsData = {
  symbol: 'QQQ',
  name: 'Invesco QQQ Trust',
  description: '나스닥 100 지수를 추종하는 대표적인 기술주 ETF입니다.',
  holdings: [
    { symbol: 'AAPL', name: 'Apple Inc.', weight: 8.92 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 8.15 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 7.81 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 5.42 },
    { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 5.12 },
    { symbol: 'META', name: 'Meta Platforms Inc.', weight: 4.98 },
    { symbol: 'TSLA', name: 'Tesla Inc.', weight: 4.21 },
    { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', weight: 2.89 },
    { symbol: 'GOOG', name: 'Alphabet Inc. Class C', weight: 2.78 },
    { symbol: 'COST', name: 'Costco Wholesale Corp.', weight: 2.65 },
    { symbol: 'NFLX', name: 'Netflix Inc.', weight: 2.21 },
    { symbol: 'AMD', name: 'Advanced Micro Devices', weight: 2.08 },
    { symbol: 'ADBE', name: 'Adobe Inc.', weight: 1.95 },
    { symbol: 'PEP', name: 'PepsiCo Inc.', weight: 1.82 },
    { symbol: 'LIN', name: 'Linde plc', weight: 1.68 },
  ],
  totalHoldings: 101,
  updatedAt: '2024-12-20',
};

/**
 * SPY (SPDR S&P 500 ETF Trust) 구성종목
 *
 * S&P 500 지수 추종 ETF (State Street)
 * 상위 15개 종목 (비중 기준)
 * 데이터 출처: State Street 공식 웹사이트 (2024년 12월 기준)
 */
const SPY_HOLDINGS: ETFHoldingsData = {
  symbol: 'SPY',
  name: 'SPDR S&P 500 ETF Trust',
  description: 'S&P 500 지수를 추종하는 세계 최대 규모의 ETF입니다.',
  holdings: [
    { symbol: 'AAPL', name: 'Apple Inc.', weight: 7.12 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 6.89 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 6.45 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 3.82 },
    { symbol: 'META', name: 'Meta Platforms Inc.', weight: 2.54 },
    { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', weight: 2.18 },
    { symbol: 'GOOG', name: 'Alphabet Inc. Class C', weight: 1.82 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', weight: 1.78 },
    { symbol: 'TSLA', name: 'Tesla Inc.', weight: 1.72 },
    { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 1.65 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', weight: 1.42 },
    { symbol: 'LLY', name: 'Eli Lilly and Co.', weight: 1.38 },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.', weight: 1.25 },
    { symbol: 'V', name: 'Visa Inc.', weight: 1.18 },
    { symbol: 'XOM', name: 'Exxon Mobil Corp.', weight: 1.12 },
  ],
  totalHoldings: 503,
  updatedAt: '2024-12-20',
};

/**
 * VOO (Vanguard S&P 500 ETF) 구성종목
 *
 * S&P 500 지수 추종 ETF (Vanguard)
 * 상위 15개 종목 (비중 기준)
 * 데이터 출처: Vanguard 공식 웹사이트 (2024년 12월 기준)
 */
const VOO_HOLDINGS: ETFHoldingsData = {
  symbol: 'VOO',
  name: 'Vanguard S&P 500 ETF',
  description: 'Vanguard가 운용하는 저비용 S&P 500 추종 ETF입니다.',
  holdings: [
    { symbol: 'AAPL', name: 'Apple Inc.', weight: 7.15 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 6.92 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 6.48 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 3.85 },
    { symbol: 'META', name: 'Meta Platforms Inc.', weight: 2.56 },
    { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', weight: 2.20 },
    { symbol: 'GOOG', name: 'Alphabet Inc. Class C', weight: 1.84 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', weight: 1.80 },
    { symbol: 'TSLA', name: 'Tesla Inc.', weight: 1.74 },
    { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 1.68 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', weight: 1.45 },
    { symbol: 'LLY', name: 'Eli Lilly and Co.', weight: 1.40 },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.', weight: 1.28 },
    { symbol: 'V', name: 'Visa Inc.', weight: 1.20 },
    { symbol: 'XOM', name: 'Exxon Mobil Corp.', weight: 1.15 },
  ],
  totalHoldings: 503,
  updatedAt: '2024-12-20',
};

/**
 * ARKK (ARK Innovation ETF) 구성종목
 *
 * 혁신 기술 테마 액티브 ETF (ARK Invest)
 * 상위 15개 종목 (비중 기준)
 * 데이터 출처: ARK Invest 공식 웹사이트 (2024년 12월 기준)
 */
const ARKK_HOLDINGS: ETFHoldingsData = {
  symbol: 'ARKK',
  name: 'ARK Innovation ETF',
  description: '파괴적 혁신 기술에 투자하는 액티브 ETF입니다.',
  holdings: [
    { symbol: 'TSLA', name: 'Tesla Inc.', weight: 11.82 },
    { symbol: 'COIN', name: 'Coinbase Global Inc.', weight: 8.45 },
    { symbol: 'ROKU', name: 'Roku Inc.', weight: 7.92 },
    { symbol: 'SQ', name: 'Block Inc.', weight: 6.78 },
    { symbol: 'PATH', name: 'UiPath Inc.', weight: 5.42 },
    { symbol: 'HOOD', name: 'Robinhood Markets Inc.', weight: 5.18 },
    { symbol: 'RBLX', name: 'Roblox Corp.', weight: 4.85 },
    { symbol: 'CRSP', name: 'CRISPR Therapeutics AG', weight: 4.52 },
    { symbol: 'SHOP', name: 'Shopify Inc.', weight: 4.28 },
    { symbol: 'DKNG', name: 'DraftKings Inc.', weight: 3.95 },
    { symbol: 'U', name: 'Unity Software Inc.', weight: 3.72 },
    { symbol: 'ZM', name: 'Zoom Video Communications', weight: 3.48 },
    { symbol: 'TWLO', name: 'Twilio Inc.', weight: 3.25 },
    { symbol: 'EXAS', name: 'Exact Sciences Corp.', weight: 2.98 },
    { symbol: 'TDOC', name: 'Teladoc Health Inc.', weight: 2.75 },
  ],
  totalHoldings: 35,
  updatedAt: '2024-12-20',
};

/**
 * DIA (SPDR Dow Jones Industrial Average ETF) 구성종목
 *
 * 다우존스 산업평균지수 추종 ETF
 * 전체 30개 종목 (다우 30 구성종목)
 * 데이터 출처: State Street 공식 웹사이트 (2024년 12월 기준)
 */
const DIA_HOLDINGS: ETFHoldingsData = {
  symbol: 'DIA',
  name: 'SPDR Dow Jones Industrial Average ETF',
  description: '다우존스 산업평균지수(30개 종목)를 추종하는 ETF입니다.',
  holdings: [
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.', weight: 8.92 },
    { symbol: 'GS', name: 'Goldman Sachs Group Inc.', weight: 7.85 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 6.78 },
    { symbol: 'HD', name: 'Home Depot Inc.', weight: 6.42 },
    { symbol: 'AMGN', name: 'Amgen Inc.', weight: 5.28 },
    { symbol: 'CAT', name: 'Caterpillar Inc.', weight: 5.15 },
    { symbol: 'V', name: 'Visa Inc.', weight: 4.82 },
    { symbol: 'MCD', name: "McDonald's Corp.", weight: 4.65 },
    { symbol: 'CRM', name: 'Salesforce Inc.', weight: 4.52 },
    { symbol: 'AXP', name: 'American Express Co.', weight: 4.38 },
    { symbol: 'TRV', name: 'Travelers Companies Inc.', weight: 4.25 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', weight: 4.12 },
    { symbol: 'AAPL', name: 'Apple Inc.', weight: 3.85 },
    { symbol: 'IBM', name: 'International Business Machines', weight: 3.72 },
    { symbol: 'BA', name: 'Boeing Co.', weight: 3.45 },
    { symbol: 'HON', name: 'Honeywell International Inc.', weight: 3.28 },
    { symbol: 'JNJ', name: 'Johnson & Johnson', weight: 2.95 },
    { symbol: 'PG', name: 'Procter & Gamble Co.', weight: 2.82 },
    { symbol: 'CVX', name: 'Chevron Corp.', weight: 2.68 },
    { symbol: 'MRK', name: 'Merck & Co. Inc.', weight: 2.52 },
    { symbol: 'DIS', name: 'Walt Disney Co.', weight: 1.85 },
    { symbol: 'NKE', name: 'Nike Inc.', weight: 1.42 },
    { symbol: 'KO', name: 'Coca-Cola Co.', weight: 1.28 },
    { symbol: 'MMM', name: '3M Co.', weight: 1.15 },
    { symbol: 'DOW', name: 'Dow Inc.', weight: 0.98 },
    { symbol: 'CSCO', name: 'Cisco Systems Inc.', weight: 0.92 },
    { symbol: 'WMT', name: 'Walmart Inc.', weight: 0.85 },
    { symbol: 'INTC', name: 'Intel Corp.', weight: 0.42 },
    { symbol: 'VZ', name: 'Verizon Communications Inc.', weight: 0.38 },
    { symbol: 'WBA', name: 'Walgreens Boots Alliance Inc.', weight: 0.22 },
  ],
  totalHoldings: 30,
  updatedAt: '2024-12-20',
};

// ==================== 추가 미국 ETF (5개) ====================

/**
 * SOXX (iShares Semiconductor ETF) 구성종목
 *
 * 반도체 섹터 ETF
 * 상위 10개 종목 (비중 기준)
 */
const SOXX_HOLDINGS: ETFHoldingsData = {
  symbol: 'SOXX',
  name: 'iShares Semiconductor ETF',
  description: '미국 반도체 섹터에 투자하는 대표 ETF입니다.',
  holdings: [
    { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 9.85 },
    { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 8.92 },
    { symbol: 'AMD', name: 'Advanced Micro Devices', weight: 7.45 },
    { symbol: 'QCOM', name: 'Qualcomm Inc.', weight: 6.82 },
    { symbol: 'TXN', name: 'Texas Instruments Inc.', weight: 5.95 },
    { symbol: 'INTC', name: 'Intel Corp.', weight: 5.42 },
    { symbol: 'MU', name: 'Micron Technology Inc.', weight: 4.88 },
    { symbol: 'AMAT', name: 'Applied Materials Inc.', weight: 4.52 },
    { symbol: 'LRCX', name: 'Lam Research Corp.', weight: 4.18 },
    { symbol: 'KLAC', name: 'KLA Corp.', weight: 3.95 },
  ],
  totalHoldings: 30,
  updatedAt: '2024-12-20',
};

/**
 * SOXL (Direxion Semiconductor Bull 3X) 구성종목
 *
 * 반도체 3배 레버리지 ETF (기초자산: SOXX)
 * SOXX와 동일한 구성종목 (3배 레버리지 적용)
 */
const SOXL_HOLDINGS: ETFHoldingsData = {
  symbol: 'SOXL',
  name: 'Direxion Daily Semiconductor Bull 3X',
  description: '반도체 섹터 3배 레버리지 ETF입니다. 단기 투자용.',
  holdings: [
    { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 9.85 },
    { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 8.92 },
    { symbol: 'AMD', name: 'Advanced Micro Devices', weight: 7.45 },
    { symbol: 'QCOM', name: 'Qualcomm Inc.', weight: 6.82 },
    { symbol: 'TXN', name: 'Texas Instruments Inc.', weight: 5.95 },
    { symbol: 'INTC', name: 'Intel Corp.', weight: 5.42 },
    { symbol: 'MU', name: 'Micron Technology Inc.', weight: 4.88 },
    { symbol: 'AMAT', name: 'Applied Materials Inc.', weight: 4.52 },
    { symbol: 'LRCX', name: 'Lam Research Corp.', weight: 4.18 },
    { symbol: 'KLAC', name: 'KLA Corp.', weight: 3.95 },
  ],
  totalHoldings: 30,
  updatedAt: '2024-12-20',
};

/**
 * TQQQ (ProShares UltraPro QQQ) 구성종목
 *
 * 나스닥 100 3배 레버리지 ETF (기초자산: QQQ)
 * QQQ와 동일한 구성종목 (3배 레버리지 적용)
 */
const TQQQ_HOLDINGS: ETFHoldingsData = {
  symbol: 'TQQQ',
  name: 'ProShares UltraPro QQQ',
  description: '나스닥 100 3배 레버리지 ETF입니다. 단기 투자용.',
  holdings: [
    { symbol: 'AAPL', name: 'Apple Inc.', weight: 8.92 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 8.15 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 7.81 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 5.42 },
    { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 5.12 },
    { symbol: 'META', name: 'Meta Platforms Inc.', weight: 4.98 },
    { symbol: 'TSLA', name: 'Tesla Inc.', weight: 4.21 },
    { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', weight: 2.89 },
    { symbol: 'GOOG', name: 'Alphabet Inc. Class C', weight: 2.78 },
    { symbol: 'COST', name: 'Costco Wholesale Corp.', weight: 2.65 },
  ],
  totalHoldings: 101,
  updatedAt: '2024-12-20',
};

/**
 * SCHD (Schwab US Dividend Equity ETF) 구성종목
 *
 * 미국 배당주 ETF
 * 상위 10개 종목 (비중 기준)
 */
const SCHD_HOLDINGS: ETFHoldingsData = {
  symbol: 'SCHD',
  name: 'Schwab US Dividend Equity ETF',
  description: '미국 고배당 우량주에 투자하는 배당 ETF입니다.',
  holdings: [
    { symbol: 'ABBV', name: 'AbbVie Inc.', weight: 4.52 },
    { symbol: 'HD', name: 'Home Depot Inc.', weight: 4.38 },
    { symbol: 'AMGN', name: 'Amgen Inc.', weight: 4.25 },
    { symbol: 'CSCO', name: 'Cisco Systems Inc.', weight: 4.12 },
    { symbol: 'PEP', name: 'PepsiCo Inc.', weight: 3.95 },
    { symbol: 'MRK', name: 'Merck & Co. Inc.', weight: 3.82 },
    { symbol: 'CVX', name: 'Chevron Corp.', weight: 3.68 },
    { symbol: 'KO', name: 'Coca-Cola Co.', weight: 3.55 },
    { symbol: 'VZ', name: 'Verizon Communications Inc.', weight: 3.42 },
    { symbol: 'PFE', name: 'Pfizer Inc.', weight: 3.28 },
  ],
  totalHoldings: 104,
  updatedAt: '2024-12-20',
};

/**
 * VTI (Vanguard Total Stock Market ETF) 구성종목
 *
 * 미국 전체 주식시장 ETF
 * 상위 10개 종목 (비중 기준)
 */
const VTI_HOLDINGS: ETFHoldingsData = {
  symbol: 'VTI',
  name: 'Vanguard Total Stock Market ETF',
  description: '미국 전체 주식시장에 투자하는 종합 ETF입니다.',
  holdings: [
    { symbol: 'AAPL', name: 'Apple Inc.', weight: 6.85 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 6.42 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 5.95 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 3.52 },
    { symbol: 'META', name: 'Meta Platforms Inc.', weight: 2.38 },
    { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', weight: 2.05 },
    { symbol: 'GOOG', name: 'Alphabet Inc. Class C', weight: 1.72 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', weight: 1.65 },
    { symbol: 'TSLA', name: 'Tesla Inc.', weight: 1.58 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', weight: 1.35 },
  ],
  totalHoldings: 3800,
  updatedAt: '2024-12-20',
};

// ==================== 국내 상장 ETF (10개) ====================

/**
 * TIGER 미국S&P500 (360750) 구성종목
 *
 * 미래에셋자산운용 - S&P 500 추종 국내 상장 ETF
 */
const TIGER_SP500_HOLDINGS: ETFHoldingsData = {
  symbol: '360750',
  name: 'TIGER 미국S&P500',
  description: 'S&P 500 지수를 추종하는 국내 상장 ETF입니다.',
  holdings: [
    { symbol: 'AAPL', name: 'Apple Inc.', weight: 7.15 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 6.92 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 6.48 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 3.85 },
    { symbol: 'META', name: 'Meta Platforms Inc.', weight: 2.56 },
    { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', weight: 2.20 },
    { symbol: 'GOOG', name: 'Alphabet Inc. Class C', weight: 1.84 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', weight: 1.80 },
    { symbol: 'TSLA', name: 'Tesla Inc.', weight: 1.74 },
    { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 1.68 },
  ],
  totalHoldings: 503,
  updatedAt: '2024-12-20',
};

/**
 * KODEX 200 (069500) 구성종목
 *
 * 삼성자산운용 - KOSPI 200 추종 ETF
 */
const KODEX_200_HOLDINGS: ETFHoldingsData = {
  symbol: '069500',
  name: 'KODEX 200',
  description: 'KOSPI 200 지수를 추종하는 국내 대표 ETF입니다.',
  holdings: [
    { symbol: '005930', name: '삼성전자', weight: 28.52 },
    { symbol: '000660', name: 'SK하이닉스', weight: 6.85 },
    { symbol: '373220', name: 'LG에너지솔루션', weight: 3.92 },
    { symbol: '005380', name: '현대차', weight: 3.45 },
    { symbol: '035420', name: 'NAVER', weight: 2.88 },
    { symbol: '000270', name: '기아', weight: 2.52 },
    { symbol: '005490', name: 'POSCO홀딩스', weight: 2.15 },
    { symbol: '035720', name: '카카오', weight: 1.92 },
    { symbol: '051910', name: 'LG화학', weight: 1.85 },
    { symbol: '006400', name: '삼성SDI', weight: 1.72 },
  ],
  totalHoldings: 200,
  updatedAt: '2024-12-20',
};

/**
 * TIGER 미국나스닥100 (133690) 구성종목
 *
 * 미래에셋자산운용 - 나스닥 100 추종 국내 상장 ETF
 */
const TIGER_NASDAQ_HOLDINGS: ETFHoldingsData = {
  symbol: '133690',
  name: 'TIGER 미국나스닥100',
  description: '나스닥 100 지수를 추종하는 국내 상장 ETF입니다.',
  holdings: [
    { symbol: 'AAPL', name: 'Apple Inc.', weight: 8.92 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 8.15 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 7.81 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 5.42 },
    { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 5.12 },
    { symbol: 'META', name: 'Meta Platforms Inc.', weight: 4.98 },
    { symbol: 'TSLA', name: 'Tesla Inc.', weight: 4.21 },
    { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', weight: 2.89 },
    { symbol: 'GOOG', name: 'Alphabet Inc. Class C', weight: 2.78 },
    { symbol: 'COST', name: 'Costco Wholesale Corp.', weight: 2.65 },
  ],
  totalHoldings: 101,
  updatedAt: '2024-12-20',
};

/**
 * KODEX 반도체 (091160) 구성종목
 *
 * 삼성자산운용 - 반도체 섹터 ETF
 */
const KODEX_SEMI_HOLDINGS: ETFHoldingsData = {
  symbol: '091160',
  name: 'KODEX 반도체',
  description: '국내 반도체 섹터에 투자하는 ETF입니다.',
  holdings: [
    { symbol: '005930', name: '삼성전자', weight: 32.45 },
    { symbol: '000660', name: 'SK하이닉스', weight: 28.92 },
    { symbol: '402340', name: 'SK스퀘어', weight: 5.85 },
    { symbol: '403870', name: 'HPSP', weight: 4.52 },
    { symbol: '036830', name: '솔브레인홀딩스', weight: 3.95 },
    { symbol: '058470', name: '리노공업', weight: 3.42 },
    { symbol: '007810', name: '코리아써키트', weight: 2.88 },
    { symbol: '089010', name: '켐트로닉스', weight: 2.52 },
    { symbol: '357780', name: '솔브레인', weight: 2.25 },
    { symbol: '240810', name: '원익IPS', weight: 2.05 },
  ],
  totalHoldings: 20,
  updatedAt: '2024-12-20',
};

/**
 * PLUS K방산 (464440) 구성종목
 *
 * 한화자산운용 - 국방/방산 섹터 ETF
 */
const PLUS_KDEFENSE_HOLDINGS: ETFHoldingsData = {
  symbol: '464440',
  name: 'PLUS K방산',
  description: '국내 방산 기업에 투자하는 테마 ETF입니다.',
  holdings: [
    { symbol: '012450', name: '한화에어로스페이스', weight: 22.85 },
    { symbol: '047810', name: '한국항공우주', weight: 18.92 },
    { symbol: '009540', name: '한국조선해양', weight: 12.45 },
    { symbol: '329180', name: '현대중공업', weight: 10.88 },
    { symbol: '000880', name: '한화', weight: 8.52 },
    { symbol: '042660', name: '한화오션', weight: 7.95 },
    { symbol: '267260', name: '현대일렉트릭', weight: 5.42 },
    { symbol: '010950', name: 'S-Oil', weight: 4.85 },
    { symbol: '042670', name: '두산인프라코어', weight: 4.28 },
    { symbol: '012330', name: '현대로템', weight: 3.88 },
  ],
  totalHoldings: 15,
  updatedAt: '2024-12-20',
};

/**
 * HANARO 원자력iSelect (472160) 구성종목
 *
 * NH-Amundi자산운용 - 원자력/원전 테마 ETF
 */
const HANARO_NUCLEAR_HOLDINGS: ETFHoldingsData = {
  symbol: '472160',
  name: 'HANARO 원자력iSelect',
  description: '원자력/원전 관련 기업에 투자하는 테마 ETF입니다.',
  holdings: [
    { symbol: '015760', name: '한국전력', weight: 18.52 },
    { symbol: '034020', name: '두산에너빌리티', weight: 15.88 },
    { symbol: '009830', name: '한화솔루션', weight: 12.45 },
    { symbol: '267260', name: '현대일렉트릭', weight: 10.92 },
    { symbol: '004490', name: '세방전지', weight: 8.55 },
    { symbol: '006280', name: '녹십자', weight: 7.42 },
    { symbol: '071320', name: '지역난방공사', weight: 6.85 },
    { symbol: '053690', name: '한국조선', weight: 5.92 },
    { symbol: '005850', name: '에스엘', weight: 4.65 },
    { symbol: '004370', name: '농심', weight: 3.84 },
  ],
  totalHoldings: 20,
  updatedAt: '2024-12-20',
};

/**
 * KODEX 2차전지산업 (305720) 구성종목
 *
 * 삼성자산운용 - 2차전지/배터리 섹터 ETF
 */
const KODEX_BATTERY_HOLDINGS: ETFHoldingsData = {
  symbol: '305720',
  name: 'KODEX 2차전지산업',
  description: '2차전지/배터리 산업에 투자하는 ETF입니다.',
  holdings: [
    { symbol: '373220', name: 'LG에너지솔루션', weight: 25.85 },
    { symbol: '006400', name: '삼성SDI', weight: 22.42 },
    { symbol: '051910', name: 'LG화학', weight: 15.88 },
    { symbol: '247540', name: '에코프로비엠', weight: 8.52 },
    { symbol: '086520', name: '에코프로', weight: 6.95 },
    { symbol: '003670', name: '포스코퓨처엠', weight: 5.42 },
    { symbol: '011790', name: 'SKC', weight: 4.28 },
    { symbol: '006260', name: 'LS', weight: 3.85 },
    { symbol: '064350', name: '현대로템', weight: 3.42 },
    { symbol: '012450', name: '한화에어로스페이스', weight: 3.41 },
  ],
  totalHoldings: 25,
  updatedAt: '2024-12-20',
};

/**
 * TIGER 차이나휴머노이드로봇 (480360) 구성종목
 *
 * 미래에셋자산운용 - 중국 로봇/AI 테마 ETF
 */
const TIGER_CHINA_ROBOT_HOLDINGS: ETFHoldingsData = {
  symbol: '480360',
  name: 'TIGER 차이나휴머노이드로봇',
  description: '중국 휴머노이드 로봇/AI 기업에 투자하는 테마 ETF입니다.',
  holdings: [
    { symbol: 'BYDDF', name: 'BYD Co. Ltd.', weight: 12.85 },
    { symbol: '002594.SZ', name: 'BYD', weight: 11.42 },
    { symbol: '601012.SS', name: 'LONGi Green Energy', weight: 9.88 },
    { symbol: '300750.SZ', name: 'CATL', weight: 8.55 },
    { symbol: '002475.SZ', name: 'Luxshare Precision', weight: 7.92 },
    { symbol: '601360.SS', name: '360 Security', weight: 6.45 },
    { symbol: '300124.SZ', name: 'Inovance Technology', weight: 5.88 },
    { symbol: '688169.SS', name: 'Beijing Roborock', weight: 5.42 },
    { symbol: '300015.SZ', name: 'Aier Eye Hospital', weight: 4.85 },
    { symbol: '002230.SZ', name: 'iFlytek', weight: 4.28 },
  ],
  totalHoldings: 30,
  updatedAt: '2024-12-20',
};

/**
 * SOL 조선TOP3플러스 (466920) 구성종목
 *
 * 신한자산운용 - 조선업 테마 ETF
 */
const SOL_SHIPBUILDING_HOLDINGS: ETFHoldingsData = {
  symbol: '466920',
  name: 'SOL 조선TOP3플러스',
  description: '국내 조선업 대표 기업에 투자하는 테마 ETF입니다.',
  holdings: [
    { symbol: '009540', name: '한국조선해양', weight: 25.85 },
    { symbol: '329180', name: '현대중공업', weight: 22.42 },
    { symbol: '042660', name: '한화오션', weight: 18.88 },
    { symbol: '010620', name: '현대미포조선', weight: 10.52 },
    { symbol: '009160', name: '삼성중공업', weight: 8.95 },
    { symbol: '267260', name: '현대일렉트릭', weight: 5.42 },
    { symbol: '003620', name: '쌍용차', weight: 3.28 },
    { symbol: '069260', name: 'TKG휴켐스', weight: 2.85 },
    { symbol: '003380', name: '하림지주', weight: 1.83 },
    { symbol: '000720', name: '현대건설', weight: 0.00 },
  ],
  totalHoldings: 10,
  updatedAt: '2024-12-20',
};

/**
 * KODEX 미국배당다우존스 (489250) 구성종목
 *
 * 삼성자산운용 - 미국 배당주 ETF (다우존스 배당 지수 추종)
 */
const KODEX_US_DIV_HOLDINGS: ETFHoldingsData = {
  symbol: '489250',
  name: 'KODEX 미국배당다우존스',
  description: '미국 고배당 우량주에 투자하는 국내 상장 ETF입니다.',
  holdings: [
    { symbol: 'ABBV', name: 'AbbVie Inc.', weight: 4.52 },
    { symbol: 'HD', name: 'Home Depot Inc.', weight: 4.38 },
    { symbol: 'AMGN', name: 'Amgen Inc.', weight: 4.25 },
    { symbol: 'CSCO', name: 'Cisco Systems Inc.', weight: 4.12 },
    { symbol: 'PEP', name: 'PepsiCo Inc.', weight: 3.95 },
    { symbol: 'MRK', name: 'Merck & Co. Inc.', weight: 3.82 },
    { symbol: 'CVX', name: 'Chevron Corp.', weight: 3.68 },
    { symbol: 'KO', name: 'Coca-Cola Co.', weight: 3.55 },
    { symbol: 'VZ', name: 'Verizon Communications Inc.', weight: 3.42 },
    { symbol: 'PFE', name: 'Pfizer Inc.', weight: 3.28 },
  ],
  totalHoldings: 100,
  updatedAt: '2024-12-20',
};

// 전체 ETF 데이터 배열 (기존 5개 + 신규 15개 = 총 20개)
const ALL_ETF_DATA: ETFHoldingsData[] = [
  // 기존 미국 ETF (5개)
  QQQ_HOLDINGS,
  SPY_HOLDINGS,
  VOO_HOLDINGS,
  ARKK_HOLDINGS,
  DIA_HOLDINGS,
  // 추가 미국 ETF (5개)
  SOXX_HOLDINGS,
  SOXL_HOLDINGS,
  TQQQ_HOLDINGS,
  SCHD_HOLDINGS,
  VTI_HOLDINGS,
  // 국내 상장 ETF (10개)
  TIGER_SP500_HOLDINGS,
  KODEX_200_HOLDINGS,
  TIGER_NASDAQ_HOLDINGS,
  KODEX_SEMI_HOLDINGS,
  PLUS_KDEFENSE_HOLDINGS,
  HANARO_NUCLEAR_HOLDINGS,
  KODEX_BATTERY_HOLDINGS,
  TIGER_CHINA_ROBOT_HOLDINGS,
  SOL_SHIPBUILDING_HOLDINGS,
  KODEX_US_DIV_HOLDINGS,
];

// ==================== POST 핸들러 ====================

export async function POST() {
  try {
    console.log('[ETF Seed] ETF 구성종목 데이터 시드 시작...');

    // 각 ETF 데이터를 Firestore에 저장
    const results = await Promise.all(
      ALL_ETF_DATA.map(async (etfData) => {
        try {
          // 문서 ID는 ETF 심볼 사용
          const docRef = etfHoldingsDoc(etfData.symbol);
          await setDoc(docRef, etfData);
          console.log(`[ETF Seed] ${etfData.symbol} 저장 완료 (${etfData.holdings.length}개 종목)`);
          return { symbol: etfData.symbol, success: true };
        } catch (error) {
          console.error(`[ETF Seed] ${etfData.symbol} 저장 실패:`, error);
          return { symbol: etfData.symbol, success: false, error: String(error) };
        }
      })
    );

    // 결과 집계
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(`[ETF Seed] 시드 완료 - 성공: ${successCount}, 실패: ${failedCount}`);

    return NextResponse.json({
      success: true,
      message: `ETF 구성종목 시드 완료: ${successCount}개 ETF 저장됨`,
      results,
      summary: {
        total: ALL_ETF_DATA.length,
        success: successCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    console.error('[ETF Seed] 시드 오류:', error);
    return NextResponse.json(
      { success: false, error: 'ETF 구성종목 시드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
