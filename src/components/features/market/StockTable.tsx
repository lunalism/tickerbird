'use client';

/**
 * StockTable 컴포넌트
 *
 * 인기 종목을 반응형으로 표시하는 테이블/리스트 컴포넌트
 *
 * ============================================================
 * 모바일 더보기/접기 기능:
 * ============================================================
 * - 모바일(768px 미만): 기본 5개만 표시, "더보기" 버튼 클릭 시 전체 표시
 * - 데스크톱/태블릿(768px 이상): 전체 10개 표시
 * - 애니메이션: 부드러운 확장/축소 트랜지션 적용
 *
 * ============================================================
 * 관심종목 기능:
 * ============================================================
 * - 각 종목에 ⭐ 버튼 표시
 * - 클릭 시 관심종목 추가/제거 토글
 * - localStorage 기반 저장 (useWatchlist 훅 사용)
 * - 토스트 알림으로 결과 표시
 *
 * ============================================================
 * 반응형 레이아웃 (768px 기준):
 * ============================================================
 *
 * [모바일] 768px 미만 (md:hidden)
 * - 심플 리스트 UI (TopMovers/VolumeMovers와 동일한 스타일)
 * - UI가 통일되어 깔끔한 사용자 경험 제공
 * - 기본 5개 표시 + 더보기 버튼
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

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stock, MarketRegion } from '@/types';
import { CompanyLogo } from '@/components/common';
import { useWatchlist } from '@/hooks';
import { showSuccess, showError } from '@/lib/toast';

// ============================================
// 상수 정의
// ============================================

/** 모바일에서 기본으로 표시할 종목 수 */
const MOBILE_DEFAULT_COUNT = 5;

interface StockTableProps {
  stocks: Stock[];
  market: MarketRegion;
}

/**
 * 관심종목 버튼 컴포넌트
 *
 * @description
 * 종목별 관심종목 추가/제거 버튼
 * - 관심종목에 있으면: ★ (노란색, 채워진 별)
 * - 관심종목에 없으면: ☆ (회색, 빈 별)
 */
function WatchlistButton({
  isInWatchlist,
  onToggle,
}: {
  isInWatchlist: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // 행 클릭 이벤트 방지
        onToggle();
      }}
      className={`p-1.5 rounded-lg transition-all duration-200 ${
        isInWatchlist
          ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
          : 'text-gray-300 hover:text-yellow-500 hover:bg-gray-50 dark:text-gray-600 dark:hover:text-yellow-500 dark:hover:bg-gray-700'
      }`}
      title={isInWatchlist ? '관심종목에서 제거' : '관심종목에 추가'}
    >
      {isInWatchlist ? (
        // 채워진 별 (관심종목)
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ) : (
        // 빈 별 (미등록)
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
      )}
    </button>
  );
}

