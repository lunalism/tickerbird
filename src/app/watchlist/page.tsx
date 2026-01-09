'use client';

/**
 * 관심종목 페이지
 *
 * @route /watchlist
 *
 * @description
 * Supabase DB 기반 관심종목 관리 페이지 (로그인 사용자 전용)
 * - 저장된 관심종목 목록 표시
 * - 실시간 시세 연동 (한국투자증권 API)
 * - 종목별 현재가, 등락률, 등락폭 표시
 * - 삭제 버튼으로 관심종목 제거
 *
 * @features
 * - 로그인 필수 (비로그인 시 로그인 안내)
 * - 반응형 UI: 데스크톱(테이블), 모바일(카드)
 * - 다크모드 지원
 * - 빈 상태 표시
 * - 시장별 탭 (한국/미국/일본/홍콩)
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MarketRegion } from '@/types';
import { Sidebar, BottomNav } from '@/components/layout';
import { MarketTabs } from '@/components/features/market';
import { useWatchlist, WatchlistItem } from '@/hooks';
import { showSuccess } from '@/lib/toast';
import { CompanyLogo } from '@/components/common';

// ==================== 타입 정의 ====================

/**
 * 시세 정보가 포함된 관심종목 아이템
 */
interface WatchlistItemWithPrice extends WatchlistItem {
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  isLoading?: boolean;
  error?: string;
}

// ==================== 컴포넌트 ====================

/**
 * 로그인 필요 컴포넌트
 * 비로그인 상태에서 표시
 */
function LoginRequired() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
      {/* 잠금 아이콘 */}
      <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      {/* 안내 텍스트 */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        로그인이 필요합니다
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        관심종목 기능은 로그인 후 이용 가능합니다
      </p>

      {/* 로그인 페이지로 이동 버튼 */}
      <Link
        href="/login"
        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
      >
        로그인하기
      </Link>
    </div>
  );
}

/**
 * 빈 상태 컴포넌트
 * 관심종목이 없을 때 표시
 */
function EmptyState() {
  const router = useRouter();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
      {/* 별 아이콘 */}
      <div className="w-20 h-20 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>

      {/* 안내 텍스트 */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        관심종목이 없습니다
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        시세 페이지에서 ⭐를 눌러 관심종목을 추가하세요
      </p>

      {/* 시세 페이지로 이동 버튼 */}
      <button
        onClick={() => router.push('/market')}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
      >
        시세 보러 가기
      </button>
    </div>
  );
}

/**
 * 로딩 스켈레톤
 */
function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-50 dark:border-gray-700">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            </div>
            <div className="text-right">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 관심종목 테이블 (데스크톱)
 */
