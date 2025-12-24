'use client';

/**
 * StockTable 컴포넌트
 *
 * 반응형 레이아웃:
 * - 모바일 (767px 이하): 카드 리스트
 * - 태블릿 (768px~1023px): 테이블 (거래량 숨김)
 * - 데스크톱 (1024px+): 전체 테이블
 */

import { useRouter } from 'next/navigation';
import { Stock, MarketRegion } from '@/types';
import { CompanyLogo } from '@/components/common';

interface StockTableProps {
  stocks: Stock[];
  market: MarketRegion;
}

export function StockTable({ stocks, market }: StockTableProps) {
  const router = useRouter();

  /**
   * 가격 포맷팅
   * 국가별 통화 형식에 맞게 표시
   */
  const formatPrice = (price: number) => {
    if (market === 'kr') {
      return price.toLocaleString('ko-KR') + '원';
    } else if (market === 'jp') {
      return '¥' + price.toLocaleString('ja-JP');
    } else if (market === 'hk') {
      return 'HK$' + price.toFixed(2);
    }
    return '$' + price.toFixed(2);
  };

  /**
   * 등락폭 포맷팅
   * 양수면 +, 음수면 - 표시
   */
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    if (market === 'kr') {
      return sign + change.toLocaleString('ko-KR');
    }
    return sign + change.toFixed(2);
  };

  /**
   * 등락률 포맷팅
   * 퍼센트 형식으로 표시
   */
  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  /**
   * 종목 상세 페이지로 이동
   */
  const handleStockClick = (ticker: string) => {
    router.push(`/market/${ticker}`);
  };

  return (
    <>
      {/* ========================================
          모바일 카드 레이아웃 (767px 이하)

          카드 구조:
          ┌─────────────────────────────┐
          │ [순위] [로고] 종목명         │
          │        티커                 │
          │ 현재가          등락폭 등락률│
          │ 거래량: xxx                 │
          └─────────────────────────────┘
          ======================================== */}
      <div className="md:hidden flex flex-col gap-3">
        {stocks.map((stock, idx) => {
          const isPositive = stock.changePercent >= 0;
          return (
            // key: ticker + index로 고유성 보장
            <div
              key={`${stock.ticker || 'stock'}-${idx}`}
              onClick={() => handleStockClick(stock.ticker)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 cursor-pointer
                         hover:shadow-md transition-shadow active:bg-gray-50 dark:active:bg-gray-700"
            >
              {/* 상단: 순위 + 로고 + 종목명/티커 */}
              <div className="flex items-center gap-3 mb-3">
                {/* 순위 배지 */}
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    stock.rank <= 3
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {stock.rank}
                </span>

                {/* 로고 */}
                <CompanyLogo domain={stock.domain} size="sm" />

                {/* 종목명 + 티커 */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {stock.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {stock.ticker}
                  </p>
                </div>
              </div>

              {/* 중단: 현재가 + 등락폭/등락률 */}
              <div className="flex items-center justify-between mb-2">
                {/* 현재가 */}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatPrice(stock.price)}
                </span>

                {/* 등락폭 + 등락률 */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      isPositive
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatChange(stock.change)}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isPositive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {formatPercent(stock.changePercent)}
                  </span>
                </div>
              </div>

              {/* 하단: 거래량 */}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                거래량: {stock.volume}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================
          태블릿/데스크톱 테이블 레이아웃 (768px 이상)

          - 태블릿 (768px~1023px): 거래량 컬럼 숨김
          - 데스크톱 (1024px+): 전체 컬럼 표시
          ======================================== */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* 테이블 헤더 */}
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  순위
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  종목명
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  티커
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  현재가
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  등락률
                </th>
                {/* 거래량: 태블릿에서 숨김, 데스크톱에서 표시 */}
                <th className="hidden lg:table-cell text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  거래량
                </th>
              </tr>
            </thead>

            {/* 테이블 바디 */}
            <tbody>
              {stocks.map((stock, idx) => {
                const isPositive = stock.changePercent >= 0;
                return (
                  // key: ticker + index로 고유성 보장
                  <tr
                    key={`${stock.ticker || 'stock'}-${idx}`}
                    onClick={() => handleStockClick(stock.ticker)}
                    className="border-b border-gray-50 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                  >
                    {/* 순위 */}
                    <td className="py-4 px-4">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          stock.rank <= 3
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {stock.rank}
                      </span>
                    </td>

                    {/* 종목명 + 로고 */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <CompanyLogo domain={stock.domain} size="sm" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {stock.name}
                        </span>
                      </div>
                    </td>

                    {/* 티커 */}
                    <td className="py-4 px-4">
                      <span className="text-gray-500 dark:text-gray-400 text-sm font-mono">
                        {stock.ticker}
                      </span>
                    </td>

                    {/* 현재가 */}
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatPrice(stock.price)}
                      </span>
                    </td>

                    {/* 등락률 */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`text-sm ${
                            isPositive
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatChange(stock.change)}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isPositive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {formatPercent(stock.changePercent)}
                        </span>
                      </div>
                    </td>

                    {/* 거래량: 태블릿에서 숨김, 데스크톱에서 표시 */}
                    <td className="hidden lg:table-cell py-4 px-4 text-right">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        {stock.volume}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
