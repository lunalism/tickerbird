import {
  MarketTab,
  MarketIndex,
  Stock,
  TopMover,
  MarketRegion,
  CategoryTab,
  SectorTab,
  ETF,
  Crypto,
  Commodity,
  Forex,
  MarketCategory,
  StockSector,
  MarketTypeTab,
  MarketType,
  CountryCategory,
  GlobalCategory
} from '@/types/market';

// 2024년 12월 12일 기준 실제 시장 데이터

// ==================== 1차 탭: 국가별 시장 / 글로벌 시장 ====================
export const marketTypeTabs: MarketTypeTab[] = [
  { id: 'country', label: '국가별 시장', icon: '🌏' },
  { id: 'global', label: '글로벌 시장', icon: '🌐' },
];

// ==================== 국가 탭 데이터 ====================
// 한국 서비스이므로 한국을 첫 번째로 배치
export const marketTabs: MarketTab[] = [
  { id: 'kr', label: '한국', flag: '🇰🇷' },
  { id: 'us', label: '미국', flag: '🇺🇸' },
  { id: 'jp', label: '일본', flag: '🇯🇵' },
  { id: 'hk', label: '홍콩', flag: '🇭🇰' },
];

// ==================== 국가별 시장 카테고리 탭 ====================
export const countryCategoryTabs: CategoryTab[] = [
  { id: 'all', label: '전체', icon: '📊' },
  { id: 'indices', label: '지수', icon: '📈' },
  { id: 'stocks', label: '주식', icon: '💹' },
  { id: 'etf', label: 'ETF', icon: '📦' },
];

// ==================== 글로벌 시장 카테고리 탭 ====================
export const globalCategoryTabs: CategoryTab[] = [
  { id: 'all', label: '전체', icon: '📊' },
  { id: 'crypto', label: '암호화폐', icon: '₿' },
  { id: 'commodities', label: '원자재', icon: '🛢️' },
  { id: 'forex', label: '환율', icon: '💱' },
];

// 전체 카테고리 탭 (하위 호환성 유지)
export const categoryTabs: CategoryTab[] = [
  { id: 'all', label: '전체', icon: '📊' },
  { id: 'indices', label: '지수', icon: '📈' },
  { id: 'stocks', label: '주식', icon: '💹' },
  { id: 'etf', label: 'ETF', icon: '📦' },
  { id: 'crypto', label: '암호화폐', icon: '₿' },
  { id: 'commodities', label: '원자재', icon: '🛢️' },
  { id: 'forex', label: '환율', icon: '💱' },
];

// ==================== 섹터 탭 데이터 ====================
export const sectorTabs: SectorTab[] = [
  { id: 'all', label: '전체' },
  { id: 'tech', label: '기술' },
  { id: 'finance', label: '금융' },
  { id: 'healthcare', label: '헬스케어' },
  { id: 'energy', label: '에너지' },
  { id: 'consumer', label: '소비재' },
  { id: 'telecom', label: '통신' },
];

export const marketIndices: Record<MarketRegion, MarketIndex[]> = {
  us: [
    { id: 'spx', name: 'S&P 500', value: 6084.19, change: -17.48, changePercent: -0.29, chartData: [6090, 6095, 6088, 6092, 6085, 6080, 6078, 6082, 6084] },
    { id: 'ndx', name: 'NASDAQ', value: 19902.84, change: -123.08, changePercent: -0.61, chartData: [20050, 20020, 19980, 19950, 19920, 19890, 19870, 19890, 19903] },
    { id: 'dji', name: 'Dow Jones', value: 43914.12, change: -234.44, changePercent: -0.53, chartData: [44200, 44150, 44100, 44050, 44000, 43950, 43920, 43900, 43914] },
    { id: 'rut', name: 'Russell 2000', value: 2366.79, change: -33.42, changePercent: -1.39, chartData: [2410, 2400, 2390, 2380, 2375, 2370, 2365, 2368, 2367] },
  ],
  kr: [
    { id: 'kospi', name: 'KOSPI', value: 2482.12, change: 39.61, changePercent: 1.62, chartData: [2442, 2450, 2458, 2465, 2470, 2475, 2478, 2480, 2482] },
    { id: 'kosdaq', name: 'KOSDAQ', value: 683.35, change: 7.43, changePercent: 1.10, chartData: [676, 677, 678, 679, 680, 681, 682, 683, 683] },
  ],
  jp: [
    { id: 'n225', name: 'Nikkei 225', value: 39849.14, change: 476.91, changePercent: 1.21, chartData: [39350, 39450, 39520, 39600, 39680, 39750, 39800, 39830, 39849] },
    { id: 'topix', name: 'TOPIX', value: 2773.03, change: 30.42, changePercent: 1.11, chartData: [2740, 2748, 2752, 2758, 2762, 2768, 2770, 2772, 2773] },
  ],
  hk: [
    { id: 'hsi', name: 'Hang Seng', value: 20397.01, change: 242.36, changePercent: 1.20, chartData: [20150, 20180, 20220, 20260, 20300, 20340, 20370, 20390, 20397] },
    { id: 'hscei', name: 'HSCEI', value: 7286.76, change: 101.64, changePercent: 1.41, chartData: [7180, 7200, 7220, 7240, 7260, 7270, 7280, 7284, 7287] },
  ],
};

