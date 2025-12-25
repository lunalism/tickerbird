'use client';

/**
 * IndexCard 컴포넌트
 *
 * @description
 * 주가 지수를 카드 형태로 표시합니다.
 * - 지수명, 현재값, 변동폭, 변동률 표시
 * - 미니 차트로 추세 시각화
 * - ETF 기반 추정치인 경우 표시
 *
 * @props
 * - index: MarketIndex - 지수 데이터
 *   - isEstimated: true인 경우 "ETF 기준" 표시
 */

import { useRouter } from 'next/navigation';
import { MarketIndex } from '@/types';

interface IndexCardProps {
  index: MarketIndex;
}

/**
 * 미니 차트 컴포넌트
 * SVG로 간단한 라인 차트를 렌더링합니다.
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
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function IndexCard({ index }: IndexCardProps) {
  const router = useRouter();
  const isPositive = index.change >= 0;

  const formatValue = (value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    // 다크모드 지원 카드 스타일
    <div
      onClick={() => router.push(`/market/${index.id}`)}
      className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          {/* 지수 이름 + ETF 기준 표시 */}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{index.name}</h3>
            {/* ETF 기반 추정치인 경우 표시 */}
            {index.isEstimated && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                title="지수 추적 ETF 가격 기반 추정치"
              >
                ETF
              </span>
            )}
          </div>
          {/* 현재 값 - 다크모드 텍스트 */}
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatValue(index.value)}</p>
        </div>
        <MiniChart data={index.chartData} isPositive={isPositive} />
      </div>
      {/* 변동 정보 - 다크모드 색상 */}
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {formatChange(index.change)}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          isPositive
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {formatPercent(index.changePercent)}
        </span>
      </div>
    </div>
  );
}
