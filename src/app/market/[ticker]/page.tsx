'use client';

/**
 * 종목 상세 페이지
 * /market/[ticker] 라우트
 *
 * 구성:
 * - 헤더: 로고, 종목명, 티커, 가격 정보
 * - 차트: 기간별 가격 추이 (recharts)
 * - 핵심 지표: OHLC, 52주 고저, 시총, PER/PBR 등
 * - 관련 뉴스
 *
 * 한국 종목(6자리 숫자):
 * - 한국투자증권 Open API에서 실시간 데이터 가져옴
 * - 삼성전자(005930), SK하이닉스(000660) 등
 */

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { getAssetDetail, getRelatedNews } from '@/constants';
import { ChartPeriod, AssetDetail, RelatedNews } from '@/types/market';
import { useKoreanStockPrice, useUSStockPrice, KOREAN_STOCKS, useWatchlist, useRecentlyViewed } from '@/hooks';
import { showSuccess } from '@/lib/toast';
import { MarketType } from '@/types/recentlyViewed';

// 차트 기간 탭 정의
const chartPeriods: { id: ChartPeriod; label: string }[] = [
  { id: '1D', label: '1일' },
  { id: '1W', label: '1주' },
  { id: '1M', label: '1개월' },
  { id: '3M', label: '3개월' },
  { id: '1Y', label: '1년' },
  { id: 'ALL', label: '전체' },
];

/**
 * 한국 종목 여부 판별
 * 6자리 숫자인 경우 한국 종목으로 판단
 */
function isKoreanStock(ticker: string): boolean {
  return /^\d{6}$/.test(ticker);
}

/**
 * 한국 종목 정보 조회
 * KOREAN_STOCKS 목록에서 종목 정보 찾기
 */
function getKoreanStockInfo(symbol: string): { name: string; domain: string } | null {
  const stock = KOREAN_STOCKS.find(s => s.symbol === symbol);
  return stock ? { name: stock.name, domain: stock.domain } : null;
}

/**
 * 차트 데이터 생성 (가상 데이터)
 * TODO: 실제 일별 시세 API 연동 시 대체
 */
function generateChartDataForKorean(
  currentPrice: number,
  days: number,
  changePercent: number
): { date: string; price: number; volume: number }[] {
  const data: { date: string; price: number; volume: number }[] = [];
  const today = new Date();
  const basePrice = currentPrice / (1 + changePercent / 100);

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const progress = (days - i) / days;
    const noise = (Math.random() - 0.5) * 0.02 * currentPrice;
    const price = basePrice + (currentPrice - basePrice) * progress + noise;

    data.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price),
      volume: Math.floor(Math.random() * 50000000) + 10000000,
    });
  }

  // 마지막 가격을 현재가로 설정
  if (data.length > 0) {
    data[data.length - 1].price = currentPrice;
  }

  return data;
}

/**
 * 가격 포맷팅 함수
 */
function formatPrice(price: number, currency: string): string {
  switch (currency) {
    case 'KRW':
      return price.toLocaleString('ko-KR') + '원';
    case 'JPY':
      return '¥' + price.toLocaleString('ja-JP');
    case 'HKD':
      return 'HK$' + price.toFixed(2);
    default:
      return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

/**
 * 변동 포맷팅 함수
 */
function formatChange(change: number, currency: string): string {
  const sign = change >= 0 ? '+' : '';
  switch (currency) {
    case 'KRW':
      return sign + change.toLocaleString('ko-KR') + '원';
    case 'JPY':
      return sign + '¥' + Math.abs(change).toLocaleString('ja-JP');
    case 'HKD':
      return sign + 'HK$' + Math.abs(change).toFixed(2);
    default:
      return sign + '$' + Math.abs(change).toFixed(2);
  }
}

/**
 * 자산 유형 라벨
 */
function getAssetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    stock: '주식',
    etf: 'ETF',
    crypto: '암호화폐',
    commodity: '원자재',
    forex: '환율',
    index: '지수',
  };
  return labels[type] || type;
}

/**
 * 관심종목 버튼 컴포넌트
 */
