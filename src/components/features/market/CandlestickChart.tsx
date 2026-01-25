'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  MouseEventParams,
} from 'lightweight-charts';

/**
 * 차트 데이터 포인트 인터페이스
 * 한국투자증권 API에서 반환하는 OHLCV 데이터 형식
 */
interface ChartDataPoint {
  time: string;   // 날짜 (YYYY-MM-DD 형식)
  open: number;   // 시가
  high: number;   // 고가
  low: number;    // 저가
  close: number;  // 종가
  volume: number; // 거래량
}

/**
 * 툴팁에 표시할 데이터 인터페이스
 */
interface TooltipData {
  date: string;       // 날짜 (포맷된 문자열)
  open: number;       // 시가
  high: number;       // 고가
  low: number;        // 저가
  close: number;      // 종가
  volume: number;     // 거래량
  change: number;     // 전일 대비 등락 금액
  changePercent: number; // 전일 대비 등락률 (%)
}

/**
 * 캔들스틱 차트 컴포넌트 Props
 */
interface CandlestickChartProps {
  symbol: string;                      // 종목 코드 (한국: 6자리, 미국: 티커)
  isOverseas?: boolean;                // 해외 주식 여부
  exchange?: 'NAS' | 'NYS' | 'AMS';    // 미국 거래소 코드
}

// 차트 기간 타입 (일봉/주봉/월봉)
type PeriodType = 'D' | 'W' | 'M';

// 기간 선택 옵션
const periodOptions = [
  { label: '일봉', value: 'D' as PeriodType },
  { label: '주봉', value: 'W' as PeriodType },
  { label: '월봉', value: 'M' as PeriodType },
];

// 데이터 조회 개수 옵션 (영업일 기준)
const countOptions = [
  { label: '1개월', value: 20 },   // 약 1개월 (영업일)
  { label: '3개월', value: 60 },   // 약 3개월
  { label: '6개월', value: 120 },  // 약 6개월
  { label: '1년', value: 250 },    // 약 1년
  { label: '전체', value: 500 },   // 최대 조회
];

/**
 * 캔들스틱 차트 컴포넌트
 *
 * TradingView Lightweight Charts를 사용한 주식 캔들 차트
 * 한국 스타일 색상 적용: 양봉(상승)=빨강, 음봉(하락)=파랑
 *
 * @param symbol - 종목 코드
 * @param isOverseas - 해외 주식 여부 (기본값: false)
 * @param exchange - 미국 거래소 코드 (NAS/NYS/AMS)
 */