export const popularStocks: Record<MarketRegion, Stock[]> = {
  us: [
    { rank: 1, name: 'NVIDIA', ticker: 'NVDA', price: 134.25, change: -3.96, changePercent: -2.87, volume: '326.8M', domain: 'nvidia.com' },
    { rank: 2, name: 'Tesla', ticker: 'TSLA', price: 424.77, change: 15.87, changePercent: 3.88, volume: '112.4M', domain: 'tesla.com' },
    { rank: 3, name: 'Apple', ticker: 'AAPL', price: 248.13, change: -1.22, changePercent: -0.49, volume: '45.2M', domain: 'apple.com' },
    { rank: 4, name: 'Microsoft', ticker: 'MSFT', price: 448.29, change: -2.88, changePercent: -0.64, volume: '18.7M', domain: 'microsoft.com' },
    { rank: 5, name: 'Alphabet', ticker: 'GOOGL', price: 193.95, change: -1.48, changePercent: -0.76, volume: '22.4M', domain: 'google.com' },
    { rank: 6, name: 'Amazon', ticker: 'AMZN', price: 227.03, change: -0.92, changePercent: -0.40, volume: '38.6M', domain: 'amazon.com' },
    { rank: 7, name: 'Meta', ticker: 'META', price: 617.12, change: -5.34, changePercent: -0.86, volume: '12.8M', domain: 'meta.com' },
    { rank: 8, name: 'Broadcom', ticker: 'AVGO', price: 186.24, change: -4.16, changePercent: -2.18, volume: '24.1M', domain: 'broadcom.com' },
  ],
  kr: [
    { rank: 1, name: '삼성전자', ticker: '005930', price: 53600, change: 900, changePercent: 1.71, volume: '15.2M', domain: 'samsung.com' },
    { rank: 2, name: 'SK하이닉스', ticker: '000660', price: 171000, change: 6000, changePercent: 3.64, volume: '2.6M', domain: 'skhynix.com' },
    { rank: 3, name: 'LG에너지솔루션', ticker: '373220', price: 366500, change: 4500, changePercent: 1.24, volume: '0.4M', domain: 'lgensol.com' },
    { rank: 4, name: '현대차', ticker: '005380', price: 211000, change: 3500, changePercent: 1.69, volume: '0.9M', domain: 'hyundai.com' },
    { rank: 5, name: '기아', ticker: '000270', price: 95200, change: 1600, changePercent: 1.71, volume: '1.4M', domain: 'kia.com' },
    { rank: 6, name: '셀트리온', ticker: '068270', price: 181500, change: 2000, changePercent: 1.11, volume: '0.8M', domain: 'celltrion.com' },
    { rank: 7, name: 'NAVER', ticker: '035420', price: 189500, change: 2500, changePercent: 1.34, volume: '0.6M', domain: 'navercorp.com' },
    { rank: 8, name: '카카오', ticker: '035720', price: 41550, change: 650, changePercent: 1.59, volume: '2.3M', domain: 'kakaocorp.com' },
  ],
  jp: [
    { rank: 1, name: 'Toyota', ticker: '7203', price: 2847, change: 42, changePercent: 1.50, volume: '18.4M', domain: 'toyota.com' },
    { rank: 2, name: 'Sony', ticker: '6758', price: 3215, change: 58, changePercent: 1.84, volume: '9.2M', domain: 'sony.com' },
    { rank: 3, name: 'Keyence', ticker: '6861', price: 65780, change: 980, changePercent: 1.51, volume: '0.5M', domain: 'keyence.com' },
    { rank: 4, name: 'SoftBank', ticker: '9984', price: 9125, change: 142, changePercent: 1.58, volume: '14.6M', domain: 'softbank.jp' },
    { rank: 5, name: 'Nintendo', ticker: '7974', price: 9012, change: 87, changePercent: 0.97, volume: '3.8M', domain: 'nintendo.com' },
    { rank: 6, name: 'Fast Retailing', ticker: '9983', price: 51240, change: 640, changePercent: 1.26, volume: '0.7M', domain: 'fastretailing.com' },
    { rank: 7, name: 'Tokyo Electron', ticker: '8035', price: 24680, change: 420, changePercent: 1.73, volume: '2.1M', domain: 'tel.com' },
    { rank: 8, name: 'Mitsubishi UFJ', ticker: '8306', price: 1842, change: 28, changePercent: 1.54, volume: '52.3M', domain: 'mufg.jp' },
  ],
  hk: [
    { rank: 1, name: 'Tencent', ticker: '0700', price: 408.60, change: 7.80, changePercent: 1.95, volume: '16.2M', domain: 'tencent.com' },
    { rank: 2, name: 'Alibaba', ticker: '9988', price: 88.35, change: 1.65, changePercent: 1.90, volume: '38.7M', domain: 'alibaba.com' },
    { rank: 3, name: 'Meituan', ticker: '3690', price: 156.80, change: 2.40, changePercent: 1.55, volume: '14.2M', domain: 'meituan.com' },
    { rank: 4, name: 'AIA', ticker: '1299', price: 58.25, change: 0.65, changePercent: 1.13, volume: '10.8M', domain: 'aia.com' },
    { rank: 5, name: 'HSBC', ticker: '0005', price: 73.40, change: 0.45, changePercent: 0.62, volume: '18.4M', domain: 'hsbc.com' },
    { rank: 6, name: 'JD.com', ticker: '9618', price: 145.20, change: 2.80, changePercent: 1.97, volume: '7.6M', domain: 'jd.com' },
    { rank: 7, name: 'Xiaomi', ticker: '1810', price: 33.85, change: 0.75, changePercent: 2.27, volume: '78.4M', domain: 'mi.com' },
    { rank: 8, name: 'BYD', ticker: '1211', price: 312.40, change: 4.20, changePercent: 1.36, volume: '5.8M', domain: 'byd.com' },
  ],
};