function WatchlistButton({
  isInWatchlist,
  onToggle,
}: {
  isInWatchlist: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-lg transition-all duration-200 ${
        isInWatchlist
          ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
          : 'text-gray-300 hover:text-yellow-500 hover:bg-gray-50 dark:text-gray-600 dark:hover:text-yellow-500 dark:hover:bg-gray-700'
      }`}
      title={isInWatchlist ? '관심종목에서 제거' : '관심종목에 추가'}
    >
      {isInWatchlist ? (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
      )}
    </button>
  );
}

/**
 * 차트 툴팁 커스텀 컴포넌트
 */
function CustomTooltip({ active, payload, currency }: { active?: boolean; payload?: any[]; currency: string }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{data.date}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatPrice(data.price, currency)}
        </p>
        {data.volume && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            거래량: {(data.volume / 1000000).toFixed(1)}M
          </p>
        )}
      </div>
    );
  }
  return null;
}

/**
 * 핵심 지표 카드 컴포넌트
 */
function MetricCard({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-base font-semibold text-gray-900 dark:text-white">{value}</p>
      {subValue && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>
      )}
    </div>
  );
}

/**
 * 관련 뉴스 아이템 컴포넌트
 */
function NewsItem({ news }: { news: RelatedNews }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors cursor-pointer">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2">
          {news.title}
        </h4>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{news.source}</span>
          <span>·</span>
          <span>{news.date}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 한국 종목 상세 페이지 컴포넌트
 * 한국투자증권 Open API 실시간 데이터 사용
 */
function KoreanAssetDetailPage({ ticker }: { ticker: string }) {
  const router = useRouter();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1M');

  // 한국 종목 실시간 데이터
  const { stock, isLoading, error, refetch } = useKoreanStockPrice(ticker);
  const stockInfo = getKoreanStockInfo(ticker);
  const news = getRelatedNews(ticker);

  // 관심종목 관리
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const inWatchlist = isInWatchlist(ticker);

  // 최근 본 종목 관리
  const { addToRecentlyViewed } = useRecentlyViewed();

  // ========================================
  // 최근 본 종목 자동 기록
  // 페이지 진입 시 종목 정보를 localStorage에 저장
  // ========================================
  useEffect(() => {
    // 데이터 로딩이 완료되고 종목 정보가 있을 때만 기록
    if (!isLoading && stock) {
      const stockName = stockInfo?.name || stock.stockName || ticker;
      addToRecentlyViewed({
        ticker,
        market: 'kr' as MarketType,
        name: stockName,
      });
    }
  }, [ticker, stock, isLoading, stockInfo, addToRecentlyViewed]);

  const handleToggleWatchlist = () => {
    const stockName = stockInfo?.name || stock?.stockName || ticker;
    const added = toggleWatchlist({ ticker, name: stockName, market: 'kr' });
    if (added) {
      showSuccess(`${stockName}을(를) 관심종목에 추가했습니다`);
    } else {
      showSuccess(`${stockName}을(를) 관심종목에서 제거했습니다`);
    }
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">종목 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (error || !stock) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">{error || '종목을 찾을 수 없습니다'}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">종목코드: {ticker}</p>
          <div className="flex gap-2 justify-center mt-4">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              뒤로 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPositive = stock.changePercent >= 0;

  // 기간별 차트 데이터 생성
  const periodDays: Record<ChartPeriod, number> = {
    '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365, 'ALL': 730
  };
  const chartData = generateChartDataForKorean(stock.currentPrice, periodDays[chartPeriod], stock.changePercent);

  // 차트 데이터 범위 계산
  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const yMin = minPrice - priceRange * 0.1;
  const yMax = maxPrice + priceRange * 0.1;

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-[1200px] mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* 종목 정보 */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                  {ticker}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">주식</span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400">실시간</span>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  {stockInfo?.name || stock.stockName || ticker}
                </h1>
                {/* 관심종목 버튼 */}
                <WatchlistButton
                  isInWatchlist={inWatchlist}
                  onToggle={handleToggleWatchlist}
                />
              </div>
            </div>

            {/* 가격 정보 */}
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stock.currentPrice.toLocaleString('ko-KR')}원
              </p>
              <div className="flex items-center justify-end gap-2 mt-1">
                <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{stock.change.toLocaleString('ko-KR')}원
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isPositive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-[1200px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 차트 + 관련 뉴스 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 차트 섹션 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              {/* 기간 탭 */}
              <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg w-fit">
                {chartPeriods.map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setChartPeriod(period.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      chartPeriod === period.id
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              {/* 차트 */}
              <div className="h-[300px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPriceKr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[yMin, yMax]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(value) => {
                        if (value > 10000) return (value / 10000).toFixed(1) + '만';
                        return value.toLocaleString();
                      }}
                      width={60}
                    />
                    <Tooltip content={<CustomTooltip currency="KRW" />} />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={isPositive ? '#22c55e' : '#ef4444'}
                      strokeWidth={2}
                      fill="url(#colorPriceKr)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* 관련 뉴스 섹션 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">관련 뉴스</h2>
              {news.length > 0 ? (
                <div className="space-y-3">
                  {news.map((item) => (
                    <NewsItem key={item.id} news={item} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">관련 뉴스가 없습니다</p>
              )}
            </section>
          </div>

          {/* 오른쪽: 핵심 지표 */}
          <div className="space-y-6">
            {/* OHLC */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">오늘의 시세</h2>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="시가" value={stock.openPrice.toLocaleString('ko-KR') + '원'} />
                <MetricCard label="고가" value={stock.highPrice.toLocaleString('ko-KR') + '원'} />
                <MetricCard label="저가" value={stock.lowPrice.toLocaleString('ko-KR') + '원'} />
                <MetricCard label="현재가" value={stock.currentPrice.toLocaleString('ko-KR') + '원'} />
              </div>
            </section>

            {/* 52주 고저 */}
            {stock.high52w && stock.low52w && (
              <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">52주 범위</h2>
                <div className="mb-4">
                  <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div
                      className="absolute h-2 bg-blue-500 rounded-full"
                      style={{
                        left: '0%',
                        width: `${((stock.currentPrice - stock.low52w) / (stock.high52w - stock.low52w)) * 100}%`,
                      }}
                    />
                    <div
                      className="absolute w-3 h-3 bg-blue-600 rounded-full -top-0.5 border-2 border-white dark:border-gray-800"
                      style={{
                        left: `${((stock.currentPrice - stock.low52w) / (stock.high52w - stock.low52w)) * 100}%`,
                        transform: 'translateX(-50%)',
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="52주 최저" value={stock.low52w.toLocaleString('ko-KR') + '원'} />
                  <MetricCard label="52주 최고" value={stock.high52w.toLocaleString('ko-KR') + '원'} />
                </div>
              </section>
            )}

            {/* 거래 정보 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">거래 정보</h2>
              <div className="grid grid-cols-1 gap-3">
                <MetricCard
                  label="거래량"
                  value={stock.volume >= 1000000
                    ? (stock.volume / 1000000).toFixed(1) + 'M'
                    : stock.volume >= 1000
                    ? (stock.volume / 1000).toFixed(1) + 'K'
                    : stock.volume.toLocaleString()
                  }
                />
                <MetricCard
                  label="거래대금"
                  value={stock.tradingValue
                    ? (stock.tradingValue >= 100000000
                        ? (stock.tradingValue / 100000000).toFixed(1) + '억원'
                        : (stock.tradingValue / 10000).toFixed(1) + '만원')
                    : '-'
                  }
                />
              </div>
            </section>

            {/* 투자 지표 */}
            {(stock.per || stock.pbr) && (
              <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">투자 지표</h2>
                <div className="grid grid-cols-2 gap-3">
                  {stock.per && <MetricCard label="PER" value={stock.per.toFixed(2) + '배'} />}
                  {stock.pbr && <MetricCard label="PBR" value={stock.pbr.toFixed(2) + '배'} />}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * 미국 주식 상세 페이지 컴포넌트
 *
 * 미국 주식(NASDAQ, NYSE, AMEX)의 실시간 시세를 표시합니다.
 * 한국투자증권 해외주식 API를 통해 데이터를 조회합니다.
 *
 * @param ticker 종목 심볼 (예: AAPL, TSLA, MSFT)
 */
function USAssetDetailPage({ ticker }: { ticker: string }) {
  const router = useRouter();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1M');

  // 미국 주식 실시간 데이터 조회
  const { stock, isLoading, error, refetch } = useUSStockPrice(ticker);
  const news = getRelatedNews(ticker);

  // 관심종목 관리
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const inWatchlist = isInWatchlist(ticker);

  // 최근 본 종목 관리
  const { addToRecentlyViewed } = useRecentlyViewed();

  // ========================================
  // 최근 본 종목 자동 기록
  // 페이지 진입 시 종목 정보를 localStorage에 저장
  // ========================================
  useEffect(() => {
    // 데이터 로딩이 완료되고 종목 정보가 있을 때만 기록
    if (!isLoading && stock) {
      addToRecentlyViewed({
        ticker,
        market: 'us' as MarketType,
        name: stock.name,
      });
    }
  }, [ticker, stock, isLoading, addToRecentlyViewed]);

  /**
   * 관심종목 토글 핸들러
   */
  const handleToggleWatchlist = () => {
    const stockName = stock?.name || ticker;
    const added = toggleWatchlist({ ticker, name: stockName, market: 'us' });
    if (added) {
      showSuccess(`${stockName}을(를) 관심종목에 추가했습니다`);
    } else {
      showSuccess(`${stockName}을(를) 관심종목에서 제거했습니다`);
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">종목 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 또는 데이터 없음 상태
  if (error || !stock) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">{error || '종목을 찾을 수 없습니다'}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">종목코드: {ticker}</p>
          <div className="flex gap-2 justify-center mt-4">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              뒤로 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 등락 여부 (양수면 상승, 음수면 하락)
  const isPositive = stock.changePercent >= 0;

  // 차트 데이터 생성 (가상 데이터 - 실제 API 연동 시 대체)
  const periodDays: Record<ChartPeriod, number> = {
    '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365, 'ALL': 730
  };
  const chartData = generateChartDataForUS(stock.currentPrice, periodDays[chartPeriod], stock.changePercent);

  // 차트 Y축 범위 계산
  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const yMin = minPrice - priceRange * 0.1;
  const yMax = maxPrice + priceRange * 0.1;

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-[1200px] mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* 종목 정보 */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {/* 티커 심볼 배지 */}
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                  {ticker}
                </span>
                {/* 거래소 표시 */}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {stock.exchange === 'NAS' ? 'NASDAQ' : stock.exchange === 'NYS' ? 'NYSE' : 'AMEX'}
                </span>
                {/* 실시간 표시 */}
                <span className="text-xs font-medium text-green-600 dark:text-green-400">실시간</span>
              </div>
              <div className="flex items-center gap-2">
                {/* 종목명 */}
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  {stock.name}
                </h1>
                {/* 관심종목 버튼 */}
                <WatchlistButton
                  isInWatchlist={inWatchlist}
                  onToggle={handleToggleWatchlist}
                />
              </div>
            </div>

            {/* 가격 정보 */}
            <div className="text-right">
              {/* 현재가 (USD) */}
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ${stock.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {/* 변동 정보 */}
              <div className="flex items-center justify-end gap-2 mt-1">
                {/* 변동폭 */}
                <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isPositive ? '+' : ''}{stock.change >= 0 ? '+' : ''}${Math.abs(stock.change).toFixed(2)}
                </span>
                {/* 변동률 배지 */}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isPositive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-[1200px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 차트 + 관련 뉴스 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 차트 섹션 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              {/* 기간 탭 */}
              <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg w-fit">
                {chartPeriods.map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setChartPeriod(period.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      chartPeriod === period.id
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              {/* 차트 */}
              <div className="h-[300px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPriceUs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[yMin, yMax]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(value) => '$' + value.toFixed(0)}
                      width={60}
                    />
                    <Tooltip content={<CustomTooltip currency="USD" />} />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={isPositive ? '#22c55e' : '#ef4444'}
                      strokeWidth={2}
                      fill="url(#colorPriceUs)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* 관련 뉴스 섹션 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">관련 뉴스</h2>
              {news.length > 0 ? (
                <div className="space-y-3">
                  {news.map((item) => (
                    <NewsItem key={item.id} news={item} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">관련 뉴스가 없습니다</p>
              )}
            </section>
          </div>

          {/* 오른쪽: 핵심 지표 */}
          <div className="space-y-6">
            {/* 가격 정보 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">가격 정보</h2>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label="현재가"
                  value={'$' + stock.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                />
                <MetricCard
                  label="변동폭"
                  value={(stock.change >= 0 ? '+$' : '-$') + Math.abs(stock.change).toFixed(2)}
                />
              </div>
            </section>

            {/* 거래 정보 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">거래 정보</h2>
              <div className="grid grid-cols-1 gap-3">
                <MetricCard
                  label="거래량"
                  value={stock.volume >= 1000000
                    ? (stock.volume / 1000000).toFixed(1) + 'M'
                    : stock.volume >= 1000
                    ? (stock.volume / 1000).toFixed(1) + 'K'
                    : stock.volume.toLocaleString()
                  }
                />
                <MetricCard
                  label="거래소"
                  value={stock.exchange === 'NAS' ? 'NASDAQ' : stock.exchange === 'NYS' ? 'NYSE' : 'AMEX'}
                />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * 미국 주식 차트 데이터 생성 (가상 데이터)
 *
 * 현재가와 변동률을 기반으로 가상의 과거 가격 데이터를 생성합니다.
 * 실제 일별 시세 API 연동 시 이 함수를 대체해야 합니다.
 *
 * @param currentPrice 현재가 (USD)
 * @param days 데이터 생성 일수
 * @param changePercent 전일 대비 변동률 (%)
 * @returns 차트 데이터 배열
 */
function generateChartDataForUS(
  currentPrice: number,
  days: number,
  changePercent: number
): { date: string; price: number; volume: number }[] {
  const data: { date: string; price: number; volume: number }[] = [];
  const today = new Date();

  // 변동률을 기반으로 과거 가격 추정
  const basePrice = currentPrice / (1 + changePercent / 100);

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // 시간 진행률 (0 ~ 1)
    const progress = (days - i) / days;
    // 랜덤 노이즈 추가 (±2%)
    const noise = (Math.random() - 0.5) * 0.02 * currentPrice;
    // 가격 계산 (과거 가격에서 현재 가격으로 점진적 변화)
    const price = basePrice + (currentPrice - basePrice) * progress + noise;

    data.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price * 100) / 100, // 소수점 2자리
      volume: Math.floor(Math.random() * 50000000) + 10000000,
    });
  }

  // 마지막 가격을 현재가로 정확히 설정
  if (data.length > 0) {
    data[data.length - 1].price = currentPrice;
  }

  return data;
}

/**
 * 메인 페이지 컴포넌트
 *
 * URL 파라미터를 분석하여 적절한 상세 페이지 컴포넌트를 렌더링합니다.
 *
 * 라우팅 로직:
 * 1. market=kr 또는 6자리 숫자: 한국 종목 → KoreanAssetDetailPage
 * 2. market=us: 미국 종목 → USAssetDetailPage
 * 3. 그 외: 기존 목업 데이터 기반 페이지
 */
export default function AssetDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1M');

  // React 19 use() hook for params
  const { ticker } = use(params);

  // URL 쿼리 파라미터에서 market 정보 가져오기
  // 검색 결과에서 클릭 시 /market/IREN?market=us 형태로 전달됨
  const marketParam = searchParams.get('market');

  // 관심종목 관리 (훅은 조건부 반환 전에 호출해야 함)
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  // 최근 본 종목 관리
  const { addToRecentlyViewed } = useRecentlyViewed();

  /**
   * 시장 유형 판별 로직:
   * 1. market 파라미터가 'kr'이면 한국 종목
   * 2. market 파라미터가 'us'이면 미국 종목
   * 3. 6자리 숫자이면 한국 종목 (레거시 URL 호환)
   * 4. 그 외: 기존 목업 데이터 사용
   */

  // 한국 종목인 경우 (market=kr 또는 6자리 숫자)
  if (marketParam === 'kr' || isKoreanStock(ticker)) {
    return <KoreanAssetDetailPage ticker={ticker} />;
  }

  // 미국 종목인 경우 (market=us)
  if (marketParam === 'us') {
    return <USAssetDetailPage ticker={ticker} />;
  }

  // 종목 데이터 가져오기 (기존 목업 데이터)
  const asset = getAssetDetail(ticker);
  const news = getRelatedNews(ticker);

  // 관심종목 상태 및 핸들러 (asset 로드 후)
  const inWatchlist = isInWatchlist(ticker);
  const handleToggleWatchlist = () => {
    if (!asset) return;
    // 미국 주식으로 기본 설정 (다른 시장은 향후 확장)
    const added = toggleWatchlist({ ticker, name: asset.name, market: 'us' });
    if (added) {
      showSuccess(`${asset.name}을(를) 관심종목에 추가했습니다`);
    } else {
      showSuccess(`${asset.name}을(를) 관심종목에서 제거했습니다`);
    }
  };

  // 종목 없음 상태
  if (!asset) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">종목을 찾을 수 없습니다</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">티커: {ticker}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  const isPositive = asset.change >= 0;
  const chartData = asset.chartData[chartPeriod];

  // 차트 데이터 범위 계산
  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const yMin = minPrice - priceRange * 0.1;
  const yMax = maxPrice + priceRange * 0.1;

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-[1200px] mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* 종목 정보 */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                  {asset.ticker}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {getAssetTypeLabel(asset.assetType)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">{asset.name}</h1>
                {/* 관심종목 버튼 */}
                <WatchlistButton
                  isInWatchlist={inWatchlist}
                  onToggle={handleToggleWatchlist}
                />
              </div>
            </div>

            {/* 가격 정보 */}
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatPrice(asset.price, asset.currency)}
                {asset.unit && <span className="text-sm font-normal text-gray-500">{asset.unit}</span>}
              </p>
              <div className="flex items-center justify-end gap-2 mt-1">
                <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatChange(asset.change, asset.currency)}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isPositive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-[1200px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 차트 + 관련 뉴스 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 차트 섹션 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              {/* 기간 탭 */}
              <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg w-fit">
                {chartPeriods.map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setChartPeriod(period.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      chartPeriod === period.id
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              {/* 차트 */}
              <div className="h-[300px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={isPositive ? '#22c55e' : '#ef4444'}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={isPositive ? '#22c55e' : '#ef4444'}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        if (chartPeriod === '1D') {
                          return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                        }
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[yMin, yMax]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={(value) => {
                        if (asset.currency === 'KRW' && value > 10000) {
                          return (value / 10000).toFixed(1) + '만';
                        }
                        return value.toLocaleString();
                      }}
                      width={60}
                    />
                    <Tooltip content={<CustomTooltip currency={asset.currency} />} />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={isPositive ? '#22c55e' : '#ef4444'}
                      strokeWidth={2}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* 관련 뉴스 섹션 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">관련 뉴스</h2>
              <div className="space-y-3">
                {news.map((item) => (
                  <NewsItem key={item.id} news={item} />
                ))}
              </div>
            </section>
          </div>

          {/* 오른쪽: 핵심 지표 */}
          <div className="space-y-6">
            {/* OHLC */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">오늘의 시세</h2>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="시가" value={formatPrice(asset.open, asset.currency)} />
                <MetricCard label="고가" value={formatPrice(asset.high, asset.currency)} />
                <MetricCard label="저가" value={formatPrice(asset.low, asset.currency)} />
                <MetricCard label="종가" value={formatPrice(asset.close, asset.currency)} />
              </div>
            </section>

            {/* 52주 고저 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">52주 범위</h2>
              <div className="mb-4">
                <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div
                    className="absolute h-2 bg-blue-500 rounded-full"
                    style={{
                      left: '0%',
                      width: `${((asset.price - asset.low52w) / (asset.high52w - asset.low52w)) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute w-3 h-3 bg-blue-600 rounded-full -top-0.5 border-2 border-white dark:border-gray-800"
                    style={{
                      left: `${((asset.price - asset.low52w) / (asset.high52w - asset.low52w)) * 100}%`,
                      transform: 'translateX(-50%)',
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="52주 최저" value={formatPrice(asset.low52w, asset.currency)} />
                <MetricCard label="52주 최고" value={formatPrice(asset.high52w, asset.currency)} />
              </div>
            </section>

            {/* 거래 정보 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">거래 정보</h2>
              <div className="grid grid-cols-1 gap-3">
                <MetricCard label="거래량" value={asset.volume} />
                {asset.marketCap && <MetricCard label="시가총액" value={asset.marketCap} />}
                {asset.volume24h && <MetricCard label="24시간 거래량" value={asset.volume24h} />}
              </div>
            </section>

            {/* 투자 지표 (주식/ETF) */}
            {(asset.per || asset.pbr || asset.eps || asset.dividendYield || asset.aum) && (
              <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">투자 지표</h2>
                <div className="grid grid-cols-2 gap-3">
                  {asset.per && <MetricCard label="PER" value={asset.per.toFixed(2) + '배'} />}
                  {asset.pbr && <MetricCard label="PBR" value={asset.pbr.toFixed(2) + '배'} />}
                  {asset.eps && (
                    <MetricCard
                      label="EPS"
                      value={asset.currency === 'KRW' ? asset.eps.toLocaleString() + '원' : '$' + asset.eps.toFixed(2)}
                    />
                  )}
                  {asset.dividendYield && <MetricCard label="배당수익률" value={asset.dividendYield} />}
                  {asset.aum && <MetricCard label="운용자산" value={asset.aum} />}
                  {asset.expenseRatio && <MetricCard label="보수율" value={asset.expenseRatio} />}
                </div>
              </section>
            )}

            {/* 암호화폐 추가 정보 */}
            {asset.circulatingSupply && (
              <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">공급 정보</h2>
                <div className="grid grid-cols-1 gap-3">
                  <MetricCard label="유통량" value={asset.circulatingSupply} />
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
