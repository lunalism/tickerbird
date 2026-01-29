'use client';

/**
 * ForexContent 컴포넌트
 *
 * 환율 카테고리 선택 시 표시되는 콘텐츠
 *
 * ============================================================
 * 데이터 소스:
 * ============================================================
 * - 한국은행 ECOS API (실시간 환율)
 * - API 실패 시 mock 데이터 fallback
 *
 * ============================================================
 * 표시 환율:
 * ============================================================
 * - 원/달러: 1 USD = X KRW (한국은행 직접 제공)
 * - 원/100엔: 100 JPY = X KRW (한국은행 직접 제공)
 * - 원/유로: 1 EUR = X KRW (한국은행 직접 제공)
 * - 원/파운드: 1 GBP = X KRW (한국은행 직접 제공)
 * - 원/위안, 원/호주달러: mock 데이터에서 계산
 *
 * 표기법: "원/외화" (한국 원화가 먼저)
 * 국기 순서: 🇰🇷(한국) + 외국 국기
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { forexData } from '@/constants';

// ============================================
// 상수 정의
// ============================================

/** 환율 자동 새로고침 간격 (1분 = 60,000ms) */
const FOREX_REFRESH_INTERVAL = 60000;

// ============================================
// 타입 정의
// ============================================

/** 원화 기준 환율 데이터 */
interface KRWForex {
  /** 고유 ID */
  id: string;
  /** 통화쌍 표시명 (예: 원/달러) */
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
  /** 기준일 */
  date?: string;
  /** 데이터 소스 (api: 한국은행, mock: 더미) */
  source: 'api' | 'mock';
}

/** 한국은행 API 응답 타입 */
interface BOKExchangeRateData {
  rate: number;
  change: number;
  changePercent: number;
  date: string;
}

/** 한국은행 API 응답 전체 */
interface BOKAPIResponse {
  success: boolean;
  data: {
    usdkrw: BOKExchangeRateData;
    jpykrw: BOKExchangeRateData;
    eurkrw: BOKExchangeRateData;
    gbpkrw: BOKExchangeRateData;
  } | null;
  error?: string;
  timestamp: string;
}

// ============================================
// 한국은행 API 호출 함수
// ============================================

/**
 * 한국은행 ECOS API에서 환율 데이터 조회
 *
 * @returns 환율 데이터 또는 null (실패 시)
 */