export default function CandlestickChart({ symbol, isOverseas = false, exchange }: CandlestickChartProps) {
  // DOM 참조
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candlestickSeriesRef = useRef<ISeriesApi<any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);

  // 상태 관리
  const [period, setPeriod] = useState<PeriodType>('D');  // 선택된 기간 (일봉/주봉/월봉)
  const [count, setCount] = useState(60);                  // 조회할 데이터 개수
  const [loading, setLoading] = useState(true);            // 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 메시지
  const [isDarkMode, setIsDarkMode] = useState(false);     // 다크모드 여부
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null); // 호버 툴팁 데이터

  // 차트 데이터 저장 (툴팁용)
  const chartDataRef = useRef<ChartDataPoint[]>([]);

  // 다크모드 감지 (HTML 요소의 'dark' 클래스 변화 감지)
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // 차트 초기화 (다크모드 변경 시 재생성)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;

    // 기존 차트 인스턴스 제거 (메모리 누수 방지)
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // 차트 옵션 설정 (다크모드에 따라 색상 변경)
    const chartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: isDarkMode ? '#1a1a2e' : '#ffffff' },
        textColor: isDarkMode ? '#d1d5db' : '#374151',
      },
      grid: {
        vertLines: { color: isDarkMode ? '#2d2d44' : '#e5e7eb' },  // 세로 그리드 선
        horzLines: { color: isDarkMode ? '#2d2d44' : '#e5e7eb' },  // 가로 그리드 선
      },
      crosshair: {
        mode: CrosshairMode.Normal,  // 십자선 모드
      },
      rightPriceScale: {
        borderColor: isDarkMode ? '#2d2d44' : '#e5e7eb',  // 우측 가격 축 테두리
      },
      timeScale: {
        borderColor: isDarkMode ? '#2d2d44' : '#e5e7eb',  // 하단 시간 축 테두리
        timeVisible: true,   // 시간 표시
        secondsVisible: false,
      },
      width: container.clientWidth,  // 컨테이너 너비에 맞춤
      height: 400,                    // 차트 높이 (px)
    };

    // 차트 인스턴스 생성
    const chart = createChart(container, chartOptions);
    chartRef.current = chart;

    // 캔들스틱 시리즈 (lightweight-charts v5 API)
    // 한국 스타일 색상: 양봉(상승) = 빨강, 음봉(하락) = 파랑
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#EF4444',       // 양봉(상승) 몸통 색상 - 빨강 (red-500)
      downColor: '#3B82F6',     // 음봉(하락) 몸통 색상 - 파랑 (blue-500)
      borderUpColor: '#EF4444', // 양봉 테두리 색상
      borderDownColor: '#3B82F6', // 음봉 테두리 색상
      wickUpColor: '#EF4444',   // 양봉 꼬리(심지) 색상
      wickDownColor: '#3B82F6', // 음봉 꼬리(심지) 색상
    });
    candlestickSeriesRef.current = candlestickSeries;

    // 거래량 히스토그램 시리즈 (lightweight-charts v5 API)
    // 단일 회색으로 통일 (양봉/음봉 구분 없음)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#9CA3AF',         // 거래량 막대 색상 - 연회색 (gray-400)
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',         // 별도 가격 축 사용 (메인 축과 분리)
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // ========================================
    // 크로스헤어(십자선) 이동 이벤트 핸들러
    // 마우스 호버 시 툴팁 데이터 업데이트
    // ========================================
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      // 차트 영역 밖으로 나가면 툴팁 숨김
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setTooltipData(null);
        return;
      }

      // 현재 호버 중인 캔들 데이터 가져오기
      const data = chartDataRef.current;
      const timeStr = param.time as string;

      // 해당 날짜의 데이터 찾기
      const candleData = data.find(d => d.time === timeStr);
      if (!candleData) {
        setTooltipData(null);
        return;
      }

      // 전일 데이터 찾기 (등락 계산용)
      const currentIndex = data.findIndex(d => d.time === timeStr);
      const prevData = currentIndex > 0 ? data[currentIndex - 1] : null;

      // 등락 계산 (전일 종가 대비)
      const prevClose = prevData ? prevData.close : candleData.open;
      const change = candleData.close - prevClose;
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

      // 날짜 포맷팅 (YYYY-MM-DD → YYYY년 MM월 DD일)
      const [year, month, day] = timeStr.split('-');
      const formattedDate = `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;

      setTooltipData({
        date: formattedDate,
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: candleData.volume,
        change,
        changePercent,
      });
    });

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ width: container.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [isDarkMode]);

  // 차트 데이터 조회 및 업데이트 (종목, 기간, 개수 변경 시)
  useEffect(() => {
    const fetchData = async () => {
      // 차트 시리즈가 초기화되지 않은 경우 스킵
      if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return;

      setLoading(true);
      setError(null);

      try {
        // 해외 주식은 기간 파라미터 형식이 다름 (0=일, 1=주, 2=월)
        const apiPeriod = isOverseas
          ? (period === 'D' ? '0' : period === 'W' ? '1' : '2')
          : period;

        // API 엔드포인트 결정 (국내/해외)
        const url = isOverseas
          ? `/api/kis/overseas/stock/chart?symbol=${symbol}&period=${apiPeriod}&count=${count}${exchange ? `&exchange=${exchange}` : ''}`
          : `/api/kis/stock/chart?symbol=${symbol}&period=${period}&count=${count}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch chart data');
        }

        const result = await response.json();
        const data: ChartDataPoint[] = result.data || [];

        if (data.length === 0) {
          setError('차트 데이터가 없습니다');
          return;
        }

        // 차트 데이터 저장 (툴팁용) - 시간순 정렬 후 저장
        const sortedData = [...data].sort((a, b) => a.time.localeCompare(b.time));
        chartDataRef.current = sortedData;

        // 캔들스틱 데이터 변환 및 시간순 정렬
        const candleData: CandlestickData<string>[] = data
          .map(item => ({
            time: item.time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          }))
          .sort((a, b) => a.time.localeCompare(b.time));

        // 거래량 데이터 변환 - 단일 회색 사용 (양봉/음봉 구분 없음)
        const volumeData: HistogramData<string>[] = data
          .map(item => ({
            time: item.time,
            value: item.volume,
            color: '#9CA3AF',   // 연회색 (gray-400) - 모든 막대 동일 색상
          }))
          .sort((a, b) => a.time.localeCompare(b.time));

        candlestickSeriesRef.current.setData(candleData);
        volumeSeriesRef.current.setData(volumeData);

        // Fit content
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      } catch (err) {
        console.error('Chart data fetch error:', err);
        setError('차트 데이터를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, period, count, isOverseas, exchange]);

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Period selector */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                period === opt.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Count selector */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {countOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCount(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                count === opt.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-10">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600 dark:text-gray-400">차트 로딩 중...</span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-10">
            <span className="text-red-500">{error}</span>
          </div>
        )}

        {/* ========================================
            호버 툴팁 (차트 상단에 고정 표시)
            마우스 호버 시 해당 날짜의 OHLCV + 등락 정보 표시
            ======================================== */}
        {tooltipData && (
          <div className="absolute top-2 left-2 z-20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 dark:border-gray-700 text-sm">
            {/* 날짜 */}
            <p className="font-semibold text-gray-900 dark:text-white mb-2">
              {tooltipData.date}
            </p>

            {/* OHLC 정보 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">시가</span>
                <span className="text-gray-900 dark:text-white font-medium ml-2">
                  {tooltipData.open.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">고가</span>
                <span className="text-red-600 dark:text-red-400 font-medium ml-2">
                  {tooltipData.high.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">저가</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium ml-2">
                  {tooltipData.low.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">종가</span>
                <span className="text-gray-900 dark:text-white font-medium ml-2">
                  {tooltipData.close.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 등락 정보 */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-2 space-y-1">
              {/* 등락 금액 */}
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">등락</span>
                <span className={`font-semibold ${
                  tooltipData.change > 0
                    ? 'text-red-600 dark:text-red-400'
                    : tooltipData.change < 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {tooltipData.change > 0 ? '+' : ''}{tooltipData.change.toLocaleString()}
                </span>
              </div>
              {/* 등락률 */}
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">등락률</span>
                <span className={`font-semibold px-1.5 py-0.5 rounded ${
                  tooltipData.changePercent > 0
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : tooltipData.changePercent < 0
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {tooltipData.changePercent > 0 ? '+' : ''}{tooltipData.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* 거래량 */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">거래량</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {tooltipData.volume.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div
          ref={chartContainerRef}
          className="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
        />
      </div>
    </div>
  );
}
