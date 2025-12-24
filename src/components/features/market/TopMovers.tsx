'use client';

import { TopMover } from '@/types';

interface TopMoversProps {
  gainers: TopMover[];
  losers: TopMover[];
}

/**
 * MoverList 컴포넌트
 * 상승/하락 TOP 종목 리스트를 표시
 */
function MoverList({ title, emoji, movers, isGainer }: {
  title: string;
  emoji: string;
  movers: TopMover[];
  isGainer: boolean;
}) {
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
        {movers.map((mover, idx) => (
          // key: ticker + index로 고유성 보장
          // - ticker가 undefined인 경우 대비
          // - 동일 ticker가 여러 번 나타날 수 있는 경우 대비
          <div
            key={`${mover.ticker || 'mover'}-${idx}`}
            className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {/* 순위 배지 */}
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                idx < 3
                  ? isGainer ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {idx + 1}
              </span>
              <div>
                {/* 종목명 */}
                <p className="font-medium text-gray-900 dark:text-white text-sm">{mover.name}</p>
                {/* 티커 */}
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{mover.ticker}</p>
              </div>
            </div>
            {/* 등락률 배지 - 다크모드 지원 */}
            <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${
              isGainer
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {isGainer ? '+' : ''}{mover.changePercent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopMovers({ gainers, losers }: TopMoversProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <MoverList title="상승 TOP 5" emoji="🔥" movers={gainers} isGainer={true} />
      <MoverList title="하락 TOP 5" emoji="💧" movers={losers} isGainer={false} />
    </div>
  );
}
