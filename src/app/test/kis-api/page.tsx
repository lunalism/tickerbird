/**
 * 한국투자증권 Open API 테스트 페이지
 *
 * @route /test/kis-api
 *
 * @description
 * 한국투자증권 Open API 연동을 테스트하기 위한 페이지입니다.
 * - 주식 현재가 조회 (삼성전자, SK하이닉스)
 * - 지수 현재가 조회 (코스피, 코스닥)
 *
 * API 키 설정 후 테스트해주세요.
 * .env.local 파일에 KIS_APP_KEY, KIS_APP_SECRET 설정 필요
 */

"use client";

import { useState } from "react";
import type { StockPriceData, IndexPriceData, KISApiErrorResponse } from "@/types/kis";

// 테스트용 종목 목록
const TEST_STOCKS = [
  { symbol: "005930", name: "삼성전자" },
  { symbol: "000660", name: "SK하이닉스" },
  { symbol: "035720", name: "카카오" },
  { symbol: "035420", name: "NAVER" },
];

// 테스트용 지수 목록
const TEST_INDICES = [
  { code: "0001", name: "코스피" },
  { code: "1001", name: "코스닥" },
  { code: "2001", name: "코스피200" },
];

type ApiResult = {
  type: "stock" | "index";
  data: StockPriceData | IndexPriceData | KISApiErrorResponse | null;
  loading: boolean;
  error: string | null;
};

