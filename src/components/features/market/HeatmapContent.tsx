'use client';

/**
 * HeatmapContent 컴포넌트
 *
 * Finviz 스타일의 전체 통합 Treemap 히트맵을 표시합니다.
 *
 * ============================================================
 * 핵심 기능:
 * ============================================================
 * 1. 하나의 큰 Treemap으로 모든 섹터/종목 표시 (Finviz 스타일)
 * 2. 종목명 표시 (종목 코드가 아닌 이름)
 * 3. 시가총액 기준 박스 크기 (Treemap 알고리즘)
 * 4. 등락률 기준 색상 (한국: 빨강=상승, 미국: 초록=상승)
 * 5. 100개+ 종목으로 빽빽하게 채우기
 * 6. 호버 시 상세 툴팁 표시
 * 7. 종목 클릭 시 상세 페이지 이동
 *
 * ============================================================
 * Finviz 스타일 레이아웃:
 * ============================================================
 * ┌─────────────────────────────────────────────────────────────┐
 * │ TECHNOLOGY           │ CONSUMER CYCLICAL    │ FINANCIAL    │
 * │ ┌────────┬──────────┐│ ┌───────┬──────────┐│ ┌──────────┐ │
 * │ │Microsoft│  NVIDIA │││ │Amazon │  Tesla   ││ │ JPMorgan │ │
 * │ │ +1.2%  │  +3.5%   │││ │ +2.1% │  -0.5%   ││ │  +0.8%   │ │
 * │ ├────────┼────┬─────┤│ ├───────┼────┬─────┤│ ├────┬─────┤ │
 * │ │Broadcom│AMD │Intel│││ │  HD   │MCD │ NKE ││ │Visa│ MA  │ │
 * │ └────────┴────┴─────┘│ └───────┴────┴─────┘│ └────┴─────┘ │
 * └─────────────────────────────────────────────────────────────┘
 *
 * ============================================================
 * 색상 규칙:
 * ============================================================
 * 한국 스타일: 상승=빨강(#dc2626~#fca5a5), 하락=파랑(#2563eb~#93c5fd)
 * 미국 스타일: 상승=초록(#16a34a~#86efac), 하락=빨강(#dc2626~#fca5a5)
 */

import { useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveTreeMap } from '@nivo/treemap';
import type { MarketRegion } from '@/types';

// ==================== 타입 정의 ====================

/** 개별 종목 데이터 */
interface StockData {
  symbol: string;        // 티커 심볼 (예: '005930', 'AAPL')
  name: string;          // 종목명 (예: '삼성전자', 'Apple')
  marketCap: number;     // 시가총액 (억원 또는 백만달러)
  changePercent: number; // 등락률 (예: 1.2, -0.5)
  price: number;         // 현재가 (원 또는 달러)
}

