/**
 * 알림 추가 모달 컴포넌트
 *
 * 가격 알림을 추가하기 위한 모달 UI
 * 종목 상세 페이지에서 알림 버튼 클릭 시 표시
 *
 * 기능:
 * - 목표가 입력
 * - 알림 방향 선택 (이상/이하)
 * - 저장 버튼으로 알림 생성
 *
 * 사용 예:
 * ```tsx
 * <AddAlertModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   ticker="005930"
 *   stockName="삼성전자"
 *   market="KR"
 *   currentPrice={75000}
 * />
 * ```
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAlerts } from '@/hooks';
import { AlertDirection, AlertMarket } from '@/types/priceAlert';
import { showSuccess, showError } from '@/lib/toast';

/**
 * 모달 Props
 */
interface AddAlertModalProps {
  // 모달 열림 상태
  isOpen: boolean;
  // 모달 닫기 핸들러
  onClose: () => void;
  // 종목 코드
  ticker: string;
  // 종목명
  stockName: string;
  // 시장 구분 (KR/US)
  market: AlertMarket;
  // 현재가 (기본값 설정용)
  currentPrice: number;
  // 알림 추가 성공 시 콜백 (선택)
  // 부모 컴포넌트에서 알림 상태를 즉시 업데이트할 때 사용
  onSuccess?: () => void;
}

/**
 * 알림 추가 모달 컴포넌트
 */
export function AddAlertModal({
  isOpen,
  onClose,
  ticker,
  stockName,
  market,
  currentPrice,
  onSuccess,
}: AddAlertModalProps) {
  // 알림 관리 훅
  const { addAlert } = useAlerts();

  // 입력 상태
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [direction, setDirection] = useState<AlertDirection>('above');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 입력 필드 참조 (포커스용)
  const inputRef = useRef<HTMLInputElement>(null);

  // 모달 열릴 때 초기화 및 포커스
  useEffect(() => {
    if (isOpen) {
      // 현재가를 기본값으로 설정
      setTargetPrice(currentPrice.toString());
      setDirection('above');
      setError(null);

      // 약간의 딜레이 후 입력 필드에 포커스
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, currentPrice]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 목표가 파싱
    const price = parseFloat(targetPrice.replace(/,/g, ''));

    // 유효성 검증
    if (isNaN(price) || price <= 0) {
      setError('올바른 목표가를 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    // 알림 추가 API 호출
    const result = await addAlert({
      ticker,
      market,
      stockName,
      targetPrice: price,
      direction,
    });

    setIsSubmitting(false);

    if (result.success) {
      showSuccess('알림이 추가되었습니다');
      // 성공 콜백 호출 (부모 컴포넌트에서 알림 상태 업데이트)
      onSuccess?.();
      onClose();
    } else {
      setError(result.error || '알림 추가에 실패했습니다');
      showError(result.error || '알림 추가에 실패했습니다');
    }
  };

  /**
   * 가격 입력 핸들러 (숫자 및 소수점만 허용)
   */
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setTargetPrice(value);
  };

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  // 가격 포맷팅 (표시용)
  const formattedCurrentPrice =
    market === 'KR'
      ? `${currentPrice.toLocaleString('ko-KR')}원`
      : `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    // 오버레이 (배경)
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      {/* 모달 컨테이너 */}
      <div
        className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              가격 알림 설정
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {stockName} ({ticker})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* 현재가 표시 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <span className="text-sm text-gray-500 dark:text-gray-400">현재가</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formattedCurrentPrice}
              </span>
            </div>

            {/* 목표가 입력 */}
            <div>
              <label
                htmlFor="targetPrice"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                목표가
              </label>
              <div className="relative">
                {market === 'KR' ? (
                  <input
                    ref={inputRef}
                    type="text"
                    id="targetPrice"
                    value={targetPrice}
                    onChange={handlePriceChange}
                    placeholder="목표 가격 입력"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                  />
                ) : (
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      $
                    </span>
                    <input
                      ref={inputRef}
                      type="text"
                      id="targetPrice"
                      value={targetPrice}
                      onChange={handlePriceChange}
                      placeholder="목표 가격 입력"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                    />
                  </div>
                )}
                {market === 'KR' && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    원
                  </span>
                )}
              </div>
            </div>

            {/* 알림 방향 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                알림 조건
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDirection('above')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    direction === 'above'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                  <span className="font-medium">이상</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('below')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    direction === 'below'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                  <span className="font-medium">이하</span>
                </button>
              </div>
            </div>

            {/* 알림 설명 */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {direction === 'above'
                ? `${stockName}이(가) 목표가 이상으로 올라가면 알림을 받습니다`
                : `${stockName}이(가) 목표가 이하로 내려가면 알림을 받습니다`}
            </p>

            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* 푸터 (버튼) */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !targetPrice}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  저장 중...
                </span>
              ) : (
                '알림 추가'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