function WatchlistTableDesktop({
  items,
  market,
  onDelete,
  onItemClick,
}: {
  items: WatchlistItemWithPrice[];
  market: MarketRegion;
  onDelete: (ticker: string, name: string) => void;
  onItemClick: (ticker: string) => void;
}) {
  // 가격 포맷팅
  const formatPrice = (price: number) => {
    if (market === 'kr') return price.toLocaleString('ko-KR') + '원';
    if (market === 'jp') return '¥' + price.toLocaleString('ja-JP');
    if (market === 'hk') return 'HK$' + price.toFixed(2);
    return '$' + price.toFixed(2);
  };

  // 변동폭 포맷팅
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    if (market === 'kr') return sign + change.toLocaleString('ko-KR');
    return sign + change.toFixed(2);
  };

  // 변동률 포맷팅
  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
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
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                등락폭
              </th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isPositive = (item.changePercent ?? 0) >= 0;
              const hasPrice = item.price !== undefined;

              return (
                <tr
                  key={item.ticker}
                  onClick={() => onItemClick(item.ticker)}
                  className="border-b border-gray-50 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                >
                  {/* 종목명 + 로고 */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <CompanyLogo domain="" size="sm" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </span>
                    </div>
                  </td>

                  {/* 티커 */}
                  <td className="py-4 px-4">
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-mono">
                      {item.ticker}
                    </span>
                  </td>

                  {/* 현재가 */}
                  <td className="py-4 px-4 text-right">
                    {item.isLoading ? (
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-auto animate-pulse" />
                    ) : hasPrice ? (
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatPrice(item.price!)}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </td>

                  {/* 등락률 */}
                  <td className="py-4 px-4 text-right">
                    {item.isLoading ? (
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto animate-pulse" />
                    ) : hasPrice ? (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          isPositive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {formatPercent(item.changePercent!)}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </td>

                  {/* 등락폭 */}
                  <td className="py-4 px-4 text-right">
                    {item.isLoading ? (
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto animate-pulse" />
                    ) : hasPrice ? (
                      <span
                        className={`text-sm ${
                          isPositive
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatChange(item.change!)}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </td>

                  {/* 삭제 버튼 */}
                  <td className="py-4 px-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.ticker, item.name);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="관심종목에서 삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 관심종목 리스트 (모바일)
 */
function WatchlistListMobile({
  items,
  market,
  onDelete,
  onItemClick,
}: {
  items: WatchlistItemWithPrice[];
  market: MarketRegion;
  onDelete: (ticker: string, name: string) => void;
  onItemClick: (ticker: string) => void;
}) {
  // 가격 포맷팅
  const formatPrice = (price: number) => {
    if (market === 'kr') return price.toLocaleString('ko-KR') + '원';
    if (market === 'jp') return '¥' + price.toLocaleString('ja-JP');
    if (market === 'hk') return 'HK$' + price.toFixed(2);
    return '$' + price.toFixed(2);
  };

  // 변동률 포맷팅
  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <div className="md:hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="divide-y divide-gray-50 dark:divide-gray-700">
        {items.map((item) => {
          const isPositive = (item.changePercent ?? 0) >= 0;
          const hasPrice = item.price !== undefined;

          return (
            <div
              key={item.ticker}
              onClick={() => onItemClick(item.ticker)}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                {/* 왼쪽: 종목 정보 */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <CompanyLogo domain="" size="sm" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {item.ticker}
                    </p>
                  </div>
                </div>

                {/* 오른쪽: 가격 정보 + 삭제 버튼 */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {item.isLoading ? (
                      <>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1 animate-pulse" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-14 ml-auto animate-pulse" />
                      </>
                    ) : hasPrice ? (
                      <>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatPrice(item.price!)}
                        </p>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isPositive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {formatPercent(item.changePercent!)}
                        </span>
                      </>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500">-</p>
                    )}
                  </div>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.ticker, item.name);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="관심종목에서 삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 메인 페이지 ====================

export default function WatchlistPage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('watchlist');
  const [activeMarket, setActiveMarket] = useState<MarketRegion>('kr');

  // 관심종목 훅 (로그인 사용자 전용)
  const { watchlist, isLoaded, removeFromWatchlist, getWatchlistByMarket, requiresLogin } = useWatchlist();

  // 시세 정보가 포함된 관심종목 상태
  const [itemsWithPrice, setItemsWithPrice] = useState<WatchlistItemWithPrice[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // fetch 중복 방지를 위한 ref
  const isFetchingRef = useRef(false);

  // 현재 시장의 관심종목
  const marketWatchlist = getWatchlistByMarket(activeMarket);

  // 안정적인 dependency를 위해 티커 목록을 문자열로 변환
  const marketWatchlistKey = marketWatchlist.map((item) => item.ticker).join(',');

  // 시장 변경 또는 관심종목 변경 시 시세 조회
  useEffect(() => {
    // 로드 완료 전이면 스킵
    if (!isLoaded) return;

    // 이미 fetch 중이면 스킵
    if (isFetchingRef.current) return;

    // 관심종목이 없으면 빈 배열로 설정
    if (marketWatchlist.length === 0) {
      setItemsWithPrice([]);
      return;
    }

    /**
     * 시세 데이터 조회
     * 한국/미국 종목의 실시간 시세를 API에서 가져옴
     */
    const fetchPrices = async () => {
      isFetchingRef.current = true;
      setIsLoadingPrices(true);

      // 초기 상태: 로딩 중
      setItemsWithPrice(
        marketWatchlist.map((item) => ({
          ...item,
          isLoading: true,
        }))
      );

      try {
        // 각 종목의 시세 조회
        const updatedItems = await Promise.all(
          marketWatchlist.map(async (item) => {
            try {
              let apiUrl = '';

              if (item.market === 'kr') {
                // 한국 주식 시세 API
                apiUrl = `/api/kis/stock/price?symbol=${item.ticker}`;
              } else if (item.market === 'us') {
                // 미국 주식 개별 시세 API
                apiUrl = `/api/kis/overseas/stock/price?symbol=${item.ticker}`;
              } else {
                // 일본/홍콩은 현재 미지원
                return {
                  ...item,
                  isLoading: false,
                  error: '해당 시장 시세 조회 미지원',
                };
              }

              const response = await fetch(apiUrl);
              if (!response.ok) throw new Error('시세 조회 실패');

              const data = await response.json();

              return {
                ...item,
                // API에서 종목명을 가져온 경우 업데이트 (티커로 저장된 경우 수정)
                // 한국 주식: stockName, 미국 주식: name
                name: data.stockName || data.name || item.name,
                price: data.currentPrice,
                change: data.change,
                changePercent: data.changePercent,
                volume: data.volume,
                isLoading: false,
              };
            } catch (error) {
              console.error(`[Watchlist] ${item.ticker} 시세 조회 실패:`, error);
              return {
                ...item,
                isLoading: false,
                error: '시세 조회 실패',
              };
            }
          })
        );

        setItemsWithPrice(updatedItems);
      } finally {
        setIsLoadingPrices(false);
        isFetchingRef.current = false;
      }
    };

    fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, activeMarket, marketWatchlistKey]);

  /**
   * 관심종목 삭제 핸들러 (Supabase 연동으로 async)
   */
  const handleDelete = async (ticker: string, name: string) => {
    await removeFromWatchlist(ticker);
    showSuccess(`${name}을(를) 관심종목에서 제거했습니다`);
  };

  /**
   * 종목 클릭 핸들러 (상세 페이지로 이동)
   */
  const handleItemClick = (ticker: string) => {
    router.push(`/market/${ticker}`);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      {/* Sidebar - hidden on mobile */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Bottom Navigation - visible only on mobile */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Main Content */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">관심종목</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              나만의 관심종목을 관리하세요
              {watchlist.length > 0 && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  (총 {watchlist.length}개)
                </span>
              )}
            </p>
          </div>

          {/* Market Tabs */}
          <div className="mb-6">
            <MarketTabs activeMarket={activeMarket} onMarketChange={setActiveMarket} />
          </div>

          {/* Content */}
          {requiresLogin ? (
            // 비로그인 상태 - 로그인 안내
            <LoginRequired />
          ) : !isLoaded ? (
            // 초기 로딩
            <LoadingSkeleton />
          ) : marketWatchlist.length === 0 ? (
            // 빈 상태
            <EmptyState />
          ) : (
            <>
              {/* 데스크톱 테이블 */}
              <WatchlistTableDesktop
                items={itemsWithPrice}
                market={activeMarket}
                onDelete={handleDelete}
                onItemClick={handleItemClick}
              />

              {/* 모바일 리스트 */}
              <WatchlistListMobile
                items={itemsWithPrice}
                market={activeMarket}
                onDelete={handleDelete}
                onItemClick={handleItemClick}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