export function StockTable({ stocks, market }: StockTableProps) {
  const router = useRouter();

  // ========================================
  // 모바일 더보기/접기 상태 관리
  // ========================================
  // isExpanded: 모바일에서 전체 종목 표시 여부
  // - false: 상위 5개만 표시 (기본값)
  // - true: 전체 종목 표시
  const [isExpanded, setIsExpanded] = useState(false);

  // 모바일에서 표시할 종목 목록 계산
  // 확장되지 않았으면 상위 5개만, 확장되었으면 전체 표시
  const mobileStocks = isExpanded ? stocks : stocks.slice(0, MOBILE_DEFAULT_COUNT);

  // 더보기 버튼 표시 여부 (전체 종목이 5개보다 많을 때만)
  const showMoreButton = stocks.length > MOBILE_DEFAULT_COUNT;

  // ========================================
  // 관심종목 관리 훅
  // ========================================
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  /**
   * 관심종목 토글 핸들러 (Supabase 연동, 로그인 필수)
   * - 비로그인 시 로그인 안내 토스트 표시
   * - 추가/제거 후 토스트 알림 표시
   */
  const handleToggleWatchlist = async (ticker: string, name: string) => {
    const result = await toggleWatchlist({ ticker, name, market });

    // null이면 비로그인 상태 - 로그인 안내
    if (result === null) {
      showError('로그인이 필요합니다');
      return;
    }

    // true면 추가됨, false면 제거됨
    if (result) {
      showSuccess(`${name}을(를) 관심종목에 추가했습니다`);
    } else {
      showSuccess(`${name}을(를) 관심종목에서 제거했습니다`);
    }
  };

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
          모바일 심플 리스트 레이아웃 (768px 미만)
          - 기본 5개만 표시, 더보기 버튼으로 확장 가능
          ======================================== */}
      <div className="md:hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        {/* 종목 리스트 - 애니메이션 적용 */}
        <div className="space-y-1">
          {mobileStocks.map((stock, idx) => {
            const isPositive = stock.changePercent >= 0;
            const inWatchlist = isInWatchlist(stock.ticker);

            return (
              <div
                key={`${stock.ticker || 'stock'}-${idx}`}
                onClick={() => handleStockClick(stock.ticker)}
                className="py-2.5 px-3 rounded-xl
                           hover:bg-gray-50 dark:hover:bg-gray-700
                           active:bg-gray-100 dark:active:bg-gray-600
                           transition-colors cursor-pointer"
              >
                {/* 첫 번째 줄: 관심종목 + 순위 + 종목명 + 등락률 */}
                <div className="flex items-center justify-between">
                  {/* 왼쪽: 관심종목 버튼 + 순위 배지 + 종목명 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* 관심종목 버튼 */}
                    <WatchlistButton
                      isInWatchlist={inWatchlist}
                      onToggle={() => handleToggleWatchlist(stock.ticker, stock.name)}
                    />

                    {/* 순위 배지 */}
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

                    {/* 종목명 (한글명 우선) */}
                    <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {stock.nameKr || stock.name}
                    </span>
                  </div>

                  {/* 오른쪽: 등락률 배지 */}
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

                {/* 두 번째 줄: 현재가 · 거래량 */}
                <div className="mt-1 ml-14 text-xs text-gray-500 dark:text-gray-400">
                  {formatPrice(stock.price)} · 거래량 {stock.volume}
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================
            더보기/접기 버튼
            - 전체 종목이 5개보다 많을 때만 표시
            - 클릭 시 확장/축소 토글
            ======================================== */}
        {showMoreButton && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-3 py-2.5 flex items-center justify-center gap-1.5
                       text-sm font-medium text-gray-600 dark:text-gray-400
                       hover:text-gray-900 dark:hover:text-white
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       rounded-xl transition-colors"
          >
            {isExpanded ? (
              <>
                {/* 접기 상태 */}
                <span>접기</span>
                <svg
                  className="w-4 h-4 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                {/* 더보기 상태 */}
                <span>더보기</span>
                <svg
                  className="w-4 h-4 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>

      {/* ========================================
          태블릿/데스크톱 테이블 레이아웃 (768px 이상)
          ======================================== */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* 테이블 헤더 */}
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                {/* 관심종목 컬럼 */}
                <th className="w-12 py-3 px-2"></th>
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
                <th className="hidden lg:table-cell text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  거래량
                </th>
              </tr>
            </thead>

            {/* 테이블 바디 */}
            <tbody>
              {stocks.map((stock, idx) => {
                const isPositive = stock.changePercent >= 0;
                const inWatchlist = isInWatchlist(stock.ticker);

                return (
                  <tr
                    key={`${stock.ticker || 'stock'}-${idx}`}
                    onClick={() => handleStockClick(stock.ticker)}
                    className="border-b border-gray-50 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                  >
                    {/* 관심종목 버튼 */}
                    <td className="py-4 px-2">
                      <WatchlistButton
                        isInWatchlist={inWatchlist}
                        onToggle={() => handleToggleWatchlist(stock.ticker, stock.name)}
                      />
                    </td>

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
                        <div className="flex flex-col">
                          {/* 한글명 우선 표시 */}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {stock.nameKr || stock.name}
                          </span>
                          {/* 한글명이 있으면 영문명을 부가 정보로 표시 */}
                          {stock.nameKr && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {stock.name}
                            </span>
                          )}
                        </div>
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

                    {/* 거래량 */}
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
