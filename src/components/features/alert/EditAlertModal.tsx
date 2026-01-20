/**
 * 알림 수정 모달 컴포넌트
 *
 * 기존 가격 알림의 목표가와 방향을 수정하기 위한 모달 UI
 * /alerts 페이지에서 수정 버튼 클릭 시 표시
 *
 * 기능:
 * - 목표가 수정
 * - 알림 방향 변경 (이상/이하)
 * - 저장 시 isTriggered 자동 리셋 (서버에서 처리)
 *
 * 사용 예:
 * ```tsx
 * <EditAlertModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   alert={selectedAlert}
 *   onSuccess={() => console.log('수정 완료')}
 * />
 * ```
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAlerts } from '@/hooks';
import { PriceAlert, AlertDirection } from '@/types/priceAlert';
import { showSuccess, showError } from '@/lib/toast';

/**
 * 모달 Props
 */
interface EditAlertModalProps {
  // 모달 열림 상태
  isOpen: boolean;
  // 모달 닫기 핸들러
  onClose: () => void;
  // 수정할 알림 데이터
  alert: PriceAlert | null;
  // 수정 성공 시 콜백
  onSuccess?: () => void;
  // 삭제 버튼 표시 여부 (기본값: false)
  showDelete?: boolean;
  // 삭제 성공 시 콜백
  onDelete?: () => void;
}

/**
 * 로딩 스피너 컴포넌트
 * 저장 버튼 내부에 표시되는 작은 회전 애니메이션
 */
function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      {/* 배경 원 (투명도 낮음) */}
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      {/* 회전하는 호 (투명도 높음) */}
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * 알림 수정 모달 컴포넌트
 */
export function EditAlertModal({
  isOpen,
  onClose,
  alert,
  onSuccess,
  showDelete = false,
  onDelete,
}: EditAlertModalProps) {
  // 알림 관리 훅
  const { updateAlert, deleteAlert } = useAlerts();

  // 삭제 중 상태
  const [isDeleting, setIsDeleting] = useState(false);

  // 입력 상태
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [direction, setDirection] = useState<AlertDirection>('above');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 입력 필드 참조 (포커스용)
  const inputRef = useRef<HTMLInputElement>(null);

  // 모달 열릴 때 기존 값으로 초기화 및 포커스
  useEffect(() => {
    if (isOpen && alert) {
      // 기존 알림 값으로 초기화
      setTargetPrice(alert.targetPrice.toString());
      setDirection(alert.direction);
      setError(null);

      // 약간의 딜레이 후 입력 필드에 포커스
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, alert]);

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

    // 알림 데이터가 없으면 중단
    if (!alert) {
      setError('알림 데이터를 찾을 수 없습니다');
      return;
    }

    // 목표가 파싱 (쉼표 제거)
    const price = parseFloat(targetPrice.replace(/,/g, ''));

    // 유효성 검증
    if (isNaN(price) || price <= 0) {
      setError('올바른 목표가를 입력해주세요');
      return;
    }

    // 변경 사항 확인 (변경 없으면 그냥 닫기)
    const priceChanged = price !== alert.targetPrice;
    const directionChanged = direction !== alert.direction;

    if (!priceChanged && !directionChanged) {
      // 변경 사항 없으면 그냥 모달 닫기
      onClose();
      return;
    }

    setIsSubmitting(true);

    // 알림 수정 API 호출
    // 목표가나 방향이 변경되면 서버에서 isTriggered = false로 자동 리셋
    const result = await updateAlert(alert.id, {
      targetPrice: price,
      direction,
    });

    setIsSubmitting(false);

    if (result.success) {
      showSuccess('알림이 수정되었습니다');
      // 성공 콜백 호출 (부모 컴포넌트에서 목록 상태 업데이트)
      onSuccess?.();
      onClose();
    } else {
      setError(result.error || '알림 수정에 실패했습니다');
      showError(result.error || '알림 수정에 실패했습니다');
    }
  };

  /**
   * 가격 입력 핸들러 (숫자 및 소수점만 허용)
   */
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setTargetPrice(value);
  };

  /**
   * 알림 삭제 핸들러
   * 삭제 확인 후 API 호출
   */
  const handleDelete = async () => {
    // 알림 데이터가 없으면 중단
    if (!alert) return;

    // 삭제 확인
    const confirmed = confirm(`${alert.stockName}의 가격 알림을 삭제하시겠습니까?`);
    if (!confirmed) return;

    setIsDeleting(true);

    // 알림 삭제 API 호출
    const result = await deleteAlert(alert.id);

    setIsDeleting(false);

    if (result.success) {
      showSuccess('알림이 삭제되었습니다');
      // 삭제 성공 콜백 호출 (부모 컴포넌트에서 아이콘 상태 업데이트)
      onDelete?.();
      onClose();
    } else {
      showError(result.error || '알림 삭제에 실패했습니다');
    }
  };

  // 모달이 닫혀있거나 알림 데이터가 없으면 렌더링하지 않음
  if (!isOpen || !alert) return null;

  // 가격 포맷팅 (표시용)
  const currencySymbol = alert.market === 'KR' ? '원' : '$';

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
              가격 알림 수정
            </h2>
            {/* 종목 정보 (수정 불가) */}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {alert.stockName} ({alert.ticker})
            </p>
          </div>
          {/* 닫기 버튼 */}
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
            {/* 발동됨 안내 (발동된 알림 수정 시) */}
            {alert.isTriggered && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  수정하면 발동 상태가 초기화되어 다시 알림을 받을 수 있습니다.
                </p>
              </div>
            )}

            {/* 목표가 입력 */}
            <div>
              <label
                htmlFor="targetPrice"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                목표가
              </label>
              <div className="relative">
                {alert.market === 'KR' ? (
                  // 한국 시장: 원화 (입력 필드 오른쪽에 "원" 표시)
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
                  // 미국 시장: 달러 (입력 필드 왼쪽에 "$" 표시)
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
                {/* 한국 시장일 때만 "원" 접미사 표시 */}
                {alert.market === 'KR' && (
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
                {/* 이상 버튼 */}
                <button
                  type="button"
                  onClick={() => setDirection('above')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    direction === 'above'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  {/* 상승 화살표 아이콘 */}
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
                {/* 이하 버튼 */}
                <button
                  type="button"
                  onClick={() => setDirection('below')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    direction === 'below'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  {/* 하락 화살표 아이콘 */}
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
                ? `${alert.stockName}이(가) 목표가 이상으로 올라가면 알림을 받습니다`
                : `${alert.stockName}이(가) 목표가 이하로 내려가면 알림을 받습니다`}
            </p>

            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* 푸터 (버튼) */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between">
            {/* 삭제 버튼 (showDelete=true일 때만 표시) */}
            {showDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="px-4 py-3 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? (
                  // 삭제 중: 로딩 스피너 표시
                  <span className="flex items-center gap-2">
                    <Spinner />
                    삭제 중...
                  </span>
                ) : (
                  '삭제'
                )}
              </button>
            ) : (
              // 삭제 버튼 없을 때 빈 공간
              <div />
            )}
            {/* 취소/저장 버튼 */}
            <div className="flex gap-3">
              {/* 취소 버튼 */}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                취소
              </button>
              {/* 저장 버튼 */}
              <button
                type="submit"
                disabled={isSubmitting || isDeleting || !targetPrice}
                className="px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  // 저장 중: 로딩 스피너 표시
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    저장 중...
                  </span>
                ) : (
                  '저장'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
