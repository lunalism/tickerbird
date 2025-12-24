'use client';

/**
 * StockTable 컴포넌트
 *
 * 인기 종목을 반응형으로 표시하는 테이블/리스트 컴포넌트
 *
 * ============================================================
 * 반응형 레이아웃 (768px 기준):
 * ============================================================
 *
 * [모바일] 768px 미만 (md:hidden)
 * - 심플 리스트 UI (TopMovers/VolumeMovers와 동일한 스타일)
 * - UI가 통일되어 깔끔한 사용자 경험 제공
 * - 구조:
 *   ┌─────────────────────────────────────┐
 *   │ 1  KODEX 200선물인버스2X    -0.15%  │  <- 순위 + 종목명 + 등락률 배지
 *   │    665원 · 거래량 365.1M           │  <- 현재가 · 거래량 (회색)
 *   ├─────────────────────────────────────┤
 *   │ 2  현대무벡스              +9.94%  │
 *   │    18,580원 · 거래량 46.0M         │
 *   └─────────────────────────────────────┘
 *
 * [데스크톱] 768px 이상 (hidden md:block)
 * - 테이블 형태로 정보 밀도 높게 표시
 * - 태블릿(768px~1023px): 거래량 컬럼 숨김
 * - 데스크톱(1024px+): 전체 컬럼 표시
 *
 * ============================================================
 * 다크모드 지원:
 * ============================================================
 * - 배경: bg-white → dark:bg-gray-800
 * - 텍스트: text-gray-900 → dark:text-white
 * - 보조 텍스트: text-gray-500 → dark:text-gray-400
 * - 등락률 배지: 라이트/다크 각각 스타일 적용
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
   *
   * @param price - 가격 (숫자)
   * @returns 통화 형식 문자열 (예: "1,234원", "$123.45")
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
   *
   * @param change - 등락폭 (숫자)
   * @returns 부호 포함 문자열 (예: "+1,234", "-56.78")
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
   *
   * @param percent - 등락률 (숫자)
   * @returns 퍼센트 문자열 (예: "+1.23%", "-4.56%")
   */
  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  /**
   * 종목 상세 페이지로 이동
   *
   * @param ticker - 종목 티커 (예: "005930", "AAPL")
   */
  const handleStockClick = (ticker: string) => {
    router.push(`/market/${ticker}`);
  };

  return (
    <>
      {/* ========================================
          모바일 심플 리스트 레이아웃 (768px 미만)

          TopMovers/VolumeMovers와 동일한 스타일로 UI 통일
          - 카드 형태가 아닌 심플 리스트 형태
          - 각 항목: 순위 + 종목명 + 등락률 (첫 줄)
          - 하위 정보: 현재가 · 거래량 (둘째 줄, 회색)

          스타일 구조:
          ┌─────────────────────────────────────┐
          │ [순위배지]  종목명         [등락률] │
          │            현재가 · 거래량 xxx     │
          └─────────────────────────────────────┘
          ======================================== */}
      <div className="md:hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        {/* 종목 리스트 - 각 항목 사이에 적절한 간격 */}
        <div className="space-y-1">
          {stocks.map((stock, idx) => {
            // 등락률이 양수인지 확인 (색상 결정용)
            const isPositive = stock.changePercent >= 0;

            return (
              // key: ticker + index로 고유성 보장
              // - ticker가 undefined인 경우 대비
              // - 동일 ticker가 여러 번 나타날 수 있는 경우 대비
              <div
                key={`${stock.ticker || 'stock'}-${idx}`}
                onClick={() => handleStockClick(stock.ticker)}
                className="py-2.5 px-3 rounded-xl
                           hover:bg-gray-50 dark:hover:bg-gray-700
                           active:bg-gray-100 dark:active:bg-gray-600
                           transition-colors cursor-pointer"
              >
                {/* ========================================
                    첫 번째 줄: 순위 + 종목명 + 등락률 배지
                    ======================================== */}
                <div className="flex items-center justify-between">
                  {/* 왼쪽: 순위 배지 + 종목명 */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* 순위 배지
                        - TOP 3: 파란색 배경 + 흰색 텍스트
                        - 4위 이하: 회색 배경 */}
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center
                                  text-xs font-bold flex-shrink-0 ${
                        stock.rank <= 3
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {stock.rank}
                    </span>

                    {/* 종목명 - 길면 말줄임표 처리 */}
                    <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {stock.name}
                    </span>
                  </div>

                  {/* 오른쪽: 등락률 배지
                      - 양수: 초록색 배경
                      - 음수: 빨간색 배경 */}
                  <span
                    className={`text-sm font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 ml-2 ${
                      isPositive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {formatPercent(stock.changePercent)}
                  </span>
                </div>

                {/* ========================================
                    두 번째 줄: 현재가 · 거래량 (회색 보조 텍스트)
                    - 순위 배지 너비만큼 왼쪽 들여쓰기 (정렬용)
                    - 중간점(·)으로 정보 구분
                    ======================================== */}
                <div className="mt-1 ml-8 text-xs text-gray-500 dark:text-gray-400">
                  {formatPrice(stock.price)} · 거래량 {stock.volume}
                </div>
              </div>
            );
          })}
        </div>
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
