'use client';

/**
 * StocksContent 컴포넌트
 * 주식 카테고리 선택 시 표시되는 콘텐츠
 * 섹터별 필터 버튼과 주식 테이블을 포함
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarketRegion, StockSector, Stock } from '@/types';
import { stocksBySector, sectorTabs } from '@/constants';
import { CompanyLogo } from '@/components/common';

interface StocksContentProps {
  // 현재 선택된 국가
  market: MarketRegion;
}

/**
 * 섹터 필터 버튼 컴포넌트
 * 기술/금융/헬스케어/에너지/소비재/통신 등 섹터 필터링
 */
function SectorFilter({
  activeSector,
  onSectorChange
}: {
  activeSector: StockSector;
  onSectorChange: (sector: StockSector) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
      {sectorTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSectorChange(tab.id)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSector === tab.id
              // 활성화된 필터 스타일 (다크모드 지원)
              ? 'bg-blue-600 text-white'
              // 비활성화된 필터 스타일 (다크모드 지원)
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 주식 테이블 컴포넌트
 * 필터링된 주식 목록을 테이블 형태로 표시
 */
function StockTable({ stocks, market }: { stocks: Stock[]; market: MarketRegion }) {
  const router = useRouter();

  // 가격 포맷팅 (국가별 통화 형식)
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

  // 변동 포맷팅
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    if (market === 'kr') {
      return sign + change.toLocaleString('ko-KR');
    }
    return sign + change.toFixed(2);
  };

  // 퍼센트 포맷팅
  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">순위</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">종목명</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">티커</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">현재가</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">등락률</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">거래량</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, idx) => {
              const isPositive = stock.changePercent >= 0;
              return (
                <tr
                  key={stock.ticker}
                  onClick={() => router.push(`/market/${stock.ticker}`)}
                  className="border-b border-gray-50 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                >
                  {/* 순위 */}
                  <td className="py-4 px-4">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx < 3
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  {/* 종목명 + 로고 */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <CompanyLogo domain={stock.domain} size="sm" />
                      <span className="font-medium text-gray-900 dark:text-white">{stock.name}</span>
                    </div>
                  </td>
                  {/* 티커 */}
                  <td className="py-4 px-4">
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-mono">{stock.ticker}</span>
                  </td>
                  {/* 현재가 */}
                  <td className="py-4 px-4 text-right">
                    <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(stock.price)}</span>
                  </td>
                  {/* 등락률 */}
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatChange(stock.change)}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isPositive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {formatPercent(stock.changePercent)}
                      </span>
                    </div>
                  </td>
                  {/* 거래량 */}
                  <td className="py-4 px-4 text-right">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{stock.volume}</span>
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

export function StocksContent({ market }: StocksContentProps) {
  // 현재 선택된 섹터 상태
  const [activeSector, setActiveSector] = useState<StockSector>('all');

  // 전체 주식 데이터 (방어적 코딩)
  const allStocks = stocksBySector[market] || [];

  // 섹터별 필터링
  const filteredStocks = activeSector === 'all'
    ? allStocks
    : allStocks.filter(stock => stock.sector && stock.sector === activeSector);

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        인기 종목
      </h2>
      {/* 섹터 필터 */}
      <SectorFilter activeSector={activeSector} onSectorChange={setActiveSector} />
      {/* 주식 테이블 */}
      {filteredStocks.length > 0 ? (
        <StockTable stocks={filteredStocks} market={market} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">해당 섹터의 종목이 없습니다.</p>
        </div>
      )}
    </section>
  );
}
