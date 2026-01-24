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

  /**
   * 가격 포맷팅 함수
   * - 한국 주식: 원화 표시 (예: "1,539원")
   * - 미국 주식: 달러 표시 (예: "$180.50")
   */
  const formatPrice = (priceValue: number): string => {
    if (isKoreanStock(ticker)) {
      return priceValue.toLocaleString('ko-KR') + '원';
    }
    return '$' + priceValue.toFixed(2);
  };

  return (
    <div
      onClick={(e) => {
        // 이벤트 버블링 방지 (부모 요소 클릭 이벤트 차단)
        e.stopPropagation();
        // 종목 상세 페이지로 이동
        router.push(`/market/${ticker}`);
      }}
      className="flex flex-col gap-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl
                 border border-gray-100 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700
                 transition-colors cursor-pointer"
    >
      {isLoading ? (
        /* ========== 로딩 상태: 스켈레톤 UI (2줄) ========== */
        <>
          {/* 1행 스켈레톤: 종목명 + 가격 */}
          <div className="flex items-center justify-between">
            <div className="w-24 h-5 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
            <div className="w-16 h-5 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
          </div>
          {/* 2행 스켈레톤: 종목코드 + 등락률 */}
          <div className="flex items-center justify-between">
            <div className="w-14 h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
            <div className="w-12 h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
          </div>
        </>
      ) : hasPrice ? (
        /* ========== 가격 정보 있음: 2줄 레이아웃 ========== */
        <>
          {/* 1행: 종목명 (좌측) + 가격 (우측) */}
          <div className="flex items-center justify-between gap-2">
            {/* 종목명: 굵게, 검정, 긴 이름은 말줄임 처리 */}
            <span className="font-semibold text-gray-900 dark:text-white truncate">
              {displayName}
            </span>
            {/* 가격: 굵게, 검정 */}
            <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              {formatPrice(price!)}
            </span>
          </div>
          {/* 2행: 종목코드 (좌측) + 등락률 (우측) */}
          <div className="flex items-center justify-between gap-2">
            {/* 종목코드: 작게, 회색 */}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {ticker}
            </span>
            {/* 등락률: 상승 초록 / 하락 빨강 */}
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isPositive ? '+' : ''}
              {changePercent?.toFixed(2)}%
            </span>
          </div>
        </>
      ) : (
        /* ========== 가격 정보 없음/에러: 폴백 UI ========== */
        <>
          {/* 1행: 종목명 + 시세 보기 링크 */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-900 dark:text-white truncate">
              {displayName}
            </span>
            <span className="text-sm text-blue-600 dark:text-blue-400 whitespace-nowrap">
              시세 보기 →
            </span>
          </div>
          {/* 2행: 종목코드 */}
          <div className="flex items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {ticker}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
