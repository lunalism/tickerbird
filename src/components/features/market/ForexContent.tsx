'use client';

/**
 * ForexContent 컴포넌트
 * 환율 카테고리 선택 시 표시되는 콘텐츠
 *
 * 한국 사용자 기준 원화 환율 표시:
 * - 달러/원: USD/KRW 직접 표시
 * - 유로/원: USD/KRW × EUR/USD
 * - 100엔/원: (USD/KRW ÷ USD/JPY) × 100
 * - 파운드/원: USD/KRW × GBP/USD
 *
 * 모든 환율은 원화 기준으로 계산하여 표시합니다.
 */

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { forexData } from '@/constants';

// ============================================
// 타입 정의
// ============================================

/** 원화 기준 환율 데이터 */
interface KRWForex {
  /** 고유 ID */
  id: string;
  /** 통화쌍 표시명 (예: 달러/원) */
  pair: string;
  /** 통화명 */
  name: string;
  /** 원화 환율 */
  krwRate: number;
  /** 변동폭 (원화 기준) */
  change: number;
  /** 변동률 (%) */
  changePercent: number;
  /** 차트 데이터 (원화 기준) */
  chartData: number[];
  /** 국기 이모지 */
  flags: string;
}

// ============================================
// 원화 기준 환율 계산 함수
// ============================================

/**
 * 원화 기준 환율 데이터 계산
 *
 * 원본 환율 데이터(forexData)를 기반으로 한국 사용자용 원화 환율 계산
 * - 달러/원: USD/KRW 직접 사용
 * - 유로/원: USD/KRW × EUR/USD
 * - 100엔/원: (USD/KRW ÷ USD/JPY) × 100
 * - 파운드/원: USD/KRW × GBP/USD
 * - 위안/원: USD/KRW ÷ USD/CNY
 * - 호주달러/원: USD/KRW × AUD/USD
 *
 * @returns 원화 기준 환율 데이터 배열
 */
function calculateKRWForexData(): KRWForex[] {
  // 기준 환율 추출 (USD/KRW)
  const usdkrw = forexData.find(f => f.id === 'usdkrw');
  const eurusd = forexData.find(f => f.id === 'eurusd');
  const usdjpy = forexData.find(f => f.id === 'usdjpy');
  const gbpusd = forexData.find(f => f.id === 'gbpusd');
  const usdcny = forexData.find(f => f.id === 'usdcny');
  const audusd = forexData.find(f => f.id === 'audusd');

  // USD/KRW가 없으면 빈 배열 반환
  if (!usdkrw) return [];

  const krwForexList: KRWForex[] = [];

  // 1. 달러/원 (USD/KRW) - 직접 사용
  krwForexList.push({
    id: 'usdkrw',
    pair: '달러/원',
    name: '미국 달러',
    krwRate: usdkrw.rate,
    change: usdkrw.change,
    changePercent: usdkrw.changePercent,
    chartData: usdkrw.chartData,
    flags: '🇺🇸🇰🇷',
  });

  // 2. 유로/원 (EUR/KRW) = USD/KRW × EUR/USD
  if (eurusd) {
    const eurKrwRate = usdkrw.rate * eurusd.rate;
    // 차트 데이터도 원화 기준으로 변환
    const eurKrwChartData = eurusd.chartData.map((eurRate, i) =>
      usdkrw.chartData[i] * eurRate
    );
    krwForexList.push({
      id: 'eurkrw',
      pair: '유로/원',
      name: '유럽 유로',
      krwRate: eurKrwRate,
      change: eurKrwRate * (eurusd.changePercent / 100), // 근사값
      changePercent: eurusd.changePercent + usdkrw.changePercent, // 복합 변동률
      chartData: eurKrwChartData,
      flags: '🇪🇺🇰🇷',
    });
  }

  // 3. 100엔/원 (JPY/KRW × 100) = (USD/KRW ÷ USD/JPY) × 100
  if (usdjpy) {
    const jpyKrwRate = (usdkrw.rate / usdjpy.rate) * 100;
    // 차트 데이터도 원화 기준으로 변환
    const jpyKrwChartData = usdjpy.chartData.map((jpyRate, i) =>
      (usdkrw.chartData[i] / jpyRate) * 100
    );
    // 엔화 강세(USD/JPY 하락) → 100엔/원 상승, 엔화 약세(USD/JPY 상승) → 100엔/원 하락
    const jpyChangePercent = usdkrw.changePercent - usdjpy.changePercent;
    krwForexList.push({
      id: 'jpykrw',
      pair: '100엔/원',
      name: '일본 엔 (100엔당)',
      krwRate: jpyKrwRate,
      change: jpyKrwRate * (jpyChangePercent / 100),
      changePercent: jpyChangePercent,
      chartData: jpyKrwChartData,
      flags: '🇯🇵🇰🇷',
    });
  }

  // 4. 파운드/원 (GBP/KRW) = USD/KRW × GBP/USD
  if (gbpusd) {
    const gbpKrwRate = usdkrw.rate * gbpusd.rate;
    const gbpKrwChartData = gbpusd.chartData.map((gbpRate, i) =>
      usdkrw.chartData[i] * gbpRate
    );
    krwForexList.push({
      id: 'gbpkrw',
      pair: '파운드/원',
      name: '영국 파운드',
      krwRate: gbpKrwRate,
      change: gbpKrwRate * ((gbpusd.changePercent + usdkrw.changePercent) / 100),
      changePercent: gbpusd.changePercent + usdkrw.changePercent,
      chartData: gbpKrwChartData,
      flags: '🇬🇧🇰🇷',
    });
  }

  // 5. 위안/원 (CNY/KRW) = USD/KRW ÷ USD/CNY
  if (usdcny) {
    const cnyKrwRate = usdkrw.rate / usdcny.rate;
    const cnyKrwChartData = usdcny.chartData.map((cnyRate, i) =>
      usdkrw.chartData[i] / cnyRate
    );
    // 위안 강세(USD/CNY 하락) → 위안/원 상승
    const cnyChangePercent = usdkrw.changePercent - usdcny.changePercent;
    krwForexList.push({
      id: 'cnykrw',
      pair: '위안/원',
      name: '중국 위안',
      krwRate: cnyKrwRate,
      change: cnyKrwRate * (cnyChangePercent / 100),
      changePercent: cnyChangePercent,
      chartData: cnyKrwChartData,
      flags: '🇨🇳🇰🇷',
    });
  }

  // 6. 호주달러/원 (AUD/KRW) = USD/KRW × AUD/USD
  if (audusd) {
    const audKrwRate = usdkrw.rate * audusd.rate;
    const audKrwChartData = audusd.chartData.map((audRate, i) =>
      usdkrw.chartData[i] * audRate
    );
    krwForexList.push({
      id: 'audkrw',
      pair: '호주달러/원',
      name: '호주 달러',
      krwRate: audKrwRate,
      change: audKrwRate * ((audusd.changePercent + usdkrw.changePercent) / 100),
      changePercent: audusd.changePercent + usdkrw.changePercent,
      chartData: audKrwChartData,
      flags: '🇦🇺🇰🇷',
    });
  }

  return krwForexList;
}