/** 섹터 데이터 */
interface SectorData {
  name: string;          // 섹터명 (예: '반도체', 'TECHNOLOGY')
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

// ==================== 한국 시장 섹터 데이터 (100개+ 종목) ====================

const KOREA_SECTORS: SectorData[] = [
  {
    name: '반도체',
    stocks: [
      { symbol: '005930', name: '삼성전자', marketCap: 3500000, changePercent: 1.2, price: 58000 },
      { symbol: '000660', name: 'SK하이닉스', marketCap: 1100000, changePercent: 2.5, price: 150000 },
      { symbol: '402340', name: 'SK스퀘어', marketCap: 120000, changePercent: -0.8, price: 85000 },
      { symbol: '042700', name: '한미반도체', marketCap: 95000, changePercent: 3.2, price: 128000 },
      { symbol: '067160', name: '아프리카TV', marketCap: 15000, changePercent: 1.5, price: 95000 },
      { symbol: '166090', name: '하나머티리얼즈', marketCap: 18000, changePercent: -1.2, price: 52000 },
      { symbol: '036830', name: '솔브레인홀딩스', marketCap: 12000, changePercent: 0.8, price: 35000 },
      { symbol: '058470', name: '리노공업', marketCap: 45000, changePercent: 2.1, price: 285000 },
      { symbol: '357780', name: '솔브레인', marketCap: 28000, changePercent: -0.5, price: 265000 },
      { symbol: '240810', name: '원익IPS', marketCap: 22000, changePercent: 1.8, price: 32000 },
      { symbol: '039030', name: '이오테크닉스', marketCap: 35000, changePercent: -2.1, price: 180000 },
    ],
  },
  {
    name: '자동차',
    stocks: [
      { symbol: '005380', name: '현대차', marketCap: 450000, changePercent: 0.5, price: 210000 },
      { symbol: '000270', name: '기아', marketCap: 380000, changePercent: 1.8, price: 95000 },
      { symbol: '012330', name: '현대모비스', marketCap: 180000, changePercent: -1.2, price: 190000 },
      { symbol: '018880', name: '한온시스템', marketCap: 35000, changePercent: -2.5, price: 6500 },
      { symbol: '204320', name: '만도', marketCap: 28000, changePercent: 1.5, price: 42000 },
      { symbol: '011210', name: '현대위아', marketCap: 22000, changePercent: 0.8, price: 52000 },
      { symbol: '009900', name: '명신산업', marketCap: 12000, changePercent: 3.2, price: 28000 },
      { symbol: '014680', name: '한솔케미칼', marketCap: 15000, changePercent: -0.5, price: 95000 },
    ],
  },
  {
    name: '금융',
    stocks: [
      { symbol: '105560', name: 'KB금융', marketCap: 280000, changePercent: 0.3, price: 68000 },
      { symbol: '055550', name: '신한지주', marketCap: 200000, changePercent: -0.5, price: 42000 },
      { symbol: '086790', name: '하나금융', marketCap: 150000, changePercent: 0.8, price: 52000 },
      { symbol: '000810', name: '삼성화재', marketCap: 140000, changePercent: 1.5, price: 295000 },
      { symbol: '316140', name: '우리금융', marketCap: 100000, changePercent: -0.2, price: 14000 },
      { symbol: '032830', name: '삼성생명', marketCap: 120000, changePercent: 0.5, price: 85000 },
      { symbol: '006800', name: '미래에셋증권', marketCap: 55000, changePercent: 1.2, price: 7800 },
      { symbol: '039490', name: '키움증권', marketCap: 45000, changePercent: -1.8, price: 115000 },
      { symbol: '024110', name: '기업은행', marketCap: 80000, changePercent: 0.5, price: 12000 },
      { symbol: '175330', name: 'JB금융', marketCap: 25000, changePercent: 2.1, price: 12500 },
    ],
  },
  {
    name: '바이오',
    stocks: [
      { symbol: '207940', name: '삼성바이오', marketCap: 600000, changePercent: -2.1, price: 850000 },
      { symbol: '068270', name: '셀트리온', marketCap: 250000, changePercent: 1.2, price: 180000 },
      { symbol: '000100', name: '유한양행', marketCap: 80000, changePercent: 0.5, price: 120000 },
      { symbol: '326030', name: 'SK바이오팜', marketCap: 70000, changePercent: 3.2, price: 95000 },
      { symbol: '091990', name: '셀트리온헬스케어', marketCap: 55000, changePercent: -0.8, price: 68000 },
      { symbol: '128940', name: '한미약품', marketCap: 45000, changePercent: 1.5, price: 295000 },
      { symbol: '006280', name: '녹십자', marketCap: 35000, changePercent: -1.2, price: 125000 },
      { symbol: '302440', name: 'SK바이오사이언스', marketCap: 28000, changePercent: 2.8, price: 52000 },
      { symbol: '141080', name: '레고켐바이오', marketCap: 22000, changePercent: 4.5, price: 65000 },
      { symbol: '145720', name: '덴티움', marketCap: 18000, changePercent: -0.5, price: 165000 },
    ],
  },
  {
    name: 'IT/인터넷',
    stocks: [
      { symbol: '035420', name: 'NAVER', marketCap: 350000, changePercent: -0.8, price: 215000 },
      { symbol: '035720', name: '카카오', marketCap: 220000, changePercent: 0.3, price: 50000 },
      { symbol: '259960', name: '크래프톤', marketCap: 150000, changePercent: 2.1, price: 320000 },
      { symbol: '263750', name: '펄어비스', marketCap: 30000, changePercent: -1.5, price: 45000 },
      { symbol: '036570', name: '엔씨소프트', marketCap: 85000, changePercent: -2.3, price: 185000 },
      { symbol: '251270', name: '넷마블', marketCap: 45000, changePercent: 0.8, price: 52000 },
      { symbol: '293490', name: '카카오게임즈', marketCap: 22000, changePercent: 1.5, price: 18000 },
      { symbol: '112040', name: '위메이드', marketCap: 18000, changePercent: 3.8, price: 42000 },
    ],
  },
  {
    name: '2차전지',
    stocks: [
      { symbol: '373220', name: 'LG에너지솔루션', marketCap: 900000, changePercent: -1.5, price: 380000 },
      { symbol: '006400', name: '삼성SDI', marketCap: 350000, changePercent: 0.8, price: 510000 },
      { symbol: '247540', name: '에코프로비엠', marketCap: 150000, changePercent: 4.2, price: 160000 },
      { symbol: '086520', name: '에코프로', marketCap: 100000, changePercent: 5.1, price: 75000 },
      { symbol: '096770', name: 'SK이노베이션', marketCap: 120000, changePercent: -2.1, price: 128000 },
      { symbol: '003670', name: '포스코퓨처엠', marketCap: 95000, changePercent: 2.5, price: 195000 },
      { symbol: '006260', name: 'LS', marketCap: 55000, changePercent: 1.2, price: 95000 },
      { symbol: '064350', name: '현대로템', marketCap: 45000, changePercent: 3.5, price: 42000 },
    ],
  },
  {
    name: '화학',
    stocks: [
      { symbol: '051910', name: 'LG화학', marketCap: 280000, changePercent: -0.5, price: 400000 },
      { symbol: '011170', name: '롯데케미칼', marketCap: 50000, changePercent: -2.3, price: 145000 },
      { symbol: '010950', name: 'S-Oil', marketCap: 60000, changePercent: 0.2, price: 52000 },
      { symbol: '011780', name: '금호석유', marketCap: 35000, changePercent: 1.5, price: 128000 },
      { symbol: '285130', name: 'SK케미칼', marketCap: 28000, changePercent: -1.2, price: 68000 },
      { symbol: '009830', name: '한화솔루션', marketCap: 45000, changePercent: 2.1, price: 28000 },
    ],
  },
  {
    name: '철강/조선',
    stocks: [
      { symbol: '005490', name: 'POSCO홀딩스', marketCap: 280000, changePercent: 1.8, price: 330000 },
      { symbol: '009540', name: 'HD한국조선', marketCap: 150000, changePercent: 3.5, price: 180000 },
      { symbol: '010140', name: '삼성중공업', marketCap: 80000, changePercent: 2.8, price: 12000 },
      { symbol: '042660', name: '한화오션', marketCap: 100000, changePercent: 4.2, price: 45000 },
      { symbol: '004020', name: '현대제철', marketCap: 55000, changePercent: -0.5, price: 32000 },
      { symbol: '001230', name: '동국제강', marketCap: 18000, changePercent: 1.2, price: 12500 },
      { symbol: '267250', name: 'HD현대', marketCap: 85000, changePercent: 0.8, price: 72000 },
      { symbol: '329180', name: 'HD현대중공업', marketCap: 120000, changePercent: 2.5, price: 165000 },
    ],
  },
  {
    name: '방산',
    stocks: [
      { symbol: '012450', name: '한화에어로스페이스', marketCap: 200000, changePercent: 2.5, price: 380000 },
      { symbol: '079550', name: 'LIG넥스원', marketCap: 50000, changePercent: 1.8, price: 180000 },
      { symbol: '047810', name: '한국항공우주', marketCap: 80000, changePercent: 3.2, price: 62000 },
      { symbol: '272210', name: '한화시스템', marketCap: 55000, changePercent: 1.5, price: 18500 },
      { symbol: '064350', name: '현대로템', marketCap: 45000, changePercent: 4.1, price: 42000 },
      { symbol: '000880', name: '한화', marketCap: 35000, changePercent: 0.8, price: 32000 },
    ],
  },
  {
    name: '통신/유틸',
    stocks: [
      { symbol: '017670', name: 'SK텔레콤', marketCap: 130000, changePercent: 0.2, price: 52000 },
      { symbol: '030200', name: 'KT', marketCap: 80000, changePercent: -0.3, price: 38000 },
      { symbol: '032640', name: 'LG유플러스', marketCap: 50000, changePercent: 0.5, price: 11500 },
      { symbol: '015760', name: '한국전력', marketCap: 120000, changePercent: -1.2, price: 18500 },
      { symbol: '034730', name: 'SK', marketCap: 95000, changePercent: 0.8, price: 165000 },
    ],
  },
  {
    name: '엔터/미디어',
    stocks: [
      { symbol: '352820', name: '하이브', marketCap: 100000, changePercent: -2.5, price: 240000 },
      { symbol: '035900', name: 'JYP Ent.', marketCap: 30000, changePercent: 1.2, price: 85000 },
      { symbol: '041510', name: 'SM', marketCap: 20000, changePercent: 0.8, price: 82000 },
      { symbol: '122870', name: 'YG엔터테인먼트', marketCap: 15000, changePercent: -1.5, price: 52000 },
      { symbol: '357120', name: '카카오엔터', marketCap: 18000, changePercent: 2.1, price: 35000 },
    ],
  },
  {
    name: '유통/소비재',
    stocks: [
      { symbol: '004170', name: '신세계', marketCap: 25000, changePercent: -0.8, price: 130000 },
      { symbol: '023530', name: '롯데쇼핑', marketCap: 15000, changePercent: -1.5, price: 80000 },
      { symbol: '139480', name: '이마트', marketCap: 30000, changePercent: 0.3, price: 60000 },
      { symbol: '051900', name: 'LG생활건강', marketCap: 80000, changePercent: -0.5, price: 280000 },
      { symbol: '090430', name: '아모레퍼시픽', marketCap: 55000, changePercent: 1.2, price: 115000 },
      { symbol: '097950', name: 'CJ제일제당', marketCap: 45000, changePercent: 0.5, price: 295000 },
      { symbol: '069960', name: '현대백화점', marketCap: 22000, changePercent: -0.8, price: 58000 },
      { symbol: '006800', name: '오리온', marketCap: 35000, changePercent: 1.8, price: 95000 },
    ],
  },
  {
    name: '건설',
    stocks: [
      { symbol: '028260', name: '삼성물산', marketCap: 250000, changePercent: 0.5, price: 165000 },
      { symbol: '000720', name: '현대건설', marketCap: 55000, changePercent: -1.2, price: 32000 },
      { symbol: '006360', name: 'GS건설', marketCap: 28000, changePercent: 0.8, price: 18500 },
      { symbol: '047040', name: '대우건설', marketCap: 22000, changePercent: 1.5, price: 4200 },
      { symbol: '000210', name: 'DL', marketCap: 18000, changePercent: -0.5, price: 52000 },
      { symbol: '034020', name: '두산에너빌리티', marketCap: 85000, changePercent: 2.8, price: 18500 },
    ],
  },
];

// ==================== 미국 시장 섹터 데이터 (100개+ 종목) ====================

const US_SECTORS: SectorData[] = [
  {
    name: 'TECHNOLOGY',
    stocks: [
      { symbol: 'AAPL', name: 'Apple', marketCap: 3000000, changePercent: -0.1, price: 195.5 },
      { symbol: 'MSFT', name: 'Microsoft', marketCap: 2800000, changePercent: 1.2, price: 378.2 },
      { symbol: 'NVDA', name: 'NVIDIA', marketCap: 1200000, changePercent: 3.5, price: 495.8 },
      { symbol: 'AVGO', name: 'Broadcom', marketCap: 600000, changePercent: 2.1, price: 1250.3 },
      { symbol: 'AMD', name: 'AMD', marketCap: 200000, changePercent: -1.8, price: 125.4 },
      { symbol: 'INTC', name: 'Intel', marketCap: 100000, changePercent: -3.2, price: 24.5 },
      { symbol: 'CRM', name: 'Salesforce', marketCap: 250000, changePercent: 0.8, price: 265.2 },
      { symbol: 'ORCL', name: 'Oracle', marketCap: 350000, changePercent: 1.5, price: 128.4 },
      { symbol: 'ADBE', name: 'Adobe', marketCap: 220000, changePercent: -0.5, price: 485.2 },
      { symbol: 'CSCO', name: 'Cisco', marketCap: 180000, changePercent: 0.3, price: 45.8 },
      { symbol: 'ACN', name: 'Accenture', marketCap: 185000, changePercent: 0.8, price: 295.4 },
      { symbol: 'IBM', name: 'IBM', marketCap: 165000, changePercent: 1.2, price: 185.6 },
      { symbol: 'NOW', name: 'ServiceNow', marketCap: 150000, changePercent: 2.5, price: 785.2 },
      { symbol: 'QCOM', name: 'Qualcomm', marketCap: 145000, changePercent: -1.2, price: 125.8 },
      { symbol: 'TXN', name: 'Texas Instruments', marketCap: 140000, changePercent: 0.5, price: 165.4 },
    ],
  },
  {
    name: 'CONSUMER CYCLICAL',
    stocks: [
      { symbol: 'AMZN', name: 'Amazon', marketCap: 1500000, changePercent: 0.5, price: 145.2 },
      { symbol: 'TSLA', name: 'Tesla', marketCap: 800000, changePercent: -2.3, price: 252.8 },
      { symbol: 'HD', name: 'Home Depot', marketCap: 350000, changePercent: 0.8, price: 345.6 },
      { symbol: 'MCD', name: "McDonald's", marketCap: 200000, changePercent: 0.3, price: 278.4 },
      { symbol: 'NKE', name: 'Nike', marketCap: 150000, changePercent: -1.5, price: 98.2 },
      { symbol: 'SBUX', name: 'Starbucks', marketCap: 100000, changePercent: -0.8, price: 92.5 },
      { symbol: 'LOW', name: "Lowe's", marketCap: 120000, changePercent: 1.2, price: 215.8 },
      { symbol: 'TJX', name: 'TJX', marketCap: 95000, changePercent: 0.5, price: 98.5 },
      { symbol: 'BKNG', name: 'Booking', marketCap: 110000, changePercent: 1.8, price: 3650.2 },
      { symbol: 'CMG', name: 'Chipotle', marketCap: 75000, changePercent: 2.1, price: 2850.5 },
    ],
  },
  {
    name: 'COMMUNICATION',
    stocks: [
      { symbol: 'GOOGL', name: 'Alphabet', marketCap: 1800000, changePercent: 0.8, price: 142.5 },
      { symbol: 'META', name: 'Meta', marketCap: 1000000, changePercent: 1.5, price: 395.2 },
      { symbol: 'NFLX', name: 'Netflix', marketCap: 250000, changePercent: 2.1, price: 575.8 },
      { symbol: 'DIS', name: 'Disney', marketCap: 180000, changePercent: -0.5, price: 98.4 },
      { symbol: 'T', name: 'AT&T', marketCap: 120000, changePercent: 0.2, price: 16.8 },
      { symbol: 'VZ', name: 'Verizon', marketCap: 150000, changePercent: -0.3, price: 35.6 },
      { symbol: 'TMUS', name: 'T-Mobile', marketCap: 185000, changePercent: 0.8, price: 165.2 },
      { symbol: 'CMCSA', name: 'Comcast', marketCap: 145000, changePercent: -0.5, price: 38.5 },
      { symbol: 'CHTR', name: 'Charter', marketCap: 45000, changePercent: 1.2, price: 285.4 },
      { symbol: 'SPOT', name: 'Spotify', marketCap: 55000, changePercent: 3.2, price: 285.8 },
    ],
  },
  {
    name: 'HEALTHCARE',
    stocks: [
      { symbol: 'LLY', name: 'Eli Lilly', marketCap: 700000, changePercent: 1.8, price: 780.5 },
      { symbol: 'UNH', name: 'UnitedHealth', marketCap: 500000, changePercent: -0.5, price: 525.2 },
      { symbol: 'JNJ', name: 'J&J', marketCap: 400000, changePercent: 0.3, price: 165.8 },
      { symbol: 'PFE', name: 'Pfizer', marketCap: 150000, changePercent: -1.2, price: 26.4 },
      { symbol: 'MRK', name: 'Merck', marketCap: 300000, changePercent: 0.8, price: 118.2 },
      { symbol: 'ABBV', name: 'AbbVie', marketCap: 280000, changePercent: 0.5, price: 158.4 },
      { symbol: 'TMO', name: 'Thermo Fisher', marketCap: 200000, changePercent: 1.2, price: 485.6 },
      { symbol: 'ABT', name: 'Abbott', marketCap: 180000, changePercent: 0.3, price: 105.2 },
      { symbol: 'DHR', name: 'Danaher', marketCap: 165000, changePercent: -0.8, price: 225.4 },
      { symbol: 'BMY', name: 'Bristol-Myers', marketCap: 95000, changePercent: 1.5, price: 45.8 },
      { symbol: 'AMGN', name: 'Amgen', marketCap: 145000, changePercent: -0.3, price: 265.2 },
      { symbol: 'GILD', name: 'Gilead', marketCap: 85000, changePercent: 0.8, price: 68.5 },
    ],
  },
  {
    name: 'FINANCIAL',
    stocks: [
      { symbol: 'JPM', name: 'JPMorgan', marketCap: 500000, changePercent: 0.8, price: 175.2 },
      { symbol: 'V', name: 'Visa', marketCap: 450000, changePercent: 0.5, price: 265.4 },
      { symbol: 'MA', name: 'Mastercard', marketCap: 400000, changePercent: 0.6, price: 428.6 },
      { symbol: 'BAC', name: 'Bank of America', marketCap: 280000, changePercent: -0.3, price: 35.8 },
      { symbol: 'WFC', name: 'Wells Fargo', marketCap: 180000, changePercent: 0.2, price: 48.5 },
      { symbol: 'GS', name: 'Goldman Sachs', marketCap: 150000, changePercent: 1.2, price: 458.2 },
      { symbol: 'MS', name: 'Morgan Stanley', marketCap: 135000, changePercent: 0.8, price: 85.4 },
      { symbol: 'AXP', name: 'Amex', marketCap: 145000, changePercent: 1.5, price: 185.6 },
      { symbol: 'BLK', name: 'BlackRock', marketCap: 120000, changePercent: 0.5, price: 785.2 },
      { symbol: 'C', name: 'Citigroup', marketCap: 95000, changePercent: -0.5, price: 52.4 },
      { symbol: 'SCHW', name: 'Schwab', marketCap: 110000, changePercent: 1.8, price: 62.5 },
      { symbol: 'SPGI', name: 'S&P Global', marketCap: 125000, changePercent: 0.8, price: 425.8 },
    ],
  },
  {
    name: 'INDUSTRIALS',
    stocks: [
      { symbol: 'CAT', name: 'Caterpillar', marketCap: 180000, changePercent: 0.8, price: 365.4 },
      { symbol: 'BA', name: 'Boeing', marketCap: 120000, changePercent: -2.5, price: 195.2 },
      { symbol: 'GE', name: 'GE Aerospace', marketCap: 180000, changePercent: 1.5, price: 165.8 },
      { symbol: 'RTX', name: 'RTX Corp', marketCap: 150000, changePercent: 0.3, price: 112.4 },
      { symbol: 'HON', name: 'Honeywell', marketCap: 140000, changePercent: -0.5, price: 215.6 },
      { symbol: 'UPS', name: 'UPS', marketCap: 100000, changePercent: -1.2, price: 125.8 },
      { symbol: 'LMT', name: 'Lockheed Martin', marketCap: 115000, changePercent: 0.8, price: 485.2 },
      { symbol: 'DE', name: 'Deere', marketCap: 105000, changePercent: 1.2, price: 395.6 },
      { symbol: 'UNP', name: 'Union Pacific', marketCap: 130000, changePercent: 0.5, price: 215.4 },
      { symbol: 'ADP', name: 'ADP', marketCap: 95000, changePercent: 0.3, price: 245.8 },
    ],
  },
  {
    name: 'CONSUMER DEFENSIVE',
    stocks: [
      { symbol: 'WMT', name: 'Walmart', marketCap: 450000, changePercent: 0.5, price: 165.2 },
      { symbol: 'KO', name: 'Coca-Cola', marketCap: 280000, changePercent: 0.2, price: 65.4 },
      { symbol: 'PG', name: 'P&G', marketCap: 350000, changePercent: 0.3, price: 148.6 },
      { symbol: 'COST', name: 'Costco', marketCap: 350000, changePercent: 0.8, price: 785.4 },
      { symbol: 'PEP', name: 'PepsiCo', marketCap: 250000, changePercent: -0.2, price: 175.2 },
      { symbol: 'PM', name: 'Philip Morris', marketCap: 145000, changePercent: 0.5, price: 95.8 },
      { symbol: 'MO', name: 'Altria', marketCap: 75000, changePercent: 0.8, price: 42.5 },
      { symbol: 'MDLZ', name: 'Mondelez', marketCap: 85000, changePercent: 0.3, price: 65.2 },
    ],
  },
  {
    name: 'ENERGY',
    stocks: [
      { symbol: 'XOM', name: 'Exxon Mobil', marketCap: 450000, changePercent: -0.8, price: 108.5 },
      { symbol: 'CVX', name: 'Chevron', marketCap: 280000, changePercent: -1.2, price: 148.2 },
      { symbol: 'COP', name: 'ConocoPhillips', marketCap: 130000, changePercent: -0.5, price: 112.4 },
      { symbol: 'SLB', name: 'Schlumberger', marketCap: 65000, changePercent: 0.8, price: 45.2 },
      { symbol: 'EOG', name: 'EOG Resources', marketCap: 70000, changePercent: -0.3, price: 118.5 },
      { symbol: 'OXY', name: 'Occidental', marketCap: 45000, changePercent: 1.2, price: 52.8 },
    ],
  },
  {
    name: 'UTILITIES',
    stocks: [
      { symbol: 'NEE', name: 'NextEra Energy', marketCap: 145000, changePercent: 0.5, price: 72.5 },
      { symbol: 'DUK', name: 'Duke Energy', marketCap: 75000, changePercent: 0.3, price: 98.2 },
      { symbol: 'SO', name: 'Southern Co', marketCap: 85000, changePercent: 0.2, price: 78.5 },
      { symbol: 'D', name: 'Dominion', marketCap: 45000, changePercent: -0.5, price: 52.4 },
      { symbol: 'AEP', name: 'AEP', marketCap: 55000, changePercent: 0.8, price: 95.2 },
    ],
  },
  {
    name: 'REAL ESTATE',
    stocks: [
      { symbol: 'PLD', name: 'Prologis', marketCap: 105000, changePercent: 0.8, price: 115.4 },
      { symbol: 'AMT', name: 'American Tower', marketCap: 85000, changePercent: -0.3, price: 185.2 },
      { symbol: 'EQIX', name: 'Equinix', marketCap: 75000, changePercent: 1.2, price: 785.6 },
      { symbol: 'CCI', name: 'Crown Castle', marketCap: 45000, changePercent: 0.5, price: 98.5 },
      { symbol: 'SPG', name: 'Simon Property', marketCap: 55000, changePercent: -0.8, price: 145.2 },
    ],
  },
  {
    name: 'MATERIALS',
    stocks: [
      { symbol: 'LIN', name: 'Linde', marketCap: 185000, changePercent: 0.5, price: 385.4 },
      { symbol: 'APD', name: 'Air Products', marketCap: 55000, changePercent: -0.3, price: 245.8 },
      { symbol: 'SHW', name: 'Sherwin-Williams', marketCap: 75000, changePercent: 0.8, price: 285.6 },
      { symbol: 'FCX', name: 'Freeport-McMoRan', marketCap: 55000, changePercent: 2.1, price: 38.5 },
      { symbol: 'NEM', name: 'Newmont', marketCap: 45000, changePercent: 1.5, price: 42.8 },
      { symbol: 'ECL', name: 'Ecolab', marketCap: 50000, changePercent: 0.3, price: 185.2 },
    ],
  },
];

// ==================== 색상 함수 ====================

/**
 * 등락률에 따른 배경색 반환 (CSS RGB 색상)
 *
 * @param changePercent - 등락률
 * @param isKorean - 한국 시장 여부 (한국: 빨강=상승, 미국: 초록=상승)
 * @returns CSS RGB 색상 문자열
 */
function getHeatmapColor(changePercent: number, isKorean: boolean): string {
  const absChange = Math.abs(changePercent);

  // 보합 (±0.1% 미만) - 회색
  if (absChange < 0.1) {
    return '#6b7280'; // gray-500
  }

  // 색상 강도 계산 (0~1) - 최대 5%에서 최대 강도
  const intensity = Math.min(absChange / 5, 1);

  if (isKorean) {
    // 한국 스타일: 상승=빨강, 하락=파랑
    if (changePercent > 0) {
      // 빨강 (밝음 → 진함): #fca5a5 → #dc2626
      const r = Math.round(252 - intensity * (252 - 220));
      const g = Math.round(165 - intensity * (165 - 38));
      const b = Math.round(165 - intensity * (165 - 38));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // 파랑 (밝음 → 진함): #93c5fd → #2563eb
      const r = Math.round(147 - intensity * (147 - 37));
      const g = Math.round(197 - intensity * (197 - 99));
      const b = Math.round(253 - intensity * (253 - 235));
      return `rgb(${r}, ${g}, ${b})`;
    }
  } else {
    // 미국 스타일: 상승=초록, 하락=빨강
    if (changePercent > 0) {
      // 초록 (밝음 → 진함): #86efac → #16a34a
      const r = Math.round(134 - intensity * (134 - 22));
      const g = Math.round(239 - intensity * (239 - 163));
      const b = Math.round(172 - intensity * (172 - 74));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // 빨강 (밝음 → 진함): #fca5a5 → #dc2626
      const r = Math.round(252 - intensity * (252 - 220));
      const g = Math.round(165 - intensity * (165 - 38));
      const b = Math.round(165 - intensity * (165 - 38));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
}

// ==================== 포맷팅 함수 ====================

/** 등락률 포맷팅 (+1.2%, -0.5% 형식) */
function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
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
 * 섹터 데이터를 Nivo Treemap 형식으로 변환
 *
 * 구조:
 * {
 *   id: "root",
 *   name: "한국시장" | "미국시장",
 *   children: [
 *     {
 *       id: "반도체",
 *       name: "반도체",
 *       children: [
 *         { id: "005930", name: "삼성전자", value: 3500000, change: 1.2, ... },
 *         ...
 *       ]
 *     },
 *     ...
 *   ]
 * }
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

// ==================== 커스텀 툴팁 컴포넌트 ====================

interface CustomTooltipProps {
  tooltip: TooltipState;
  isKorean: boolean;
}

/**
 * 호버 시 표시되는 상세 툴팁
 *
 * 표시 정보:
 * - 종목명 (전체)
 * - 티커 심볼
 * - 현재가
 * - 등락률
 * - 시가총액
 * - 섹터
 */
function CustomTooltip({ tooltip, isKorean }: CustomTooltipProps) {
  if (!tooltip.show || !tooltip.data) return null;

  const { name, symbol, price, change, marketCap, sector } = tooltip.data;
  const isPositive = change >= 0;

  return (
    <div
      className="fixed z-50 pointer-events-none bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700 p-3 min-w-[200px]"
      style={{
        left: tooltip.x + 10,
        top: tooltip.y + 10,
      }}
    >
      {/* 종목명 + 심볼 */}
      <div className="font-bold text-sm mb-2">
        {name}
        <span className="text-gray-400 ml-2 font-normal text-xs">{symbol}</span>
      </div>

      {/* 현재가 + 등락률 */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-300 text-xs">현재가</span>
        <div className="text-right">
          <span className="font-semibold text-sm">
            {formatPrice(price, isKorean)}
          </span>
          <span
            className={`ml-2 text-xs font-medium ${
              isPositive
                ? isKorean
                  ? 'text-red-400'
                  : 'text-green-400'
                : isKorean
                  ? 'text-blue-400'
                  : 'text-red-400'
            }`}
          >
            {formatPercent(change)}
          </span>
        </div>
      </div>

      {/* 시가총액 */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-300 text-xs">시가총액</span>
        <span className="font-semibold text-sm">
          {formatMarketCap(marketCap, isKorean)}
        </span>
      </div>

      {/* 섹터 */}
      <div className="flex justify-between items-center">
        <span className="text-gray-300 text-xs">섹터</span>
        <span className="text-sm text-gray-200">{sector}</span>
      </div>
    </div>
  );
}

// ==================== 모바일 리스트 뷰 ====================

/**
 * 모바일 환경용 리스트 뷰
 *
 * Treemap은 모바일에서 인터랙션이 어렵기 때문에
 * 모바일에서는 리스트 형태로 표시
 */
function MobileListView({
  sectors,
  isKorean,
  onStockClick,
}: {
  sectors: SectorData[];
  isKorean: boolean;
  onStockClick: (symbol: string) => void;
}) {
  return (
    <div className="space-y-4">
      {sectors.map((sector) => (
        <div
          key={sector.name}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          {/* 섹터 헤더 */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-600">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
              {sector.name}
              <span className="ml-2 text-xs text-gray-500 font-normal">
                ({sector.stocks.length}개 종목)
              </span>
            </h4>
          </div>
          {/* 종목 리스트 */}
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
                        isPositive
                          ? isKorean
                            ? 'text-red-500'
                            : 'text-green-500'
                          : isKorean
                            ? 'text-blue-500'
                            : 'text-red-500'
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
 * 하나의 큰 Treemap으로 모든 섹터와 종목을 표시합니다.
 * 시가총액 기준 박스 크기, 등락률 기준 색상
 */
export function HeatmapContent({ country }: HeatmapContentProps) {
  const router = useRouter();
  const isKorean = country === 'kr';

  // 국가별 섹터 데이터 선택
  const sectors = isKorean ? KOREA_SECTORS : US_SECTORS;

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

  // 종목 클릭 핸들러 - 상세 페이지로 이동
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
        </h2>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div
              className={`w-3 h-3 rounded ${isKorean ? 'bg-red-500' : 'bg-green-500'}`}
            />
            <span className="text-gray-600 dark:text-gray-400">상승</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className={`w-3 h-3 rounded ${isKorean ? 'bg-blue-500' : 'bg-red-500'}`}
            />
            <span className="text-gray-600 dark:text-gray-400">하락</span>
          </div>
        </div>
      </div>

      {/* 설명 */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        박스 크기는 시가총액, 색상 강도는 등락률을 나타냅니다. 클릭하면 상세
        페이지로 이동합니다.
      </p>

      {/* 데스크톱: Finviz 스타일 Treemap */}
      <div className="hidden md:block">
        <div
          className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700"
          style={{ height: '700px' }}
        >
          <ResponsiveTreeMap
            data={treemapData}
            identity="id"
            value="value"
            // 부모 노드(섹터)와 리프 노드(종목) 설정
            tile="squarify"
            leavesOnly={false}
            innerPadding={2}
            outerPadding={4}
            // 색상 설정 - 등락률 기반
            // pathComponents.length로 depth 계산: 2=섹터, 3=종목
            colors={(node) => {
              // root 노드는 완전 투명 (보이지 않음)
              if (node.pathComponents.length === 1) {
                return 'transparent';
              }
              // 섹터 노드는 어두운 회색 (pathComponents: [root, sector])
              if (node.pathComponents.length === 2) {
                return '#1f2937';
              }
              // 종목 노드는 등락률 기반 색상
              const change = node.data.change ?? 0;
              return getHeatmapColor(change, isKorean);
            }}
            // 테두리 설정
            borderWidth={1}
            borderColor="#374151"
            // ==================== 종목 라벨 설정 ====================
            // 종목명 + 등락률 표시 (예: "삼성전자 +1.2%")
            label={(node) => {
              // 종목 노드만 라벨 표시 (pathComponents: [root, sector, stock])
              const name = node.data.name || node.id;
              const change = node.data.change ?? 0;
              // 종목명 + 등락률
              return `${name} ${formatPercent(change)}`;
            }}
            // 작은 박스에도 라벨 표시 (최소 크기 15px)
            labelSkipSize={15}
            labelTextColor="#ffffff"
            // ==================== 부모(섹터/root) 라벨 설정 ====================
            // root 라벨은 숨기고, 섹터 라벨만 표시
            enableParentLabel={true}
            parentLabel={(node) => {
              // root 노드는 빈 문자열 (라벨 숨김)
              if (node.pathComponents.length === 1) {
                return '';
              }
              // 섹터 노드는 섹터명 표시
              return node.id;
            }}
            parentLabelPosition="top"
            parentLabelPadding={8}
            parentLabelTextColor="#9ca3af"
            // 호버 시 툴팁
            // pathComponents.length로 depth 계산: 2=섹터, 3=종목
            tooltip={({ node }) => {
              // 섹터 노드는 툴팁 없음 (pathComponents: [root, sector])
              if (node.pathComponents.length === 2) {
                return null;
              }

              const change = node.data.change ?? 0;
              const price = node.data.price ?? 0;
              const symbol = node.data.symbol ?? node.id;
              const isPositive = change >= 0;

              // pathComponents에서 섹터명 가져오기 (두 번째 요소)
              const sector = node.pathComponents[1] ?? '';

              return (
                <div className="bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700 p-3 min-w-[200px]">
                  {/* 종목명 + 심볼 */}
                  <div className="font-bold text-sm mb-2">
                    {node.data.name}
                    <span className="text-gray-400 ml-2 font-normal text-xs">
                      {symbol}
                    </span>
                  </div>

                  {/* 현재가 + 등락률 */}
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-xs">현재가</span>
                    <div className="text-right">
                      <span className="font-semibold text-sm">
                        {formatPrice(price, isKorean)}
                      </span>
                      <span
                        className={`ml-2 text-xs font-medium ${
                          isPositive
                            ? isKorean
                              ? 'text-red-400'
                              : 'text-green-400'
                            : isKorean
                              ? 'text-blue-400'
                              : 'text-red-400'
                        }`}
                      >
                        {formatPercent(change)}
                      </span>
                    </div>
                  </div>

                  {/* 시가총액 */}
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-xs">시가총액</span>
                    <span className="font-semibold text-sm">
                      {formatMarketCap(node.value, isKorean)}
                    </span>
                  </div>

                  {/* 섹터 */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-xs">섹터</span>
                    <span className="text-sm text-gray-200">{sector}</span>
                  </div>
                </div>
              );
            }}
            // 클릭 이벤트
            // pathComponents.length로 depth 계산: 3=종목
            onClick={(node) => {
              // 종목 노드 클릭 시 상세 페이지로 이동 (pathComponents: [root, sector, stock])
              if (node.pathComponents.length === 3 && node.data.symbol) {
                handleStockClick(node.data.symbol);
              }
            }}
            // 애니메이션
            animate={false}
            motionConfig="gentle"
          />
        </div>

        {/* 범례 */}
        <div className="mt-4 flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm"
                  style={{
                    backgroundColor: getHeatmapColor(
                      i * (isKorean ? 1 : 1),
                      isKorean
                    ),
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">
              {isKorean ? '+1% ~ +5%' : '+1% ~ +5%'}
            </span>
          </div>
          <div className="w-4 h-4 rounded-sm bg-gray-500" />
          <span className="text-xs text-gray-500">0%</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm"
                  style={{
                    backgroundColor: getHeatmapColor(
                      -i * (isKorean ? 1 : 1),
                      isKorean
                    ),
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">
              {isKorean ? '-1% ~ -5%' : '-1% ~ -5%'}
            </span>
          </div>
        </div>
      </div>

      {/* 모바일: 리스트 뷰 */}
      <div className="md:hidden">
        <MobileListView
          sectors={sectors}
          isKorean={isKorean}
          onStockClick={handleStockClick}
        />
      </div>

      {/* 커스텀 툴팁 (마우스 추적용 - 필요시 사용) */}
      <CustomTooltip tooltip={tooltip} isKorean={isKorean} />
    </section>
  );
}
