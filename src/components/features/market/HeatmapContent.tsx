'use client';

/**
 * HeatmapContent 컴포넌트
 *
 * Finviz 스타일의 전체 통합 Treemap 히트맵을 표시합니다.
 * 섹터별 종목 구조는 하드코딩, 가격/등락률만 실시간 API에서 가져옵니다.
 *
 * ============================================================
 * 핵심 기능:
 * ============================================================
 * 1. 하나의 큰 Treemap으로 모든 섹터/종목 표시 (Finviz 스타일)
 * 2. 한국: 13개 섹터, 99개 종목
 * 3. 미국: 11개 섹터, 99개 종목
 * 4. 섹터/종목 구조는 하드코딩 (레이아웃 유지)
 * 5. 가격/등락률만 실시간 API에서 가져옴
 * 6. API 실패 종목은 0% 표시
 *
 * ============================================================
 * 데이터 소스:
 * ============================================================
 * - 한국 시장: /api/kis/ranking/market-cap (시가총액 순위 API)
 * - 미국 시장: /api/kis/overseas/stock/prices (개별 종목 시세 API)
 *
 * ============================================================
 * Finviz 색상 규칙 (한국/미국 동일):
 * ============================================================
 * 상승 (초록 계열): #003D00 ~ #4DAD4D
 * 하락 (빨강 계열): #8B0000 ~ #D04545
 * 보합 (±0.1% 미만): #374151
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveTreeMap, ComputedNode } from '@nivo/treemap';
import type { MarketRegion } from '@/types';

// ==================== 타입 정의 ====================

/** 개별 종목 데이터 (하드코딩용) */
interface StockData {
  symbol: string;        // 티커 심볼 (예: '005930', 'AAPL')
  name: string;          // 종목명 (예: '삼성전자', 'Apple')
  marketCap: number;     // 시가총액 (억원 또는 백만달러) - 박스 크기용
  changePercent: number; // 등락률 (실시간 업데이트됨)
  price: number;         // 현재가 (실시간 업데이트됨)
}

/** 섹터 데이터 */
interface SectorData {
  name: string;          // 섹터명 (예: '반도체', 'TECHNOLOGY')
  stocks: StockData[];   // 섹터 내 종목들
}

/** Nivo Treemap용 노드 데이터 */
interface TreemapNode {
  id: string;
  name: string;
  value?: number;
  change?: number;
  symbol?: string;
  price?: number;
  children?: TreemapNode[];
}

/** API에서 받은 실시간 데이터 맵 */
interface RealTimeDataMap {
  [symbol: string]: {
    price: number;
    changePercent: number;
  };
}

// ==================== 한국 시장 섹터 데이터 (13개 섹터, 99개 종목) ====================