// ============================================
// 컴포넌트
// ============================================

/**
 * 미니 차트 컴포넌트
 * 환율의 최근 추이를 SVG 라인으로 시각화
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
    <svg viewBox="0 0 100 100" className="w-20 h-10" preserveAspectRatio="none">
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
 * 환율 카드 컴포넌트 (원화 기준)
 * 개별 환율 정보를 카드 형태로 표시
 * 모든 환율은 원화 기준으로 표시됩니다.
 */
function ForexCard({ forex }: { forex: KRWForex }) {
  const router = useRouter();
  const isPositive = forex.changePercent >= 0;

  /**
   * 원화 환율 포맷팅
   * 모든 환율을 "X,XXX.XX원" 형식으로 표시
   */
  const formatKRWRate = (rate: number): string => {
    return rate.toLocaleString('ko-KR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + '원';
  };

  /**
   * 변동폭 포맷팅 (원화 기준)
   */
  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return sign + change.toLocaleString('ko-KR', {
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
    <div
      onClick={() => router.push(`/market/${forex.id}`)}
      className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer"
    >
      {/* 헤더: 국기 + 통화쌍 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* 국기 이모지 */}
          <div className="text-2xl">
            {forex.flags}
          </div>
          <div>
            {/* 통화쌍 (원화 기준) */}
            <h3 className="font-semibold text-gray-900 dark:text-white">{forex.pair}</h3>
            {/* 통화명 */}
            <p className="text-sm text-gray-500 dark:text-gray-400">{forex.name}</p>
          </div>
        </div>
        {/* 미니 차트 */}
        <MiniChart data={forex.chartData} isPositive={isPositive} />
      </div>

      {/* 환율 정보 (원화 기준) */}
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatKRWRate(forex.krwRate)}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatChange(forex.change)}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isPositive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {formatPercent(forex.changePercent)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 환율 콘텐츠 컴포넌트
 * 한국 사용자를 위해 모든 환율을 원화 기준으로 표시
 */
export function ForexContent() {
  // 원화 기준 환율 데이터 계산 (메모이제이션)
  const krwForexData = useMemo(() => calculateKRWForexData(), []);

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        환율
        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
          (원화 기준)
        </span>
      </h2>
      {/* 환율 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {krwForexData.map((forex) => (
          <ForexCard key={forex.id} forex={forex} />
        ))}
      </div>
    </section>
  );
}
