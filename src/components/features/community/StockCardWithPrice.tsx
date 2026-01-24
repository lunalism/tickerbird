'use client';

/**
 * StockCardWithPrice 컴포넌트
 *
 * 커뮤니티 피드에서 종목 태그를 표시하는 미니 카드입니다.
 * 실시간 시세 API를 호출하여 현재가와 등락률을 표시합니다.
 *
 * 기능:
 * - 티커 코드로 한국/미국 종목 자동 구분
 * - 실시간 시세 API 호출 (lazy loading)
 * - 한국 주식: stockName 필드 사용 (예: "삼성전자")
 * - 미국 주식: nameKr(한글명) > name(영문명) 우선순위
 * - 로딩 중: 스켈레톤 UI
 * - API 실패 시: "시세 보기 →" 폴백
 * - 클릭 시: 종목 상세 페이지로 이동
 *
 * API 경로:
 * - 한국 주식: /api/kis/stock/price?symbol=005930
 *   - 반환: { stockName: "삼성전자", currentPrice: 75000, ... }
 * - 미국 주식: /api/kis/overseas/stock/price?symbol=AAPL
 *   - 반환: { name: "Apple", nameKr: "애플", currentPrice: 180.5, ... }
 *
 * 종목명 표시 우선순위:
 * 1. stockName (한국 주식) - "삼성전자"
 * 2. nameKr (미국 주식 한글명) - "써모 피셔 사이언티픽"
 * 3. name (미국 주식 영문명) - "Thermo Fisher Scientific"
 * 4. props.name (fallback)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface StockCardWithPriceProps {
  /** 종목 코드 (티커) */
  ticker: string;
  /** 종목명 (fallback용) */
  name: string;
}

// 한국 종목인지 확인 (6자리 숫자면 한국 종목)
const isKoreanStock = (ticker: string): boolean => {
  return /^\d{6}$/.test(ticker);
};

export function StockCardWithPrice({ ticker, name: propName }: StockCardWithPriceProps) {
  const router = useRouter();

  // 가격 데이터 상태
  const [price, setPrice] = useState<number | null>(null);
  const [changePercent, setChangePercent] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // 종목명 상태 (API에서 가져온 값 사용)
  // 우선순위: nameKr > name > propName
  const [displayName, setDisplayName] = useState<string>(propName);

  // 종목 가격 조회
  useEffect(() => {
    const fetchPrice = async () => {
      setIsLoading(true);
      setError(false);

      try {
        const isKR = isKoreanStock(ticker);
        // API 경로:
        // - 한국 주식: /api/kis/stock/price
        // - 미국 주식: /api/kis/overseas/stock/price
        const apiUrl = isKR
          ? `/api/kis/stock/price?symbol=${ticker}`
          : `/api/kis/overseas/stock/price?symbol=${ticker.toUpperCase()}`;

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (response.ok && data.currentPrice !== undefined) {
          setPrice(data.currentPrice);
          setChangePercent(data.changePercent || 0);

          // 종목명 설정 (우선순위: stockName > nameKr > name > propName)
          // - 한국 주식: stockName 필드 사용 (예: "삼성전자", "유일에너테크")
          // - 미국 주식: nameKr(한글명) > name(영문명)
          if (data.stockName) {
            // 한국 주식 - stockName 필드
            setDisplayName(data.stockName);
          } else if (data.nameKr) {
            // 미국 주식 - 한글명 우선
            setDisplayName(data.nameKr);
          } else if (data.name && data.name !== ticker) {
            // 미국 주식 - 영문명
            setDisplayName(data.name);
          }
          // 그 외의 경우 propName 유지
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrice();
  }, [ticker, propName]);

  const isPositive = (changePercent ?? 0) >= 0;
  const hasPrice = price !== null && !error;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/market/${ticker}`);
      }}
      className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl
                 border border-gray-100 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700
                 transition-colors cursor-pointer"
    >
      {/* 종목 정보 */}
      {/* 표시 형식: "종목명 티커" (예: "써모 피셔 사이언티픽 TMO") */}
      {/* 긴 종목명은 말줄임 처리 */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink">
        <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-[180px]">
          {displayName}
        </span>
        {/* 종목명이 티커와 다를 때만 티커 표시 */}
        {displayName !== ticker && (
          <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">{ticker}</span>
        )}
      </div>

      {/* 가격 영역 - 고정 너비로 레이아웃 안정화 */}
      <div className="flex-shrink-0">
        {isLoading ? (
          /* 로딩 중 - 스켈레톤 UI */
          <div className="flex items-center gap-2">
            <div className="w-16 h-5 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
            <div className="w-12 h-5 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
          </div>
        ) : hasPrice ? (
          /* 가격 정보 있음 - 가격과 등락률 표시 */
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-900 dark:text-white text-sm whitespace-nowrap">
              {isKoreanStock(ticker)
                ? price!.toLocaleString('ko-KR') + '원'
                : '$' + price!.toFixed(2)}
            </span>
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                isPositive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {isPositive ? '+' : ''}
              {changePercent?.toFixed(2)}%
            </span>
          </div>
        ) : (
          /* 가격 정보 없음/에러 - 시세 보기 링크 표시 */
          <span className="text-sm text-blue-600 dark:text-blue-400 whitespace-nowrap">
            시세 보기 →
          </span>
        )}
      </div>
    </div>
  );
}