export const topGainers: Record<MarketRegion, TopMover[]> = {
  us: [
    { name: 'Tesla', ticker: 'TSLA', changePercent: 3.88 },
    { name: 'Palantir', ticker: 'PLTR', changePercent: 2.45 },
    { name: 'Costco', ticker: 'COST', changePercent: 1.82 },
    { name: 'Eli Lilly', ticker: 'LLY', changePercent: 1.54 },
    { name: 'Visa', ticker: 'V', changePercent: 1.21 },
  ],
  kr: [
    { name: 'SK하이닉스', ticker: '000660', changePercent: 3.64 },
    { name: '삼성전자', ticker: '005930', changePercent: 1.71 },
    { name: '기아', ticker: '000270', changePercent: 1.71 },
    { name: '현대차', ticker: '005380', changePercent: 1.69 },
    { name: '카카오', ticker: '035720', changePercent: 1.59 },
  ],
  jp: [
    { name: 'Sony', ticker: '6758', changePercent: 1.84 },
    { name: 'Tokyo Electron', ticker: '8035', changePercent: 1.73 },
    { name: 'SoftBank', ticker: '9984', changePercent: 1.58 },
    { name: 'Mitsubishi UFJ', ticker: '8306', changePercent: 1.54 },
    { name: 'Keyence', ticker: '6861', changePercent: 1.51 },
  ],
  hk: [
    { name: 'Xiaomi', ticker: '1810', changePercent: 2.27 },
    { name: 'JD.com', ticker: '9618', changePercent: 1.97 },
    { name: 'Tencent', ticker: '0700', changePercent: 1.95 },
    { name: 'Alibaba', ticker: '9988', changePercent: 1.90 },
    { name: 'Meituan', ticker: '3690', changePercent: 1.55 },
  ],
};

export const topLosers: Record<MarketRegion, TopMover[]> = {
  us: [
    { name: 'NVIDIA', ticker: 'NVDA', changePercent: -2.87 },
    { name: 'Broadcom', ticker: 'AVGO', changePercent: -2.18 },
    { name: 'AMD', ticker: 'AMD', changePercent: -1.92 },
    { name: 'Intel', ticker: 'INTC', changePercent: -1.56 },
    { name: 'Meta', ticker: 'META', changePercent: -0.86 },
  ],
  kr: [
    { name: 'LG화학', ticker: '051910', changePercent: -0.82 },
    { name: '포스코홀딩스', ticker: '005490', changePercent: -0.65 },
    { name: 'KB금융', ticker: '105560', changePercent: -0.48 },
    { name: '신한지주', ticker: '055550', changePercent: -0.35 },
    { name: '하나금융지주', ticker: '086790', changePercent: -0.28 },
  ],
  jp: [
    { name: 'Daikin', ticker: '6367', changePercent: -0.72 },
    { name: 'Shin-Etsu', ticker: '4063', changePercent: -0.58 },
    { name: 'Recruit', ticker: '6098', changePercent: -0.45 },
    { name: 'KDDI', ticker: '9433', changePercent: -0.38 },
    { name: 'Takeda', ticker: '4502', changePercent: -0.25 },
  ],
  hk: [
    { name: 'Li Auto', ticker: '2015', changePercent: -1.24 },
    { name: 'NetEase', ticker: '9999', changePercent: -0.92 },
    { name: 'Ping An', ticker: '2318', changePercent: -0.68 },
    { name: 'China Mobile', ticker: '0941', changePercent: -0.45 },
    { name: 'CNOOC', ticker: '0883', changePercent: -0.32 },
  ],
};

// ==================== 확장 지수 데이터 (카테고리: 지수) ====================
export const extendedIndices: Record<MarketRegion, MarketIndex[]> = {
  us: [
    { id: 'spx', name: 'S&P 500', value: 6084.19, change: -17.48, changePercent: -0.29, chartData: [6090, 6095, 6088, 6092, 6085, 6080, 6078, 6082, 6084] },
    { id: 'ndx', name: 'NASDAQ', value: 19902.84, change: -123.08, changePercent: -0.61, chartData: [20050, 20020, 19980, 19950, 19920, 19890, 19870, 19890, 19903] },
    { id: 'dji', name: 'Dow Jones', value: 43914.12, change: -234.44, changePercent: -0.53, chartData: [44200, 44150, 44100, 44050, 44000, 43950, 43920, 43900, 43914] },
    { id: 'rut', name: 'Russell 2000', value: 2366.79, change: -33.42, changePercent: -1.39, chartData: [2410, 2400, 2390, 2380, 2375, 2370, 2365, 2368, 2367] },
    { id: 'vix', name: 'VIX', value: 14.12, change: 0.58, changePercent: 4.28, chartData: [13.5, 13.6, 13.8, 14.0, 14.1, 14.0, 14.1, 14.0, 14.12] },
  ],
  kr: [
    { id: 'kospi', name: 'KOSPI', value: 2482.12, change: 39.61, changePercent: 1.62, chartData: [2442, 2450, 2458, 2465, 2470, 2475, 2478, 2480, 2482] },
    { id: 'kosdaq', name: 'KOSDAQ', value: 683.35, change: 7.43, changePercent: 1.10, chartData: [676, 677, 678, 679, 680, 681, 682, 683, 683] },
  ],
  jp: [
    { id: 'n225', name: 'Nikkei 225', value: 39849.14, change: 476.91, changePercent: 1.21, chartData: [39350, 39450, 39520, 39600, 39680, 39750, 39800, 39830, 39849] },
    { id: 'topix', name: 'TOPIX', value: 2773.03, change: 30.42, changePercent: 1.11, chartData: [2740, 2748, 2752, 2758, 2762, 2768, 2770, 2772, 2773] },
  ],
  hk: [
    { id: 'hsi', name: 'Hang Seng', value: 20397.01, change: 242.36, changePercent: 1.20, chartData: [20150, 20180, 20220, 20260, 20300, 20340, 20370, 20390, 20397] },
    { id: 'hscei', name: 'H-shares', value: 7286.76, change: 101.64, changePercent: 1.41, chartData: [7180, 7200, 7220, 7240, 7260, 7270, 7280, 7284, 7287] },
  ],
};

