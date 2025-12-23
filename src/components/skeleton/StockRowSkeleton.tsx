/**
 * StockRowSkeleton 컴포넌트
 *
 * 종목 테이블 행 로딩 스켈레톤입니다.
 * StockTable의 행과 동일한 레이아웃을 가집니다.
 *
 * 구조:
 * - 순위
 * - 로고 (원형)
 * - 종목명
 * - 티커
 * - 현재가
 * - 등락률
 * - 거래량
 */

import { Skeleton, SkeletonCircle } from './Skeleton';

export function StockRowSkeleton() {
  return (
    <tr className="border-b border-gray-50 dark:border-gray-700">
      {/* 순위 */}
      <td className="py-4 px-4">
        <SkeletonCircle size={24} />
      </td>
      {/* 종목명 + 로고 */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          {/* 회사 로고 */}
          <SkeletonCircle size={32} />
          {/* 종목명 */}
          <Skeleton width={100} height={16} rounded="md" />
        </div>
      </td>
      {/* 티커 */}
      <td className="py-4 px-4">
        <Skeleton width={50} height={14} rounded="md" />
      </td>
      {/* 현재가 */}
      <td className="py-4 px-4 text-right">
        <Skeleton width={80} height={16} rounded="md" className="ml-auto" />
      </td>
      {/* 등락률 */}
      <td className="py-4 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Skeleton width={50} height={14} rounded="md" />
          <Skeleton width={55} height={20} rounded="full" />
        </div>
      </td>
      {/* 거래량 */}
      <td className="py-4 px-4 text-right">
        <Skeleton width={70} height={14} rounded="md" className="ml-auto" />
      </td>
    </tr>
  );
}

/**
 * StockTableSkeleton 컴포넌트
 *
 * 전체 종목 테이블 스켈레톤입니다.
 * 테이블 헤더와 여러 행을 포함합니다.
 *
 * @param rowCount - 표시할 행 개수 (기본: 10)
 */
interface StockTableSkeletonProps {
  rowCount?: number;
}

export function StockTableSkeleton({ rowCount = 10 }: StockTableSkeletonProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
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
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                거래량
              </th>
            </tr>
          </thead>
          {/* 테이블 바디 - 스켈레톤 행들 */}
          <tbody>
            {Array.from({ length: rowCount }).map((_, index) => (
              <StockRowSkeleton key={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
