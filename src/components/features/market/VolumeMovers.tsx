'use client';

/**
 * VolumeMovers 컴포넌트
 *
 * 거래량 TOP 5 / 거래대금 TOP 5 카드를 2열 그리드로 표시
 * 한국투자증권 거래량순위 API의 volume과 tradingValue 필드를 활용
 *
 * @description
 * - 거래량 TOP: volume 기준 정렬
 * - 거래대금 TOP: tradingValue 기준 정렬
 * - 동일한 API 데이터를 사용하므로 중복 호출 없음
 *
 * 레이아웃:
 * - 데스크톱: 2열 그리드
 * - 모바일: 1열 (수직 스택)
 */

import { useRouter } from 'next/navigation';

/**
 * 거래량/거래대금 종목 데이터 타입
 */
export interface VolumeMover {
  name: string;           // 종목명
  ticker: string;         // 종목코드
  changePercent: number;  // 등락률 (%)
  volume: number;         // 거래량
  tradingValue: number;   // 거래대금
}

interface VolumeMoverListProps {
  title: string;            // 카드 제목 (예: "거래량 TOP 5")
  emoji: string;            // 이모지 (예: "📊")
  movers: VolumeMover[];    // 종목 데이터 배열
  valueType: 'volume' | 'tradingValue';  // 표시할 수치 유형
}

/**
 * 거래량 포맷팅 (숫자 → 문자열)
 *
 * @example
 * formatVolume(365079995) → "365.1M주"
 * formatVolume(1234567) → "1.2M주"
 * formatVolume(123456) → "123.5K주"
 */
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return (volume / 1000000).toFixed(1) + 'M주';
  }
  if (volume >= 1000) {
    return (volume / 1000).toFixed(1) + 'K주';
  }
  return volume.toLocaleString('ko-KR') + '주';
}

/**
 * 거래대금 포맷팅 (숫자 → 문자열)
 * 단위: 억원
 *
 * @example
 * formatTradingValue(241262608923) → "2,413억"
 * formatTradingValue(8704413976) → "87억"
 */
function formatTradingValue(value: number): string {
  // 억 단위로 변환 (1억 = 100,000,000)
  const billions = Math.floor(value / 100000000);
  if (billions >= 10000) {
    // 조 단위
    return (billions / 10000).toFixed(1) + '조';
  }
  return billions.toLocaleString('ko-KR') + '억';
}

/**
 * 개별 종목 리스트 컴포넌트
 * 거래량 또는 거래대금 TOP 5를 카드 형태로 표시
 */
function VolumeMoverList({ title, emoji, movers, valueType }: VolumeMoverListProps) {
  const router = useRouter();

  return (
    // 다크모드 지원 카드 컨테이너
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      {/* 섹션 제목 */}
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>{emoji}</span>
        <span>{title}</span>
      </h3>

      {/* 종목 리스트 */}
      <div className="space-y-3">
        {movers.map((mover, idx) => {
          const isPositive = mover.changePercent >= 0;

          return (
            <div
              key={mover.ticker}
              onClick={() => router.push(`/market/${mover.ticker}`)}
              className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              {/* 왼쪽: 순위 + 종목명 */}
              <div className="flex items-center gap-3">
                {/* 순위 배지 */}
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx < 3
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {idx + 1}
                </span>

                {/* 종목명 */}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{mover.name}</p>
                  {/* 거래량/거래대금 수치 (회색 글씨) */}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {valueType === 'volume'
                      ? formatVolume(mover.volume)
                      : formatTradingValue(mover.tradingValue)
                    }
                  </p>
                </div>
              </div>

              {/* 오른쪽: 등락률 배지 */}
              <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${
                isPositive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {isPositive ? '+' : ''}{mover.changePercent.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface VolumeMoversProps {
  /** 거래량순위 API 데이터 (상위 5개만 사용) */
  volumeData: VolumeMover[];
  /** 거래대금순위 API 데이터 (상위 5개만 사용) */
  tradingValueData: VolumeMover[];
}

/**
 * VolumeMovers 메인 컴포넌트
 *
 * 거래량 TOP 5와 거래대금 TOP 5를 2열 그리드로 표시
 * 모바일에서는 1열로 변경
 */
export function VolumeMovers({ volumeData, tradingValueData }: VolumeMoversProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 거래량 TOP 5 카드 */}
      <VolumeMoverList
        title="거래량 TOP 5"
        emoji="📊"
        movers={volumeData}
        valueType="volume"
      />

      {/* 거래대금 TOP 5 카드 */}
      <VolumeMoverList
        title="거래대금 TOP 5"
        emoji="💰"
        movers={tradingValueData}
        valueType="tradingValue"
      />
    </div>
  );
}