// ==================== 섹터별 주식 데이터 (카테고리: 주식) ====================
export const stocksBySector: Record<MarketRegion, Stock[]> = {
  us: [
    // 기술 섹터
    { rank: 1, name: 'NVIDIA', ticker: 'NVDA', price: 134.25, change: -3.96, changePercent: -2.87, volume: '326.8M', domain: 'nvidia.com', sector: 'tech' },
    { rank: 2, name: 'Apple', ticker: 'AAPL', price: 248.13, change: -1.22, changePercent: -0.49, volume: '45.2M', domain: 'apple.com', sector: 'tech' },
    { rank: 3, name: 'Microsoft', ticker: 'MSFT', price: 448.29, change: -2.88, changePercent: -0.64, volume: '18.7M', domain: 'microsoft.com', sector: 'tech' },
    { rank: 4, name: 'Alphabet', ticker: 'GOOGL', price: 193.95, change: -1.48, changePercent: -0.76, volume: '22.4M', domain: 'google.com', sector: 'tech' },
    { rank: 5, name: 'Meta', ticker: 'META', price: 617.12, change: -5.34, changePercent: -0.86, volume: '12.8M', domain: 'meta.com', sector: 'tech' },
    // 금융 섹터
    { rank: 6, name: 'JPMorgan Chase', ticker: 'JPM', price: 252.34, change: 3.21, changePercent: 1.29, volume: '8.4M', domain: 'jpmorganchase.com', sector: 'finance' },
    { rank: 7, name: 'Bank of America', ticker: 'BAC', price: 46.78, change: 0.56, changePercent: 1.21, volume: '32.1M', domain: 'bankofamerica.com', sector: 'finance' },
    { rank: 8, name: 'Wells Fargo', ticker: 'WFC', price: 75.42, change: 0.89, changePercent: 1.19, volume: '14.2M', domain: 'wellsfargo.com', sector: 'finance' },
    // 헬스케어 섹터
    { rank: 9, name: 'UnitedHealth', ticker: 'UNH', price: 524.67, change: -8.45, changePercent: -1.59, volume: '4.2M', domain: 'unitedhealthgroup.com', sector: 'healthcare' },
    { rank: 10, name: 'Eli Lilly', ticker: 'LLY', price: 792.45, change: 12.34, changePercent: 1.58, volume: '3.8M', domain: 'lilly.com', sector: 'healthcare' },
    { rank: 11, name: 'Pfizer', ticker: 'PFE', price: 25.67, change: -0.34, changePercent: -1.31, volume: '28.4M', domain: 'pfizer.com', sector: 'healthcare' },
    // 에너지 섹터
    { rank: 12, name: 'ExxonMobil', ticker: 'XOM', price: 108.92, change: -1.23, changePercent: -1.12, volume: '12.6M', domain: 'exxonmobil.com', sector: 'energy' },
    { rank: 13, name: 'Chevron', ticker: 'CVX', price: 145.78, change: -1.89, changePercent: -1.28, volume: '6.8M', domain: 'chevron.com', sector: 'energy' },
    // 소비재 섹터
    { rank: 14, name: 'Amazon', ticker: 'AMZN', price: 227.03, change: -0.92, changePercent: -0.40, volume: '38.6M', domain: 'amazon.com', sector: 'consumer' },
    { rank: 15, name: 'Tesla', ticker: 'TSLA', price: 424.77, change: 15.87, changePercent: 3.88, volume: '112.4M', domain: 'tesla.com', sector: 'consumer' },
    { rank: 16, name: 'Costco', ticker: 'COST', price: 978.45, change: 12.56, changePercent: 1.30, volume: '2.1M', domain: 'costco.com', sector: 'consumer' },
    // 통신 섹터
    { rank: 17, name: 'Verizon', ticker: 'VZ', price: 42.56, change: 0.34, changePercent: 0.81, volume: '15.4M', domain: 'verizon.com', sector: 'telecom' },
    { rank: 18, name: 'AT&T', ticker: 'T', price: 22.89, change: 0.18, changePercent: 0.79, volume: '24.8M', domain: 'att.com', sector: 'telecom' },
  ],
  kr: [
    // 기술 섹터
    { rank: 1, name: '삼성전자', ticker: '005930', price: 53600, change: 900, changePercent: 1.71, volume: '15.2M', domain: 'samsung.com', sector: 'tech' },
    { rank: 2, name: 'SK하이닉스', ticker: '000660', price: 171000, change: 6000, changePercent: 3.64, volume: '2.6M', domain: 'skhynix.com', sector: 'tech' },
    { rank: 3, name: 'NAVER', ticker: '035420', price: 189500, change: 2500, changePercent: 1.34, volume: '0.6M', domain: 'navercorp.com', sector: 'tech' },
    { rank: 4, name: '카카오', ticker: '035720', price: 41550, change: 650, changePercent: 1.59, volume: '2.3M', domain: 'kakaocorp.com', sector: 'tech' },
    // 금융 섹터
    { rank: 5, name: 'KB금융', ticker: '105560', price: 89500, change: -430, changePercent: -0.48, volume: '0.8M', domain: 'kbfg.com', sector: 'finance' },
    { rank: 6, name: '신한지주', ticker: '055550', price: 51200, change: -180, changePercent: -0.35, volume: '1.1M', domain: 'shinhangroup.com', sector: 'finance' },
    // 헬스케어 섹터
    { rank: 7, name: '셀트리온', ticker: '068270', price: 181500, change: 2000, changePercent: 1.11, volume: '0.8M', domain: 'celltrion.com', sector: 'healthcare' },
    { rank: 8, name: '삼성바이오로직스', ticker: '207940', price: 782000, change: 8000, changePercent: 1.03, volume: '0.1M', domain: 'samsungbiologics.com', sector: 'healthcare' },
    // 에너지 섹터
    { rank: 9, name: 'LG에너지솔루션', ticker: '373220', price: 366500, change: 4500, changePercent: 1.24, volume: '0.4M', domain: 'lgensol.com', sector: 'energy' },
    // 소비재 섹터
    { rank: 10, name: '현대차', ticker: '005380', price: 211000, change: 3500, changePercent: 1.69, volume: '0.9M', domain: 'hyundai.com', sector: 'consumer' },
    { rank: 11, name: '기아', ticker: '000270', price: 95200, change: 1600, changePercent: 1.71, volume: '1.4M', domain: 'kia.com', sector: 'consumer' },
    // 통신 섹터
    { rank: 12, name: 'SK텔레콤', ticker: '017670', price: 58400, change: 400, changePercent: 0.69, volume: '0.3M', domain: 'sktelecom.com', sector: 'telecom' },
    { rank: 13, name: 'KT', ticker: '030200', price: 37850, change: 250, changePercent: 0.67, volume: '0.5M', domain: 'kt.com', sector: 'telecom' },
  ],
  jp: [
    { rank: 1, name: 'Toyota', ticker: '7203', price: 2847, change: 42, changePercent: 1.50, volume: '18.4M', domain: 'toyota.com', sector: 'consumer' },
    { rank: 2, name: 'Sony', ticker: '6758', price: 3215, change: 58, changePercent: 1.84, volume: '9.2M', domain: 'sony.com', sector: 'tech' },
    { rank: 3, name: 'Keyence', ticker: '6861', price: 65780, change: 980, changePercent: 1.51, volume: '0.5M', domain: 'keyence.com', sector: 'tech' },
    { rank: 4, name: 'SoftBank', ticker: '9984', price: 9125, change: 142, changePercent: 1.58, volume: '14.6M', domain: 'softbank.jp', sector: 'telecom' },
    { rank: 5, name: 'Mitsubishi UFJ', ticker: '8306', price: 1842, change: 28, changePercent: 1.54, volume: '52.3M', domain: 'mufg.jp', sector: 'finance' },
    { rank: 6, name: 'Takeda', ticker: '4502', price: 4125, change: -10, changePercent: -0.25, volume: '8.2M', domain: 'takeda.com', sector: 'healthcare' },
  ],
  hk: [
    { rank: 1, name: 'Tencent', ticker: '0700', price: 408.60, change: 7.80, changePercent: 1.95, volume: '16.2M', domain: 'tencent.com', sector: 'tech' },
    { rank: 2, name: 'Alibaba', ticker: '9988', price: 88.35, change: 1.65, changePercent: 1.90, volume: '38.7M', domain: 'alibaba.com', sector: 'tech' },
    { rank: 3, name: 'AIA', ticker: '1299', price: 58.25, change: 0.65, changePercent: 1.13, volume: '10.8M', domain: 'aia.com', sector: 'finance' },
    { rank: 4, name: 'HSBC', ticker: '0005', price: 73.40, change: 0.45, changePercent: 0.62, volume: '18.4M', domain: 'hsbc.com', sector: 'finance' },
    { rank: 5, name: 'BYD', ticker: '1211', price: 312.40, change: 4.20, changePercent: 1.36, volume: '5.8M', domain: 'byd.com', sector: 'consumer' },
    { rank: 6, name: 'China Mobile', ticker: '0941', price: 72.80, change: -0.33, changePercent: -0.45, volume: '12.4M', domain: 'chinamobileltd.com', sector: 'telecom' },
  ],
};