const KOREA_SECTORS: SectorData[] = [
  {
    name: '반도체',
    stocks: [
      { symbol: '005930', name: '삼성전자', marketCap: 3500000, changePercent: 0, price: 0 },
      { symbol: '000660', name: 'SK하이닉스', marketCap: 1100000, changePercent: 0, price: 0 },
      { symbol: '402340', name: 'SK스퀘어', marketCap: 120000, changePercent: 0, price: 0 },
      { symbol: '042700', name: '한미반도체', marketCap: 95000, changePercent: 0, price: 0 },
      { symbol: '166090', name: '하나머티리얼즈', marketCap: 18000, changePercent: 0, price: 0 },
      { symbol: '036830', name: '솔브레인홀딩스', marketCap: 12000, changePercent: 0, price: 0 },
      { symbol: '058470', name: '리노공업', marketCap: 45000, changePercent: 0, price: 0 },
      { symbol: '357780', name: '솔브레인', marketCap: 28000, changePercent: 0, price: 0 },
      { symbol: '240810', name: '원익IPS', marketCap: 22000, changePercent: 0, price: 0 },
      { symbol: '039030', name: '이오테크닉스', marketCap: 35000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: '자동차',
    stocks: [
      { symbol: '005380', name: '현대차', marketCap: 450000, changePercent: 0, price: 0 },
      { symbol: '000270', name: '기아', marketCap: 380000, changePercent: 0, price: 0 },
      { symbol: '012330', name: '현대모비스', marketCap: 180000, changePercent: 0, price: 0 },
      { symbol: '018880', name: '한온시스템', marketCap: 35000, changePercent: 0, price: 0 },
      { symbol: '204320', name: '만도', marketCap: 28000, changePercent: 0, price: 0 },
      { symbol: '011210', name: '현대위아', marketCap: 22000, changePercent: 0, price: 0 },
      { symbol: '009900', name: '명신산업', marketCap: 12000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: '금융',
    stocks: [
      { symbol: '105560', name: 'KB금융', marketCap: 280000, changePercent: 0, price: 0 },
      { symbol: '055550', name: '신한지주', marketCap: 200000, changePercent: 0, price: 0 },
      { symbol: '086790', name: '하나금융', marketCap: 150000, changePercent: 0, price: 0 },
      { symbol: '000810', name: '삼성화재', marketCap: 140000, changePercent: 0, price: 0 },
      { symbol: '316140', name: '우리금융', marketCap: 100000, changePercent: 0, price: 0 },
      { symbol: '032830', name: '삼성생명', marketCap: 120000, changePercent: 0, price: 0 },
      { symbol: '006800', name: '미래에셋증권', marketCap: 55000, changePercent: 0, price: 0 },
      { symbol: '039490', name: '키움증권', marketCap: 45000, changePercent: 0, price: 0 },
      { symbol: '024110', name: '기업은행', marketCap: 80000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: '바이오',
    stocks: [
      { symbol: '207940', name: '삼성바이오로직스', marketCap: 600000, changePercent: 0, price: 0 },
      { symbol: '068270', name: '셀트리온', marketCap: 250000, changePercent: 0, price: 0 },
      { symbol: '000100', name: '유한양행', marketCap: 80000, changePercent: 0, price: 0 },
      { symbol: '326030', name: 'SK바이오팜', marketCap: 70000, changePercent: 0, price: 0 },
      { symbol: '091990', name: '셀트리온헬스케어', marketCap: 55000, changePercent: 0, price: 0 },
      { symbol: '128940', name: '한미약품', marketCap: 45000, changePercent: 0, price: 0 },
      { symbol: '006280', name: '녹십자', marketCap: 35000, changePercent: 0, price: 0 },
      { symbol: '302440', name: 'SK바이오사이언스', marketCap: 28000, changePercent: 0, price: 0 },
      { symbol: '141080', name: '레고켐바이오', marketCap: 22000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: 'IT/인터넷',
    stocks: [
      { symbol: '035420', name: 'NAVER', marketCap: 350000, changePercent: 0, price: 0 },
      { symbol: '035720', name: '카카오', marketCap: 220000, changePercent: 0, price: 0 },
      { symbol: '259960', name: '크래프톤', marketCap: 150000, changePercent: 0, price: 0 },
      { symbol: '263750', name: '펄어비스', marketCap: 30000, changePercent: 0, price: 0 },
      { symbol: '036570', name: '엔씨소프트', marketCap: 85000, changePercent: 0, price: 0 },
      { symbol: '251270', name: '넷마블', marketCap: 45000, changePercent: 0, price: 0 },
      { symbol: '293490', name: '카카오게임즈', marketCap: 22000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: '2차전지',
    stocks: [
      { symbol: '373220', name: 'LG에너지솔루션', marketCap: 900000, changePercent: 0, price: 0 },
      { symbol: '006400', name: '삼성SDI', marketCap: 350000, changePercent: 0, price: 0 },
      { symbol: '247540', name: '에코프로비엠', marketCap: 150000, changePercent: 0, price: 0 },
      { symbol: '086520', name: '에코프로', marketCap: 100000, changePercent: 0, price: 0 },
      { symbol: '096770', name: 'SK이노베이션', marketCap: 120000, changePercent: 0, price: 0 },
      { symbol: '003670', name: '포스코퓨처엠', marketCap: 95000, changePercent: 0, price: 0 },
      { symbol: '006260', name: 'LS', marketCap: 55000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: '화학',
    stocks: [
      { symbol: '051910', name: 'LG화학', marketCap: 280000, changePercent: 0, price: 0 },
      { symbol: '011170', name: '롯데케미칼', marketCap: 50000, changePercent: 0, price: 0 },
      { symbol: '010950', name: 'S-Oil', marketCap: 60000, changePercent: 0, price: 0 },
      { symbol: '011780', name: '금호석유', marketCap: 35000, changePercent: 0, price: 0 },
      { symbol: '285130', name: 'SK케미칼', marketCap: 28000, changePercent: 0, price: 0 },
      { symbol: '009830', name: '한화솔루션', marketCap: 45000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: '철강/조선',
    stocks: [
      { symbol: '005490', name: 'POSCO홀딩스', marketCap: 280000, changePercent: 0, price: 0 },
      { symbol: '009540', name: 'HD한국조선해양', marketCap: 150000, changePercent: 0, price: 0 },
      { symbol: '010140', name: '삼성중공업', marketCap: 80000, changePercent: 0, price: 0 },
      { symbol: '042660', name: '한화오션', marketCap: 100000, changePercent: 0, price: 0 },
      { symbol: '004020', name: '현대제철', marketCap: 55000, changePercent: 0, price: 0 },
      { symbol: '267250', name: 'HD현대', marketCap: 85000, changePercent: 0, price: 0 },
      { symbol: '329180', name: 'HD현대중공업', marketCap: 120000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: '방산',
    stocks: [
      { symbol: '012450', name: '한화에어로스페이스', marketCap: 200000, changePercent: 0, price: 0 },
      { symbol: '079550', name: 'LIG넥스원', marketCap: 50000, changePercent: 0, price: 0 },
      { symbol: '047810', name: '한국항공우주', marketCap: 80000, changePercent: 0, price: 0 },
      { symbol: '272210', name: '한화시스템', marketCap: 55000, changePercent: 0, price: 0 },
      { symbol: '064350', name: '현대로템', marketCap: 45000, changePercent: 0, price: 0 },
      { symbol: '000880', name: '한화', marketCap: 35000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: '통신/유틸',
    stocks: [
      { symbol: '017670', name: 'SK텔레콤', marketCap: 130000, changePercent: 0, price: 0 },
      { symbol: '030200', name: 'KT', marketCap: 80000, changePercent: 0, price: 0 },
      { symbol: '032640', name: 'LG유플러스', marketCap: 50000, changePercent: 0, price: 0 },
      { symbol: '015760', name: '한국전력', marketCap: 120000, changePercent: 0, price: 0 },
      { symbol: '034730', name: 'SK', marketCap: 95000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: '엔터/미디어',
    stocks: [
      { symbol: '352820', name: '하이브', marketCap: 100000, changePercent: 0, price: 0 },
      { symbol: '035900', name: 'JYP Ent.', marketCap: 30000, changePercent: 0, price: 0 },
      { symbol: '041510', name: 'SM', marketCap: 20000, changePercent: 0, price: 0 },
      { symbol: '122870', name: 'YG엔터테인먼트', marketCap: 15000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: '유통/소비재',
    stocks: [
      { symbol: '004170', name: '신세계', marketCap: 25000, changePercent: 0, price: 0 },
      { symbol: '139480', name: '이마트', marketCap: 30000, changePercent: 0, price: 0 },
      { symbol: '051900', name: 'LG생활건강', marketCap: 80000, changePercent: 0, price: 0 },
      { symbol: '090430', name: '아모레퍼시픽', marketCap: 55000, changePercent: 0, price: 0 },
      { symbol: '097950', name: 'CJ제일제당', marketCap: 45000, changePercent: 0, price: 0 },
      { symbol: '069960', name: '현대백화점', marketCap: 22000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: '건설',
    stocks: [
      { symbol: '028260', name: '삼성물산', marketCap: 250000, changePercent: 0, price: 0 },
      { symbol: '000720', name: '현대건설', marketCap: 55000, changePercent: 0, price: 0 },
      { symbol: '006360', name: 'GS건설', marketCap: 28000, changePercent: 0, price: 0 },
      { symbol: '047040', name: '대우건설', marketCap: 22000, changePercent: 0, price: 0 },
      { symbol: '034020', name: '두산에너빌리티', marketCap: 85000, changePercent: 0, price: 0 },
    ],
  },
];

// ==================== 미국 시장 섹터 데이터 (11개 섹터, 99개 종목) ====================

const US_SECTORS: SectorData[] = [
  {
    name: 'TECHNOLOGY',
    stocks: [
      { symbol: 'AAPL', name: 'Apple', marketCap: 3000000, changePercent: 0, price: 0 },
      { symbol: 'MSFT', name: 'Microsoft', marketCap: 2800000, changePercent: 0, price: 0 },
      { symbol: 'NVDA', name: 'NVIDIA', marketCap: 1200000, changePercent: 0, price: 0 },
      { symbol: 'AVGO', name: 'Broadcom', marketCap: 600000, changePercent: 0, price: 0 },
      { symbol: 'AMD', name: 'AMD', marketCap: 200000, changePercent: 0, price: 0 },
      { symbol: 'INTC', name: 'Intel', marketCap: 100000, changePercent: 0, price: 0 },
      { symbol: 'CRM', name: 'Salesforce', marketCap: 250000, changePercent: 0, price: 0 },
      { symbol: 'ORCL', name: 'Oracle', marketCap: 350000, changePercent: 0, price: 0 },
      { symbol: 'ADBE', name: 'Adobe', marketCap: 220000, changePercent: 0, price: 0 },
      { symbol: 'CSCO', name: 'Cisco', marketCap: 180000, changePercent: 0, price: 0 },
      { symbol: 'NOW', name: 'ServiceNow', marketCap: 150000, changePercent: 0, price: 0 },
      { symbol: 'QCOM', name: 'Qualcomm', marketCap: 145000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: 'CONSUMER CYCLICAL',
    stocks: [
      { symbol: 'AMZN', name: 'Amazon', marketCap: 1500000, changePercent: 0, price: 0 },
      { symbol: 'TSLA', name: 'Tesla', marketCap: 800000, changePercent: 0, price: 0 },
      { symbol: 'HD', name: 'Home Depot', marketCap: 350000, changePercent: 0, price: 0 },
      { symbol: 'MCD', name: "McDonald's", marketCap: 200000, changePercent: 0, price: 0 },
      { symbol: 'NKE', name: 'Nike', marketCap: 150000, changePercent: 0, price: 0 },
      { symbol: 'SBUX', name: 'Starbucks', marketCap: 100000, changePercent: 0, price: 0 },
      { symbol: 'LOW', name: "Lowe's", marketCap: 120000, changePercent: 0, price: 0 },
      { symbol: 'BKNG', name: 'Booking', marketCap: 110000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: 'COMMUNICATION',
    stocks: [
      { symbol: 'GOOGL', name: 'Alphabet', marketCap: 1800000, changePercent: 0, price: 0 },
      { symbol: 'META', name: 'Meta', marketCap: 1000000, changePercent: 0, price: 0 },
      { symbol: 'NFLX', name: 'Netflix', marketCap: 250000, changePercent: 0, price: 0 },
      { symbol: 'DIS', name: 'Disney', marketCap: 180000, changePercent: 0, price: 0 },
      { symbol: 'T', name: 'AT&T', marketCap: 120000, changePercent: 0, price: 0 },
      { symbol: 'VZ', name: 'Verizon', marketCap: 150000, changePercent: 0, price: 0 },
      { symbol: 'TMUS', name: 'T-Mobile', marketCap: 185000, changePercent: 0, price: 0 },
      { symbol: 'CMCSA', name: 'Comcast', marketCap: 145000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: 'HEALTHCARE',
    stocks: [
      { symbol: 'LLY', name: 'Eli Lilly', marketCap: 700000, changePercent: 0, price: 0 },
      { symbol: 'UNH', name: 'UnitedHealth', marketCap: 500000, changePercent: 0, price: 0 },
      { symbol: 'JNJ', name: 'J&J', marketCap: 400000, changePercent: 0, price: 0 },
      { symbol: 'PFE', name: 'Pfizer', marketCap: 150000, changePercent: 0, price: 0 },
      { symbol: 'MRK', name: 'Merck', marketCap: 300000, changePercent: 0, price: 0 },
      { symbol: 'ABBV', name: 'AbbVie', marketCap: 280000, changePercent: 0, price: 0 },
      { symbol: 'TMO', name: 'Thermo Fisher', marketCap: 200000, changePercent: 0, price: 0 },
      { symbol: 'ABT', name: 'Abbott', marketCap: 180000, changePercent: 0, price: 0 },
      { symbol: 'AMGN', name: 'Amgen', marketCap: 145000, changePercent: 0, price: 0 },
      { symbol: 'GILD', name: 'Gilead', marketCap: 85000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: 'FINANCIAL',
    stocks: [
      { symbol: 'JPM', name: 'JPMorgan', marketCap: 500000, changePercent: 0, price: 0 },
      { symbol: 'V', name: 'Visa', marketCap: 450000, changePercent: 0, price: 0 },
      { symbol: 'MA', name: 'Mastercard', marketCap: 400000, changePercent: 0, price: 0 },
      { symbol: 'BAC', name: 'Bank of America', marketCap: 280000, changePercent: 0, price: 0 },
      { symbol: 'WFC', name: 'Wells Fargo', marketCap: 180000, changePercent: 0, price: 0 },
      { symbol: 'GS', name: 'Goldman Sachs', marketCap: 150000, changePercent: 0, price: 0 },
      { symbol: 'MS', name: 'Morgan Stanley', marketCap: 135000, changePercent: 0, price: 0 },
      { symbol: 'AXP', name: 'Amex', marketCap: 145000, changePercent: 0, price: 0 },
      { symbol: 'BLK', name: 'BlackRock', marketCap: 120000, changePercent: 0, price: 0 },
      { symbol: 'C', name: 'Citigroup', marketCap: 95000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: 'INDUSTRIALS',
    stocks: [
      { symbol: 'CAT', name: 'Caterpillar', marketCap: 180000, changePercent: 0, price: 0 },
      { symbol: 'BA', name: 'Boeing', marketCap: 120000, changePercent: 0, price: 0 },
      { symbol: 'GE', name: 'GE Aerospace', marketCap: 180000, changePercent: 0, price: 0 },
      { symbol: 'RTX', name: 'RTX Corp', marketCap: 150000, changePercent: 0, price: 0 },
      { symbol: 'HON', name: 'Honeywell', marketCap: 140000, changePercent: 0, price: 0 },
      { symbol: 'UPS', name: 'UPS', marketCap: 100000, changePercent: 0, price: 0 },
      { symbol: 'LMT', name: 'Lockheed Martin', marketCap: 115000, changePercent: 0, price: 0 },
      { symbol: 'DE', name: 'Deere', marketCap: 105000, changePercent: 0, price: 0 },
      { symbol: 'UNP', name: 'Union Pacific', marketCap: 130000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: 'CONSUMER DEFENSIVE',
    stocks: [
      { symbol: 'WMT', name: 'Walmart', marketCap: 450000, changePercent: 0, price: 0 },
      { symbol: 'KO', name: 'Coca-Cola', marketCap: 280000, changePercent: 0, price: 0 },
      { symbol: 'PG', name: 'P&G', marketCap: 350000, changePercent: 0, price: 0 },
      { symbol: 'COST', name: 'Costco', marketCap: 350000, changePercent: 0, price: 0 },
      { symbol: 'PEP', name: 'PepsiCo', marketCap: 250000, changePercent: 0, price: 0 },
      { symbol: 'PM', name: 'Philip Morris', marketCap: 145000, changePercent: 0, price: 0 },
      { symbol: 'MDLZ', name: 'Mondelez', marketCap: 85000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: 'ENERGY',
    stocks: [
      { symbol: 'XOM', name: 'Exxon Mobil', marketCap: 450000, changePercent: 0, price: 0 },
      { symbol: 'CVX', name: 'Chevron', marketCap: 280000, changePercent: 0, price: 0 },
      { symbol: 'COP', name: 'ConocoPhillips', marketCap: 130000, changePercent: 0, price: 0 },
      { symbol: 'SLB', name: 'Schlumberger', marketCap: 65000, changePercent: 0, price: 0 },
      { symbol: 'EOG', name: 'EOG Resources', marketCap: 70000, changePercent: 0, price: 0 },
      { symbol: 'OXY', name: 'Occidental', marketCap: 45000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: 'UTILITIES',
    stocks: [
      { symbol: 'NEE', name: 'NextEra Energy', marketCap: 145000, changePercent: 0, price: 0 },
      { symbol: 'DUK', name: 'Duke Energy', marketCap: 75000, changePercent: 0, price: 0 },
      { symbol: 'SO', name: 'Southern Co', marketCap: 85000, changePercent: 0, price: 0 },
      { symbol: 'D', name: 'Dominion', marketCap: 45000, changePercent: 0, price: 0 },
      { symbol: 'AEP', name: 'AEP', marketCap: 55000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: 'REAL ESTATE',
    stocks: [
      { symbol: 'PLD', name: 'Prologis', marketCap: 105000, changePercent: 0, price: 0 },
      { symbol: 'AMT', name: 'American Tower', marketCap: 85000, changePercent: 0, price: 0 },
      { symbol: 'EQIX', name: 'Equinix', marketCap: 75000, changePercent: 0, price: 0 },
      { symbol: 'CCI', name: 'Crown Castle', marketCap: 45000, changePercent: 0, price: 0 },
      { symbol: 'SPG', name: 'Simon Property', marketCap: 55000, changePercent: 0, price: 0 },
    ],
  },
  {
    name: 'MATERIALS',
    stocks: [
      { symbol: 'LIN', name: 'Linde', marketCap: 185000, changePercent: 0, price: 0 },
      { symbol: 'APD', name: 'Air Products', marketCap: 55000, changePercent: 0, price: 0 },
      { symbol: 'SHW', name: 'Sherwin-Williams', marketCap: 75000, changePercent: 0, price: 0 },
      { symbol: 'FCX', name: 'Freeport-McMoRan', marketCap: 55000, changePercent: 0, price: 0 },
      { symbol: 'NEM', name: 'Newmont', marketCap: 45000, changePercent: 0, price: 0 },
    ],
  },
];

// ==================== 한국 종목명 축약 맵 ====================

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

// ==================== 유틸리티 함수 ====================

/** 한국 종목명 축약 */
function abbreviateKoreanName(name: string, maxLength: number): string {
  if (KOREAN_NAME_ABBREVIATIONS[name]) {
    const abbreviated = KOREAN_NAME_ABBREVIATIONS[name];
    return abbreviated.length <= maxLength ? abbreviated : abbreviated.slice(0, maxLength);
  }
  return name.length > maxLength ? name.slice(0, maxLength) : name;
}

/** Finviz 색상 반환 */
function getHeatmapColor(changePercent: number): string {
  const absChange = Math.abs(changePercent);

  // 보합 (±0.1% 미만)
  if (absChange < 0.1) return '#374151';

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

/** 등락률 포맷팅 */
function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/** 가격 포맷팅 */
function formatPrice(value: number, isKorean: boolean): string {
  if (value === 0) return '-';
  if (isKorean) return `₩${value.toLocaleString()}`;
  return `$${value.toFixed(2)}`;
}

/** 시가총액 포맷팅 */
function formatMarketCap(value: number, isKorean: boolean): string {
  if (isKorean) {
    if (value >= 10000) return `${(value / 10000).toFixed(1)}조`;
    return `${value.toLocaleString()}억`;
  } else {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}T`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}B`;
    return `$${value}M`;
  }
}

// ==================== 데이터 변환 함수 ====================

/** 섹터 데이터에 실시간 데이터 병합 */
function mergeSectorsWithRealTimeData(
  sectors: SectorData[],
  realTimeData: RealTimeDataMap
): SectorData[] {
  return sectors.map((sector) => ({
    ...sector,
    stocks: sector.stocks.map((stock) => {
      const liveData = realTimeData[stock.symbol];
      return {
        ...stock,
        price: liveData?.price ?? stock.price,
        changePercent: liveData?.changePercent ?? stock.changePercent,
      };
    }),
  }));
}

/** Treemap 형식으로 변환 */
function convertToTreemapData(sectors: SectorData[], isKorean: boolean): TreemapNode {
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

function CustomLabelsLayer({ nodes }: { nodes: ComputedNode<TreemapNode>[] }) {
  return (
    <g>
      {nodes.map((node) => {
        // 섹터 라벨
        if (node.pathComponents.length === 2) {
          if (node.width < 60 || node.height < 30) return null;
          const sectorName = String(node.id);
          return (
            <g key={`sector-${node.id}`}>
              <rect
                x={node.x + 3}
                y={node.y + 3}
                width={Math.min(sectorName.length * 8 + 12, node.width - 6)}
                height={18}
                rx={3}
                fill="rgba(0, 0, 0, 0.6)"
              />
              <text
                x={node.x + 9}
                y={node.y + 15}
                style={{
                  fill: '#e5e7eb',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textTransform: 'uppercase',
                  pointerEvents: 'none',
                }}
              >
                {sectorName.toUpperCase()}
              </text>
            </g>
          );
        }

        // 종목 라벨
        if (node.pathComponents.length !== 3) return null;

        const { width, height } = node;
        const minDimension = Math.min(width, height);
        if (minDimension < 50) return null;

        const fullName = node.data.name || String(node.id);
        const symbol = node.data.symbol || String(node.id);
        const change = node.data.change ?? 0;
        const isKoreanStock = /^\d+$/.test(symbol);

        let displayName: string;
        let nameFontSize: number;
        let changeFontSize: number;

        if (minDimension >= 150) {
          nameFontSize = 14;
          changeFontSize = 12;
          displayName = isKoreanStock ? abbreviateKoreanName(fullName, 8) : fullName.slice(0, 10);
        } else if (minDimension >= 80) {
          nameFontSize = 11;
          changeFontSize = 10;
          displayName = isKoreanStock ? abbreviateKoreanName(fullName, 5) : (fullName.length <= 6 ? fullName : symbol);
        } else {
          nameFontSize = 10;
          changeFontSize = 9;
          displayName = isKoreanStock ? abbreviateKoreanName(fullName, 3) : symbol;
        }

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
                fontFamily: 'system-ui, -apple-system, sans-serif',
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
                fontFamily: 'system-ui, -apple-system, sans-serif',
                pointerEvents: 'none',
              }}
            >
              {formatPercent(change)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ==================== 로딩 스켈레톤 ====================

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
        </div>
      </div>
    </div>
  );
}

// ==================== 모바일 리스트 뷰 ====================

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
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sectors.map((sector) => (
        <div key={sector.name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-600">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
              {sector.name}
              <span className="ml-2 text-xs text-gray-500 font-normal">({sector.stocks.length})</span>
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
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{stock.name}</div>
                    <div className="text-xs text-gray-500">{stock.symbol}</div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                      {formatPrice(stock.price, isKorean)}
                    </div>
                    <div className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
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
  country: MarketRegion;
}

export function HeatmapContent({ country }: HeatmapContentProps) {
  const router = useRouter();
  const isKorean = country === 'kr';

  // 실시간 데이터 상태
  const [realTimeData, setRealTimeData] = useState<RealTimeDataMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ========================================
  // 실시간 데이터 페칭
  // ========================================
  const fetchRealTimeData = useCallback(async () => {
    setError(null);

    try {
      if (isKorean) {
        // 한국 시장: 시가총액 순위 API 사용
        const response = await fetch('/api/kis/ranking/market-cap?market=all');
        const result = await response.json();

        if (response.ok && Array.isArray(result)) {
          const dataMap: RealTimeDataMap = {};
          result.forEach((stock: { symbol: string; currentPrice: number; changePercent: number }) => {
            dataMap[stock.symbol] = {
              price: stock.currentPrice,
              changePercent: stock.changePercent,
            };
          });
          setRealTimeData(dataMap);
        }
      } else {
        // 미국 시장: 개별 종목 시세 API 사용
        const response = await fetch('/api/kis/overseas/stock/prices?sector=all');
        const result = await response.json();

        if (response.ok && result.data) {
          const dataMap: RealTimeDataMap = {};
          result.data.forEach((stock: { symbol: string; currentPrice: number; changePercent: number }) => {
            dataMap[stock.symbol] = {
              price: stock.currentPrice,
              changePercent: stock.changePercent,
            };
          });
          setRealTimeData(dataMap);
        }
      }
    } catch (err) {
      console.error('[HeatmapContent] 데이터 페칭 에러:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [isKorean]);

  // 초기 로드 + 60초마다 자동 새로고침
  useEffect(() => {
    fetchRealTimeData();
    const interval = setInterval(fetchRealTimeData, 60000);
    return () => clearInterval(interval);
  }, [fetchRealTimeData]);

  // ========================================
  // 섹터 데이터에 실시간 데이터 병합
  // ========================================
  const baseSectors = isKorean ? KOREA_SECTORS : US_SECTORS;
  const sectors = useMemo(
    () => mergeSectorsWithRealTimeData(baseSectors, realTimeData),
    [baseSectors, realTimeData]
  );

  // Treemap 데이터 변환
  const treemapData = useMemo(
    () => convertToTreemapData(sectors, isKorean),
    [sectors, isKorean]
  );

  // 총 종목 수
  const totalStocks = useMemo(
    () => sectors.reduce((sum, sector) => sum + sector.stocks.length, 0),
    [sectors]
  );

  // 종목 클릭 핸들러
  const handleStockClick = useCallback(
    (symbol: string) => {
      router.push(`/market/${symbol}`);
    },
    [router]
  );

  // 일본/홍콩 미지원
  if (country === 'jp' || country === 'hk') {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">🚧</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">준비 중입니다</h3>
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
            ({sectors.length}개 섹터, {totalStocks}개 종목)
          </span>
          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            실시간
          </span>
        </h2>
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

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        박스 크기는 시가총액, 색상 강도는 등락률을 나타냅니다. 클릭하면 상세 페이지로 이동합니다.
      </p>

      {/* 데스크톱: Treemap */}
      <div className="hidden md:block">
        {isLoading && <HeatmapSkeleton />}

        {!isLoading && error && (
          <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 p-8 text-center" style={{ height: '700px' }}>
            <div className="h-full flex items-center justify-center">
              <div>
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  onClick={fetchRealTimeData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  다시 시도
                </button>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700" style={{ height: '700px' }}>
              <ResponsiveTreeMap
                data={treemapData}
                identity="id"
                value="value"
                tile="squarify"
                leavesOnly={false}
                innerPadding={1}
                outerPadding={3}
                colors={(node) => {
                  if (node.pathComponents.length === 1) return '#000000';
                  if (node.pathComponents.length === 2) return '#111827';
                  return getHeatmapColor(node.data.change ?? 0);
                }}
                borderWidth={1}
                borderColor={(node) => (node.pathComponents.length === 2 ? '#000000' : 'rgba(0, 0, 0, 0.4)')}
                enableLabel={false}
                enableParentLabel={false}
                tooltip={({ node }) => {
                  if (node.pathComponents.length === 2) return null;
                  const change = node.data.change ?? 0;
                  const price = node.data.price ?? 0;
                  const symbol = node.data.symbol ?? node.id;
                  const sector = node.pathComponents[1] ?? '';

                  return (
                    <div className="bg-gray-900 text-white rounded-lg shadow-xl border border-gray-600 p-3 min-w-[220px]">
                      <div className="font-bold text-base mb-2 border-b border-gray-700 pb-2">
                        {node.data.name}
                        <span className="text-gray-400 ml-2 font-normal text-xs">{symbol}</span>
                      </div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-400 text-xs">현재가</span>
                        <span className="font-semibold text-sm">{formatPrice(price, isKorean)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-400 text-xs">등락률</span>
                        <span className={`font-bold text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPercent(change)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-gray-400 text-xs">시가총액</span>
                        <span className="font-semibold text-sm">{formatMarketCap(node.value, isKorean)}</span>
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
