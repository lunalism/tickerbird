'use client';

/**
 * GlobalOverviewContent 컴포넌트
 * 글로벌 시장 > 전체 카테고리 선택 시 표시되는 콘텐츠
 *
 * 표시 순서 (일반 투자자 관점에서 중요도 순):
 * 1. 환율 - 가장 기본적인 투자 정보
 * 2. 원자재 - 금, 유가 등 주요 자산
 * 3. 암호화폐 - 특수 자산
 */

import { cryptoData, commodityData, forexData } from '@/constants';

/**
 * 미니 차트 컴포넌트
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
    <svg viewBox="0 0 100 100" className="w-16 h-8" preserveAspectRatio="none">
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

/**
 * 암호화폐 요약 섹션
 * 상위 4개 암호화폐 표시
 */
function CryptoSummary() {
  const topCryptos = cryptoData.slice(0, 4);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return '$' + price.toFixed(2);
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>₿</span>
        <span>암호화폐</span>
      </h3>
      <div className="space-y-3">
        {topCryptos.map((crypto) => {
          const isPositive = crypto.changePercent24h >= 0;
          return (
            <div
              key={crypto.id}
              className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                  {crypto.icon}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{crypto.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{crypto.symbol}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MiniChart data={crypto.chartData} isPositive={isPositive} />
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{formatPrice(crypto.price)}</p>
                  <span className={`text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatPercent(crypto.changePercent24h)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 원자재 요약 섹션
 * 상위 4개 원자재 표시
 */
function CommoditySummary() {
  const topCommodities = commodityData.slice(0, 4);

  const getCommodityIcon = (id: string): string => {
    const icons: Record<string, string> = {
      gold: '🥇',
      silver: '🥈',
      oil: '🛢️',
      brent: '🛢️',
      natgas: '🔥',
      copper: '🔶',
    };
    return icons[id] || '📦';
  };

  const formatPrice = (price: number) => {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>🛢️</span>
        <span>원자재</span>
      </h3>
      <div className="space-y-3">
        {topCommodities.map((commodity) => {
          const isPositive = commodity.change >= 0;
          return (
            <div
              key={commodity.id}
              className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-lg">
                  {getCommodityIcon(commodity.id)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{commodity.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{commodity.symbol}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MiniChart data={commodity.chartData} isPositive={isPositive} />
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{formatPrice(commodity.price)}</p>
                  <span className={`text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatPercent(commodity.changePercent)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 환율 요약 섹션 (원화 기준)
 * 주요 4개 통화의 원화 환율 표시
 *
 * 표시 통화:
 * - 달러/원 (USD/KRW)
 * - 유로/원 (EUR/KRW = USD/KRW × EUR/USD)
 * - 100엔/원 (JPY/KRW × 100)
 * - 파운드/원 (GBP/KRW = USD/KRW × GBP/USD)
 */
function ForexSummary() {
  // 원본 데이터에서 필요한 환율 추출
  const usdkrw = forexData.find(f => f.id === 'usdkrw');
  const eurusd = forexData.find(f => f.id === 'eurusd');
  const usdjpy = forexData.find(f => f.id === 'usdjpy');
  const gbpusd = forexData.find(f => f.id === 'gbpusd');

  // USD/KRW가 없으면 빈 상태 표시
  if (!usdkrw) return null;

  // 원화 기준 환율 계산
  const krwForexList = [
    // 달러/원 - 직접 사용
    {
      id: 'usdkrw',
      pair: '달러/원',
      name: '미국 달러',
      krwRate: usdkrw.rate,
      changePercent: usdkrw.changePercent,
      chartData: usdkrw.chartData,
      flags: '🇺🇸🇰🇷',
    },
    // 유로/원 = USD/KRW × EUR/USD
    ...(eurusd ? [{
      id: 'eurkrw',
      pair: '유로/원',
      name: '유럽 유로',
      krwRate: usdkrw.rate * eurusd.rate,
      changePercent: eurusd.changePercent + usdkrw.changePercent,
      chartData: eurusd.chartData.map((rate, i) => usdkrw.chartData[i] * rate),
      flags: '🇪🇺🇰🇷',
    }] : []),
    // 100엔/원 = (USD/KRW ÷ USD/JPY) × 100
    ...(usdjpy ? [{
      id: 'jpykrw',
      pair: '100엔/원',
      name: '일본 엔',
      krwRate: (usdkrw.rate / usdjpy.rate) * 100,
      changePercent: usdkrw.changePercent - usdjpy.changePercent,
      chartData: usdjpy.chartData.map((rate, i) => (usdkrw.chartData[i] / rate) * 100),
      flags: '🇯🇵🇰🇷',
    }] : []),
    // 파운드/원 = USD/KRW × GBP/USD
    ...(gbpusd ? [{
      id: 'gbpkrw',
      pair: '파운드/원',
      name: '영국 파운드',
      krwRate: usdkrw.rate * gbpusd.rate,
      changePercent: gbpusd.changePercent + usdkrw.changePercent,
      chartData: gbpusd.chartData.map((rate, i) => usdkrw.chartData[i] * rate),
      flags: '🇬🇧🇰🇷',
    }] : []),
  ];

  /**
   * 원화 환율 포맷팅 (예: 1,434.50원)
   */
  const formatKRWRate = (rate: number): string => {
    return rate.toLocaleString('ko-KR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + '원';
  };

  /**
   * 변동률 포맷팅
   */
  const formatPercent = (percent: number): string => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>💱</span>
        <span>환율</span>
        <span className="text-xs font-normal text-gray-400">(원화 기준)</span>
      </h3>
      <div className="space-y-3">
        {krwForexList.map((forex) => {
          const isPositive = forex.changePercent >= 0;
          return (
            <div
              key={forex.id}
              className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="text-xl">
                  {forex.flags}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{forex.pair}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{forex.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MiniChart data={forex.chartData} isPositive={isPositive} />
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{formatKRWRate(forex.krwRate)}</p>
                  <span className={`text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatPercent(forex.changePercent)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GlobalOverviewContent() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        글로벌 시장 요약
      </h2>
      {/* 3열 그리드 레이아웃 - 중요도 순: 환율 → 원자재 → 암호화폐 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ForexSummary />
        <CommoditySummary />
        <CryptoSummary />
      </div>
    </section>
  );
}