// ==================== ETF 데이터 (카테고리: ETF) - 국가별 ====================
export const etfData: Record<MarketRegion, ETF[]> = {
  // 미국 ETF
  us: [
    { id: 'spy', name: 'SPDR S&P 500 ETF Trust', ticker: 'SPY', price: 605.42, change: 2.34, changePercent: 0.39, aum: '$562B', expenseRatio: '0.09%', chartData: [600, 602, 603, 604, 605, 604, 605, 605, 605] },
    { id: 'qqq', name: 'Invesco QQQ Trust', ticker: 'QQQ', price: 527.89, change: -1.56, changePercent: -0.29, aum: '$312B', expenseRatio: '0.20%', chartData: [530, 529, 528, 528, 527, 528, 528, 528, 528] },
    { id: 'iwm', name: 'iShares Russell 2000 ETF', ticker: 'IWM', price: 234.67, change: -2.89, changePercent: -1.22, aum: '$72B', expenseRatio: '0.19%', chartData: [238, 237, 236, 235, 235, 234, 235, 234, 235] },
    { id: 'dia', name: 'SPDR Dow Jones ETF', ticker: 'DIA', price: 438.92, change: 1.23, changePercent: 0.28, aum: '$35B', expenseRatio: '0.16%', chartData: [436, 437, 437, 438, 438, 439, 438, 439, 439] },
    { id: 'arkk', name: 'ARK Innovation ETF', ticker: 'ARKK', price: 56.78, change: 1.89, changePercent: 3.44, aum: '$6.8B', expenseRatio: '0.75%', chartData: [54, 55, 55, 56, 56, 57, 56, 57, 57] },
    { id: 'vti', name: 'Vanguard Total Stock Market', ticker: 'VTI', price: 295.34, change: 0.87, changePercent: 0.30, aum: '$428B', expenseRatio: '0.03%', chartData: [293, 294, 294, 295, 295, 295, 295, 295, 295] },
    { id: 'voo', name: 'Vanguard S&P 500 ETF', ticker: 'VOO', price: 556.12, change: 1.45, changePercent: 0.26, aum: '$515B', expenseRatio: '0.03%', chartData: [553, 554, 555, 555, 556, 556, 556, 556, 556] },
    { id: 'schd', name: 'Schwab US Dividend Equity', ticker: 'SCHD', price: 28.45, change: 0.12, changePercent: 0.42, aum: '$62B', expenseRatio: '0.06%', chartData: [28.2, 28.3, 28.3, 28.4, 28.4, 28.4, 28.5, 28.4, 28.5] },
  ],
  // 한국 ETF (가격: 원화)
  kr: [
    { id: 'kodex200', name: 'KODEX 200', ticker: '069500', price: 35420, change: 380, changePercent: 1.08, aum: '₩8.2조', expenseRatio: '0.05%', chartData: [35000, 35100, 35150, 35200, 35300, 35350, 35400, 35410, 35420] },
    { id: 'tiger200', name: 'TIGER 200', ticker: '102110', price: 35280, change: 350, changePercent: 1.00, aum: '₩5.8조', expenseRatio: '0.05%', chartData: [34900, 34980, 35050, 35100, 35150, 35200, 35250, 35270, 35280] },
    { id: 'kodexlev', name: 'KODEX 레버리지', ticker: '122630', price: 18950, change: 420, changePercent: 2.27, aum: '₩3.2조', expenseRatio: '0.64%', chartData: [18400, 18500, 18600, 18700, 18800, 18850, 18900, 18930, 18950] },
    { id: 'kodexinv', name: 'KODEX 인버스', ticker: '114800', price: 4125, change: -45, changePercent: -1.08, aum: '₩1.8조', expenseRatio: '0.64%', chartData: [4180, 4170, 4160, 4150, 4140, 4135, 4130, 4127, 4125] },
    { id: 'kodex2nd', name: 'KODEX 2차전지산업', ticker: '305720', price: 12850, change: 280, changePercent: 2.23, aum: '₩2.1조', expenseRatio: '0.45%', chartData: [12500, 12580, 12620, 12680, 12720, 12780, 12810, 12840, 12850] },
    { id: 'tigersp', name: 'TIGER 미국S&P500', ticker: '360750', price: 18420, change: 85, changePercent: 0.46, aum: '₩4.5조', expenseRatio: '0.07%', chartData: [18300, 18320, 18350, 18370, 18390, 18400, 18410, 18415, 18420] },
    { id: 'kodexnas', name: 'KODEX 미국나스닥100', ticker: '379810', price: 21350, change: -65, changePercent: -0.30, aum: '₩3.8조', expenseRatio: '0.07%', chartData: [21450, 21420, 21400, 21380, 21370, 21360, 21355, 21352, 21350] },
    { id: 'tigersemi', name: 'TIGER 반도체', ticker: '091230', price: 42800, change: 1250, changePercent: 3.01, aum: '₩2.4조', expenseRatio: '0.46%', chartData: [41400, 41650, 41900, 42100, 42300, 42500, 42650, 42750, 42800] },
  ],
  // 일본 ETF (가격: 엔화)
  jp: [
    { id: 'nf225', name: 'NEXT FUNDS 日経225', ticker: '1321', price: 42850, change: 520, changePercent: 1.23, aum: '¥8.5兆', expenseRatio: '0.11%', chartData: [42200, 42350, 42450, 42550, 42650, 42720, 42780, 42820, 42850] },
    { id: 'topixetf', name: 'TOPIX連動型ETF', ticker: '1306', price: 2985, change: 32, changePercent: 1.08, aum: '¥18.2兆', expenseRatio: '0.06%', chartData: [2945, 2955, 2960, 2965, 2972, 2978, 2982, 2984, 2985] },
    { id: 'maxis225', name: 'MAXIS 日経225', ticker: '1346', price: 42680, change: 485, changePercent: 1.15, aum: '¥2.1兆', expenseRatio: '0.17%', chartData: [42100, 42250, 42350, 42450, 42520, 42580, 42630, 42660, 42680] },
  ],
  // 홍콩 ETF (가격: HKD)
  hk: [
    { id: 'tracker', name: 'Tracker Fund of HK', ticker: '2800', price: 20.42, change: 0.24, changePercent: 1.19, aum: 'HK$128B', expenseRatio: '0.09%', chartData: [20.10, 20.18, 20.22, 20.28, 20.32, 20.36, 20.38, 20.40, 20.42] },
    { id: 'ishares', name: 'iShares China Large-Cap', ticker: '2801', price: 112.85, change: 1.65, changePercent: 1.48, aum: 'HK$42B', expenseRatio: '0.74%', chartData: [111.00, 111.30, 111.60, 111.90, 112.20, 112.45, 112.65, 112.78, 112.85] },
    { id: 'hsetf', name: 'Hang Seng Index ETF', ticker: '2833', price: 204.30, change: 2.40, changePercent: 1.19, aum: 'HK$85B', expenseRatio: '0.10%', chartData: [201.50, 202.00, 202.50, 203.00, 203.40, 203.80, 204.05, 204.20, 204.30] },
  ],
};

