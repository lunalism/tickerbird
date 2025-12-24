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
import { useRouter } from 'next/navigation';
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
import { useKoreanStockPrice, KOREAN_STOCKS } from '@/hooks';

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
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                {stockInfo?.name || stock.stockName || ticker}
              </h1>
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
 * 메인 페이지 컴포넌트
 */
export default function AssetDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const router = useRouter();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1M');

  // React 19 use() hook for params
  const { ticker } = use(params);

  // 한국 종목인 경우 별도 컴포넌트 사용
  if (isKoreanStock(ticker)) {
    return <KoreanAssetDetailPage ticker={ticker} />;
  }

  // 종목 데이터 가져오기 (기존 목업 데이터)
  const asset = getAssetDetail(ticker);
  const news = getRelatedNews(ticker);

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
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{asset.name}</h1>
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