async function fetchBOKExchangeRate(): Promise<BOKAPIResponse | null> {
  try {
    const response = await fetch('/api/bok/exchange-rate', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // 캐시 비활성화: 항상 최신 환율 데이터 요청
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[ForexContent] API 응답 오류:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[ForexContent] API 호출 실패:', error);
    return null;
  }
}

// ============================================
// Mock 데이터 기반 환율 계산 함수 (Fallback)
// ============================================

/**
 * Mock 데이터 기반 원화 환율 계산 (API 실패 시 사용)
 *
 * @returns 원화 기준 환율 데이터 배열
 */
function calculateMockKRWForexData(): KRWForex[] {
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

  // 1. 원/달러 (KRW/USD) - 직접 사용
  krwForexList.push({
    id: 'usdkrw',
    pair: '원/달러',
    name: '미국 달러',
    krwRate: usdkrw.rate,
    change: usdkrw.change,
    changePercent: usdkrw.changePercent,
    chartData: usdkrw.chartData,
    flags: '🇰🇷🇺🇸',
    source: 'mock',
  });

  // 2. 원/유로 (KRW/EUR) = USD/KRW × EUR/USD
  if (eurusd) {
    const eurKrwRate = usdkrw.rate * eurusd.rate;
    const eurKrwChartData = eurusd.chartData.map((eurRate, i) =>
      usdkrw.chartData[i] * eurRate
    );
    krwForexList.push({
      id: 'eurkrw',
      pair: '원/유로',
      name: '유럽 유로',
      krwRate: eurKrwRate,
      change: eurKrwRate * (eurusd.changePercent / 100),
      changePercent: eurusd.changePercent + usdkrw.changePercent,
      chartData: eurKrwChartData,
      flags: '🇰🇷🇪🇺',
      source: 'mock',
    });
  }

  // 3. 원/100엔 (KRW/100JPY) = (USD/KRW ÷ USD/JPY) × 100
  if (usdjpy) {
    const jpyKrwRate = (usdkrw.rate / usdjpy.rate) * 100;
    const jpyKrwChartData = usdjpy.chartData.map((jpyRate, i) =>
      (usdkrw.chartData[i] / jpyRate) * 100
    );
    const jpyChangePercent = usdkrw.changePercent - usdjpy.changePercent;
    krwForexList.push({
      id: 'jpykrw',
      pair: '원/100엔',
      name: '일본 엔 (100엔당)',
      krwRate: jpyKrwRate,
      change: jpyKrwRate * (jpyChangePercent / 100),
      changePercent: jpyChangePercent,
      chartData: jpyKrwChartData,
      flags: '🇰🇷🇯🇵',
      source: 'mock',
    });
  }

  // 4. 원/파운드 (KRW/GBP) = USD/KRW × GBP/USD
  if (gbpusd) {
    const gbpKrwRate = usdkrw.rate * gbpusd.rate;
    const gbpKrwChartData = gbpusd.chartData.map((gbpRate, i) =>
      usdkrw.chartData[i] * gbpRate
    );
    krwForexList.push({
      id: 'gbpkrw',
      pair: '원/파운드',
      name: '영국 파운드',
      krwRate: gbpKrwRate,
      change: gbpKrwRate * ((gbpusd.changePercent + usdkrw.changePercent) / 100),
      changePercent: gbpusd.changePercent + usdkrw.changePercent,
      chartData: gbpKrwChartData,
      flags: '🇰🇷🇬🇧',
      source: 'mock',
    });
  }

  // 5. 원/위안 (KRW/CNY) = USD/KRW ÷ USD/CNY
  if (usdcny) {
    const cnyKrwRate = usdkrw.rate / usdcny.rate;
    const cnyKrwChartData = usdcny.chartData.map((cnyRate, i) =>
      usdkrw.chartData[i] / cnyRate
    );
    const cnyChangePercent = usdkrw.changePercent - usdcny.changePercent;
    krwForexList.push({
      id: 'cnykrw',
      pair: '원/위안',
      name: '중국 위안',
      krwRate: cnyKrwRate,
      change: cnyKrwRate * (cnyChangePercent / 100),
      changePercent: cnyChangePercent,
      chartData: cnyKrwChartData,
      flags: '🇰🇷🇨🇳',
      source: 'mock',
    });
  }

  // 6. 원/호주달러 (KRW/AUD) = USD/KRW × AUD/USD
  if (audusd) {
    const audKrwRate = usdkrw.rate * audusd.rate;
    const audKrwChartData = audusd.chartData.map((audRate, i) =>
      usdkrw.chartData[i] * audRate
    );
    krwForexList.push({
      id: 'audkrw',
      pair: '원/호주달러',
      name: '호주 달러',
      krwRate: audKrwRate,
      change: audKrwRate * ((audusd.changePercent + usdkrw.changePercent) / 100),
      changePercent: audusd.changePercent + usdkrw.changePercent,
      chartData: audKrwChartData,
      flags: '🇰🇷🇦🇺',
      source: 'mock',
    });
  }

  return krwForexList;
}

/**
 * 한국은행 API 데이터를 KRWForex 형식으로 변환
 *
 * @param apiData - 한국은행 API 응답 데이터
 * @returns 원화 기준 환율 데이터 배열
 */
function convertAPIDataToKRWForex(apiData: BOKAPIResponse['data']): KRWForex[] {
  if (!apiData) return [];

  const krwForexList: KRWForex[] = [];

  // 1. 원/달러 (USD/KRW) - 한국은행 직접 제공
  if (apiData.usdkrw) {
    krwForexList.push({
      id: 'usdkrw',
      pair: '원/달러',
      name: '미국 달러',
      krwRate: apiData.usdkrw.rate,
      change: apiData.usdkrw.change,
      changePercent: apiData.usdkrw.changePercent,
      chartData: generateChartData(apiData.usdkrw.rate, apiData.usdkrw.changePercent),
      flags: '🇰🇷🇺🇸',
      date: apiData.usdkrw.date,
      source: 'api',
    });
  }

  // 2. 원/유로 (EUR/KRW) - 한국은행 직접 제공
  if (apiData.eurkrw) {
    krwForexList.push({
      id: 'eurkrw',
      pair: '원/유로',
      name: '유럽 유로',
      krwRate: apiData.eurkrw.rate,
      change: apiData.eurkrw.change,
      changePercent: apiData.eurkrw.changePercent,
      chartData: generateChartData(apiData.eurkrw.rate, apiData.eurkrw.changePercent),
      flags: '🇰🇷🇪🇺',
      date: apiData.eurkrw.date,
      source: 'api',
    });
  }

  // 3. 원/100엔 (JPY/KRW) - 한국은행 직접 제공
  if (apiData.jpykrw) {
    krwForexList.push({
      id: 'jpykrw',
      pair: '원/100엔',
      name: '일본 엔 (100엔당)',
      krwRate: apiData.jpykrw.rate,
      change: apiData.jpykrw.change,
      changePercent: apiData.jpykrw.changePercent,
      chartData: generateChartData(apiData.jpykrw.rate, apiData.jpykrw.changePercent),
      flags: '🇰🇷🇯🇵',
      date: apiData.jpykrw.date,
      source: 'api',
    });
  }

  // 4. 원/파운드 (GBP/KRW) - 한국은행 직접 제공
  if (apiData.gbpkrw) {
    krwForexList.push({
      id: 'gbpkrw',
      pair: '원/파운드',
      name: '영국 파운드',
      krwRate: apiData.gbpkrw.rate,
      change: apiData.gbpkrw.change,
      changePercent: apiData.gbpkrw.changePercent,
      chartData: generateChartData(apiData.gbpkrw.rate, apiData.gbpkrw.changePercent),
      flags: '🇰🇷🇬🇧',
      date: apiData.gbpkrw.date,
      source: 'api',
    });
  }

  // 5, 6. 원/위안, 원/호주달러는 한국은행에서 직접 제공하지 않으므로
  // mock 데이터에서 계산하여 추가
  const mockData = calculateMockKRWForexData();
  const cnyData = mockData.find(f => f.id === 'cnykrw');
  const audData = mockData.find(f => f.id === 'audkrw');

  if (cnyData) krwForexList.push(cnyData);
  if (audData) krwForexList.push(audData);

  return krwForexList;
}

/**
 * 차트 데이터 생성 (간단한 시뮬레이션)
 *
 * API에서 차트 데이터를 제공하지 않으므로,
 * 현재 환율과 변동률을 기반으로 추세 데이터 생성
 *
 * @param currentRate - 현재 환율
 * @param changePercent - 변동률
 * @returns 9개 포인트의 차트 데이터
 */
function generateChartData(currentRate: number, changePercent: number): number[] {
  const points = 9;
  const data: number[] = [];

  // 변동률 기반 추세 생성
  // 양수면 상승 추세, 음수면 하락 추세
  const trend = changePercent / 100;
  const volatility = Math.abs(trend) * 0.5; // 변동성

  for (let i = 0; i < points; i++) {
    // 과거(0)에서 현재(8)로 갈수록 현재 가격에 수렴
    const progress = i / (points - 1);
    const baseChange = trend * (1 - progress); // 과거일수록 차이 큼
    const noise = (Math.random() - 0.5) * volatility * (1 - progress);
    const rate = currentRate * (1 - baseChange + noise);
    data.push(Math.round(rate * 100) / 100);
  }

  return data;
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
        {/* 기준일 표시 (API 데이터인 경우) */}
        {forex.date && forex.source === 'api' && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            기준일: {forex.date}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * 로딩 스켈레톤 컴포넌트
 */
function ForexSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 animate-pulse"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
              <div>
                <div className="w-20 h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
            <div className="w-20 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="w-24 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * 환율 콘텐츠 컴포넌트
 *
 * 한국은행 ECOS API를 통해 실시간 환율 데이터를 조회합니다.
 * API 실패 시 mock 데이터로 fallback합니다.
 */
export function ForexContent() {
  // 상태 관리
  const [forexData, setForexData] = useState<KRWForex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'mock'>('mock');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 자동 새로고침 타이머 ref
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 환율 데이터 로드 함수
   * - 초기 로드 및 자동 새로고침에서 사용
   * - isRefresh: true면 로딩 스피너 표시 안함 (백그라운드 갱신)
   */
  const loadExchangeRates = useCallback(async (isRefresh = false) => {
    // 초기 로드 시에만 로딩 표시
    if (!isRefresh) {
      setIsLoading(true);
    }
    setError(null);

    try {
      // 한국은행 API 호출
      const apiResponse = await fetchBOKExchangeRate();

      if (apiResponse?.success && apiResponse.data) {
        // API 데이터 변환
        const krwForexData = convertAPIDataToKRWForex(apiResponse.data);
        setForexData(krwForexData);
        setDataSource('api');
        setLastUpdated(new Date());
        if (isRefresh) {
          console.log('[ForexContent] 환율 자동 갱신 완료');
        } else {
          console.log('[ForexContent] 한국은행 API 데이터 로드 성공');
        }
      } else {
        // API 실패 - mock 데이터 사용
        console.warn('[ForexContent] API 실패, mock 데이터 사용');
        const mockData = calculateMockKRWForexData();
        setForexData(mockData);
        setDataSource('mock');
        if (apiResponse?.error) {
          setError(apiResponse.error);
        }
      }
    } catch (err) {
      // 예외 발생 - mock 데이터 사용
      console.error('[ForexContent] 데이터 로드 실패:', err);
      const mockData = calculateMockKRWForexData();
      setForexData(mockData);
      setDataSource('mock');
      setError('환율 데이터를 불러오는데 실패했습니다.');
    } finally {
      if (!isRefresh) {
        setIsLoading(false);
      }
    }
  }, []);

  // 초기 로드 및 자동 새로고침 설정
  useEffect(() => {
    // 초기 로드
    loadExchangeRates(false);

    // 자동 새로고침 타이머 설정 (1분마다)
    refreshTimerRef.current = setInterval(() => {
      loadExchangeRates(true);
    }, FOREX_REFRESH_INTERVAL);

    // 클린업: 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [loadExchangeRates]);

  // 로딩 중
  if (isLoading) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          환율
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            (원화 기준)
          </span>
        </h2>
        <ForexSkeleton />
      </section>
    );
  }

  return (
    <section>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            환율
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              (매매기준율)
            </span>
            <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
              1분 자동갱신
            </span>
          </h2>
          {/* 마지막 갱신 시간 */}
          {lastUpdated && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              마지막 갱신: {lastUpdated.toLocaleTimeString('ko-KR')}
            </p>
          )}
        </div>
        {/* 데이터 소스 표시 */}
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-1 rounded-full ${
            dataSource === 'api'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {dataSource === 'api' ? '🏦 한국은행' : '📊 샘플 데이터'}
          </span>
          {dataSource === 'api' && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              은행 간 기준환율
            </span>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && dataSource === 'mock' && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            ⚠️ {error} (샘플 데이터를 표시합니다)
          </p>
        </div>
      )}

      {/* 환율 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {forexData.map((forex) => (
          <ForexCard key={forex.id} forex={forex} />
        ))}
      </div>
    </section>
  );
}