// ==================== 암호화폐 데이터 (카테고리: 암호화폐) ====================
export const cryptoData: Crypto[] = [
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', price: 104832.45, change24h: 2341.56, changePercent24h: 2.28, marketCap: '$2.07T', volume24h: '$48.2B', icon: '₿', chartData: [102000, 102500, 103000, 103500, 104000, 104200, 104500, 104700, 104832] },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', price: 3912.78, change24h: 89.34, changePercent24h: 2.34, marketCap: '$470B', volume24h: '$18.4B', icon: 'Ξ', chartData: [3820, 3840, 3860, 3880, 3890, 3900, 3905, 3910, 3913] },
  { id: 'sol', name: 'Solana', symbol: 'SOL', price: 228.45, change24h: 12.67, changePercent24h: 5.87, marketCap: '$108B', volume24h: '$4.2B', icon: '◎', chartData: [215, 218, 220, 222, 224, 226, 227, 228, 228] },
  { id: 'xrp', name: 'XRP', symbol: 'XRP', price: 2.45, change24h: 0.08, changePercent24h: 3.38, marketCap: '$140B', volume24h: '$8.9B', icon: '✕', chartData: [2.35, 2.37, 2.38, 2.40, 2.42, 2.43, 2.44, 2.45, 2.45] },
  { id: 'ada', name: 'Cardano', symbol: 'ADA', price: 1.12, change24h: -0.03, changePercent24h: -2.61, marketCap: '$39B', volume24h: '$1.8B', icon: '₳', chartData: [1.15, 1.14, 1.14, 1.13, 1.13, 1.12, 1.12, 1.12, 1.12] },
  { id: 'doge', name: 'Dogecoin', symbol: 'DOGE', price: 0.412, change24h: 0.018, changePercent24h: 4.57, marketCap: '$60B', volume24h: '$3.2B', icon: 'Ð', chartData: [0.39, 0.395, 0.40, 0.405, 0.408, 0.41, 0.41, 0.412, 0.412] },
  { id: 'avax', name: 'Avalanche', symbol: 'AVAX', price: 52.34, change24h: 2.12, changePercent24h: 4.22, marketCap: '$21B', volume24h: '$892M', icon: '🔺', chartData: [50, 50.5, 51, 51.5, 52, 52, 52.2, 52.3, 52.34] },
  { id: 'link', name: 'Chainlink', symbol: 'LINK', price: 28.67, change24h: 1.23, changePercent24h: 4.49, marketCap: '$18B', volume24h: '$1.1B', icon: '⬡', chartData: [27.2, 27.5, 27.8, 28, 28.2, 28.4, 28.5, 28.6, 28.67] },
];