export default function KisApiTestPage() {
  const [results, setResults] = useState<Record<string, ApiResult>>({});

  // 주식 현재가 조회
  const fetchStockPrice = async (symbol: string, name: string) => {
    const key = `stock-${symbol}`;
    setResults((prev) => ({
      ...prev,
      [key]: { type: "stock", data: null, loading: true, error: null },
    }));

    try {
      const response = await fetch(`/api/kis/stock/price?symbol=${symbol}`);
      const data = await response.json();

      if (!response.ok) {
        setResults((prev) => ({
          ...prev,
          [key]: {
            type: "stock",
            data,
            loading: false,
            error: data.message || "API 호출 실패",
          },
        }));
        return;
      }

      setResults((prev) => ({
        ...prev,
        [key]: { type: "stock", data, loading: false, error: null },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [key]: {
          type: "stock",
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "네트워크 오류",
        },
      }));
    }
  };

  // 지수 현재가 조회
  const fetchIndexPrice = async (indexCode: string, name: string) => {
    const key = `index-${indexCode}`;
    setResults((prev) => ({
      ...prev,
      [key]: { type: "index", data: null, loading: true, error: null },
    }));

    try {
      const response = await fetch(`/api/kis/index/price?indexCode=${indexCode}`);
      const data = await response.json();

      if (!response.ok) {
        setResults((prev) => ({
          ...prev,
          [key]: {
            type: "index",
            data,
            loading: false,
            error: data.message || "API 호출 실패",
          },
        }));
        return;
      }

      setResults((prev) => ({
        ...prev,
        [key]: { type: "index", data, loading: false, error: null },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [key]: {
          type: "index",
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "네트워크 오류",
        },
      }));
    }
  };

  // 모든 API 호출
  const fetchAll = async () => {
    // 모든 주식과 지수를 순차적으로 호출 (rate limit 고려)
    for (const stock of TEST_STOCKS) {
      await fetchStockPrice(stock.symbol, stock.name);
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms 딜레이
    }
    for (const index of TEST_INDICES) {
      await fetchIndexPrice(index.code, index.name);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  // 결과 포맷팅
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price);
  };

  const formatPercent = (percent: number) => {
    const sign = percent > 0 ? "+" : "";
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getChangeColor = (sign: string) => {
    if (sign === "up") return "text-red-500";
    if (sign === "down") return "text-blue-500";
    return "text-gray-500";
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            한국투자증권 Open API 테스트
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            API 키 설정 후 각 버튼을 클릭하여 테스트하세요.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            .env.local 파일에 KIS_APP_KEY, KIS_APP_SECRET 설정 필요
          </p>
        </div>

        {/* 전체 조회 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={fetchAll}
            className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors shadow-md"
          >
            전체 조회
          </button>
        </div>

        {/* 주식 현재가 섹션 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            주식 현재가 조회
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TEST_STOCKS.map((stock) => {
              const key = `stock-${stock.symbol}`;
              const result = results[key];

              return (
                <div
                  key={stock.symbol}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {stock.name}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {stock.symbol}
                      </span>
                    </div>
                    <button
                      onClick={() => fetchStockPrice(stock.symbol, stock.name)}
                      disabled={result?.loading}
                      className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
                    >
                      {result?.loading ? "조회중..." : "조회"}
                    </button>
                  </div>

                  {/* 결과 표시 */}
                  {result && !result.loading && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      {result.error ? (
                        <div className="text-red-500 text-sm">
                          에러: {result.error}
                        </div>
                      ) : result.data && "currentPrice" in result.data ? (
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                              {formatPrice(result.data.currentPrice)}원
                            </span>
                            <span
                              className={`text-sm font-medium ${getChangeColor(
                                result.data.changeSign
                              )}`}
                            >
                              {result.data.change > 0 ? "+" : ""}
                              {formatPrice(result.data.change)}{" "}
                              ({formatPercent(result.data.changePercent)})
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 grid grid-cols-2 gap-1">
                            <span>시가: {formatPrice(result.data.openPrice)}원</span>
                            <span>고가: {formatPrice(result.data.highPrice)}원</span>
                            <span>저가: {formatPrice(result.data.lowPrice)}원</span>
                            <span>
                              거래량: {formatPrice(result.data.volume)}주
                            </span>
                          </div>
                        </div>
                      ) : (
                        <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 지수 현재가 섹션 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            지수 현재가 조회
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TEST_INDICES.map((index) => {
              const key = `index-${index.code}`;
              const result = results[key];

              return (
                <div
                  key={index.code}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {index.name}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {index.code}
                      </span>
                    </div>
                    <button
                      onClick={() => fetchIndexPrice(index.code, index.name)}
                      disabled={result?.loading}
                      className="px-4 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
                    >
                      {result?.loading ? "조회중..." : "조회"}
                    </button>
                  </div>

                  {/* 결과 표시 */}
                  {result && !result.loading && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      {result.error ? (
                        <div className="text-red-500 text-sm">
                          에러: {result.error}
                        </div>
                      ) : result.data && "currentValue" in result.data ? (
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                              {result.data.currentValue.toFixed(2)}
                            </span>
                            <span
                              className={`text-sm font-medium ${getChangeColor(
                                result.data.changeSign
                              )}`}
                            >
                              {result.data.change > 0 ? "+" : ""}
                              {result.data.change.toFixed(2)}{" "}
                              ({formatPercent(result.data.changePercent)})
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 grid grid-cols-2 gap-1">
                            <span>시가: {result.data.open.toFixed(2)}</span>
                            <span>고가: {result.data.high.toFixed(2)}</span>
                            <span>저가: {result.data.low.toFixed(2)}</span>
                            <span>
                              거래량: {formatPrice(result.data.volume)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* JSON 원본 데이터 섹션 */}
        {Object.keys(results).length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              원본 JSON 데이터
            </h2>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-auto max-h-96 text-xs">
              {JSON.stringify(results, null, 2)}
            </pre>
          </section>
        )}

        {/* 안내 사항 */}
        <section className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 text-sm">
          <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            참고 사항
          </h3>
          <ul className="text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
            <li>
              한국투자증권 Open API 키가 필요합니다.{" "}
              <a
                href="https://apiportal.koreainvestment.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                apiportal.koreainvestment.com
              </a>
              에서 발급받으세요.
            </li>
            <li>
              장 운영시간(09:00~15:30)에 실시간 데이터가 조회됩니다.
            </li>
            <li>
              API 호출 제한: 초당 20회 (토큰 발급은 분당 1회)
            </li>
            <li>
              모의투자 서버 사용 시 KIS_BASE_URL을 변경해주세요.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