// ==================== 원자재 데이터 (카테고리: 원자재) ====================
export const commodityData: Commodity[] = [
  { id: 'gold', name: 'Gold', symbol: 'XAU', price: 2716.45, change: 12.34, changePercent: 0.46, unit: '/oz', chartData: [2700, 2705, 2708, 2710, 2712, 2714, 2715, 2716, 2716] },
  { id: 'silver', name: 'Silver', symbol: 'XAG', price: 31.24, change: -0.18, changePercent: -0.57, unit: '/oz', chartData: [31.5, 31.4, 31.35, 31.3, 31.28, 31.25, 31.24, 31.24, 31.24] },
  { id: 'oil', name: 'Crude Oil (WTI)', symbol: 'CL', price: 70.12, change: -1.23, changePercent: -1.72, unit: '/bbl', chartData: [72, 71.5, 71.2, 71, 70.8, 70.5, 70.3, 70.2, 70.12] },
  { id: 'brent', name: 'Brent Crude', symbol: 'BZ', price: 73.45, change: -1.08, changePercent: -1.45, unit: '/bbl', chartData: [75, 74.5, 74.2, 74, 73.8, 73.6, 73.5, 73.5, 73.45] },
  { id: 'natgas', name: 'Natural Gas', symbol: 'NG', price: 3.42, change: 0.15, changePercent: 4.59, unit: '/MMBtu', chartData: [3.25, 3.28, 3.30, 3.32, 3.35, 3.38, 3.40, 3.41, 3.42] },
  { id: 'copper', name: 'Copper', symbol: 'HG', price: 4.18, change: 0.05, changePercent: 1.21, unit: '/lb', chartData: [4.12, 4.13, 4.14, 4.15, 4.16, 4.17, 4.17, 4.18, 4.18] },
  { id: 'platinum', name: 'Platinum', symbol: 'PL', price: 942.30, change: -8.70, changePercent: -0.92, unit: '/oz', chartData: [952, 950, 948, 946, 945, 944, 943, 942, 942] },
  { id: 'wheat', name: 'Wheat', symbol: 'ZW', price: 546.25, change: 4.50, changePercent: 0.83, unit: '/bu', chartData: [540, 541, 542, 543, 544, 545, 545, 546, 546] },
];

// ==================== 환율 데이터 (카테고리: 환율) ====================
export const forexData: Forex[] = [
  { id: 'usdkrw', pair: 'USD/KRW', name: '달러/원', rate: 1434.50, change: 3.20, changePercent: 0.22, chartData: [1430, 1431, 1432, 1433, 1433, 1434, 1434, 1434, 1434.5] },
  { id: 'eurusd', pair: 'EUR/USD', name: '유로/달러', rate: 1.0512, change: -0.0023, changePercent: -0.22, chartData: [1.054, 1.053, 1.053, 1.052, 1.052, 1.051, 1.051, 1.051, 1.0512] },
  { id: 'usdjpy', pair: 'USD/JPY', name: '달러/엔', rate: 153.42, change: 0.87, changePercent: 0.57, chartData: [152.5, 152.7, 152.9, 153, 153.1, 153.2, 153.3, 153.4, 153.42] },
  { id: 'gbpusd', pair: 'GBP/USD', name: '파운드/달러', rate: 1.2678, change: 0.0034, changePercent: 0.27, chartData: [1.264, 1.265, 1.266, 1.266, 1.267, 1.267, 1.268, 1.268, 1.2678] },
  { id: 'dxy', pair: 'DXY', name: '달러 인덱스', rate: 106.82, change: 0.24, changePercent: 0.22, chartData: [106.5, 106.55, 106.6, 106.65, 106.7, 106.75, 106.78, 106.80, 106.82] },
  { id: 'usdcny', pair: 'USD/CNY', name: '달러/위안', rate: 7.2845, change: 0.0123, changePercent: 0.17, chartData: [7.27, 7.275, 7.278, 7.28, 7.282, 7.283, 7.284, 7.284, 7.2845] },
  { id: 'eurjpy', pair: 'EUR/JPY', name: '유로/엔', rate: 161.28, change: 0.45, changePercent: 0.28, chartData: [160.8, 160.9, 161, 161.1, 161.15, 161.2, 161.25, 161.27, 161.28] },
  { id: 'audusd', pair: 'AUD/USD', name: '호주달러/달러', rate: 0.6378, change: -0.0018, changePercent: -0.28, chartData: [0.64, 0.639, 0.639, 0.638, 0.638, 0.638, 0.638, 0.638, 0.6378] },
];

// ==================== 한국 ETF 종목 리스트 (API 조회용) ====================
/**
 * 한국 ETF 종목 코드 리스트
 *
 * 카테고리별로 분류되어 있으며, 한국투자증권 API를 통해 실시간 시세 조회 가능
 * 종목코드는 6자리 숫자 형식 (예: 069500)
 *
 * 카테고리:
 * 1. index: 지수 추종 ETF (코스피200, 코스닥150 등)
 * 2. leverage: 레버리지/인버스 ETF
 * 3. sector: 섹터/테마 ETF (반도체, 2차전지 등)
 * 4. overseas: 해외지수 ETF (미국, 중국 등)
 * 5. bond: 채권/원자재 ETF
 *
 * @see https://apiportal.koreainvestment.com - 한국투자증권 API
 */
export interface KoreanETFInfo {
  /** 종목코드 (6자리) */
  symbol: string;
  /** ETF 이름 */
  name: string;
  /** 카테고리 */
  category: 'index' | 'leverage' | 'sector' | 'overseas' | 'bond';
  /** 운용사 (삼성, 미래에셋 등) - 표시용 */
  issuer: string;
}

/**
 * 한국 ETF 종목 리스트 (카테고리별)
 *
 * 총 28개 종목:
 * - 지수 추종: 6개
 * - 레버리지/인버스: 6개
 * - 섹터/테마: 6개
 * - 해외지수: 6개
 * - 채권/원자재: 4개
 */
export const koreanETFList: KoreanETFInfo[] = [
  // ========== 지수 추종 ETF ==========
  // 코스피, 코스닥 등 국내 주요 지수를 추종하는 ETF
  { symbol: '069500', name: 'KODEX 200', category: 'index', issuer: '삼성' },
  { symbol: '102110', name: 'TIGER 200', category: 'index', issuer: '미래에셋' },
  { symbol: '229200', name: 'KODEX 코스닥150', category: 'index', issuer: '삼성' },
  { symbol: '251340', name: 'KODEX 코스닥150선물인버스', category: 'index', issuer: '삼성' },
  { symbol: '148020', name: 'KBSTAR 200', category: 'index', issuer: 'KB' },
  { symbol: '292150', name: 'TIGER TOP10', category: 'index', issuer: '미래에셋' },

  // ========== 레버리지/인버스 ETF ==========
  // 지수 대비 2배 수익률 또는 역방향 수익률 추구
  { symbol: '122630', name: 'KODEX 레버리지', category: 'leverage', issuer: '삼성' },
  { symbol: '252670', name: 'KODEX 200선물인버스2X', category: 'leverage', issuer: '삼성' },
  { symbol: '114800', name: 'KODEX 인버스', category: 'leverage', issuer: '삼성' },
  { symbol: '233740', name: 'KODEX 코스닥150레버리지', category: 'leverage', issuer: '삼성' },
  { symbol: '123320', name: 'TIGER 레버리지', category: 'leverage', issuer: '미래에셋' },
  { symbol: '123310', name: 'TIGER 인버스', category: 'leverage', issuer: '미래에셋' },

  // ========== 섹터/테마 ETF ==========
  // 특정 산업이나 테마에 집중 투자
  { symbol: '091230', name: 'TIGER 반도체', category: 'sector', issuer: '미래에셋' },
  { symbol: '305720', name: 'KODEX 2차전지산업', category: 'sector', issuer: '삼성' },
  { symbol: '091180', name: 'KODEX 자동차', category: 'sector', issuer: '삼성' },
  { symbol: '140710', name: 'KODEX 운송', category: 'sector', issuer: '삼성' },
  { symbol: '266370', name: 'KODEX 바이오', category: 'sector', issuer: '삼성' },
  { symbol: '139260', name: 'TIGER 금융', category: 'sector', issuer: '미래에셋' },

  // ========== 해외지수 ETF ==========
  // 미국, 중국 등 해외 주요 지수에 투자
  { symbol: '360750', name: 'TIGER 미국S&P500', category: 'overseas', issuer: '미래에셋' },
  { symbol: '379810', name: 'KODEX 미국나스닥100TR', category: 'overseas', issuer: '삼성' },
  { symbol: '371460', name: 'TIGER 차이나전기차SOLACTIVE', category: 'overseas', issuer: '미래에셋' },
  { symbol: '143850', name: 'TIGER 미국S&P500선물(H)', category: 'overseas', issuer: '미래에셋' },
  { symbol: '133690', name: 'TIGER 미국나스닥100', category: 'overseas', issuer: '미래에셋' },
  { symbol: '381180', name: 'TIGER 미국테크TOP10 INDXX', category: 'overseas', issuer: '미래에셋' },

  // ========== 채권/원자재 ETF ==========
  // 채권, 금, 원유 등에 투자
  { symbol: '148070', name: 'KOSEF 국고채10년', category: 'bond', issuer: '키움' },
  { symbol: '132030', name: 'KODEX 골드선물(H)', category: 'bond', issuer: '삼성' },
  { symbol: '261220', name: 'KODEX WTI원유선물(H)', category: 'bond', issuer: '삼성' },
  { symbol: '130730', name: 'KOSEF 단기자금', category: 'bond', issuer: '키움' },
];

/**
 * ETF 카테고리 라벨 (UI 표시용)
 */
export const etfCategoryLabels: Record<KoreanETFInfo['category'], string> = {
  index: '지수 추종',
  leverage: '레버리지/인버스',
  sector: '섹터/테마',
  overseas: '해외지수',
  bond: '채권/원자재',
};

/**
 * 특정 카테고리의 ETF 목록 반환
 *
 * @param category - ETF 카테고리
 * @returns 해당 카테고리의 ETF 목록
 *
 * @example
 * getETFsByCategory('sector'); // 섹터/테마 ETF 목록 반환
 */
export function getETFsByCategory(category: KoreanETFInfo['category']): KoreanETFInfo[] {
  return koreanETFList.filter(etf => etf.category === category);
}

/**
 * 모든 ETF 종목코드 배열 반환
 * API 일괄 조회 시 사용
 *
 * @returns 종목코드 배열
 */
export function getAllETFSymbols(): string[] {
  return koreanETFList.map(etf => etf.symbol);
}
