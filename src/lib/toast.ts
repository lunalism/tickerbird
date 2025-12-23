/**
 * 토스트 알림 유틸리티 함수
 *
 * sonner 라이브러리를 래핑하여 일관된 토스트 알림을 제공합니다.
 * 각 타입별로 적절한 아이콘과 스타일이 적용됩니다.
 *
 * @example
 * import { showSuccess, showError } from '@/lib/toast';
 *
 * // 성공 토스트
 * showSuccess('저장되었습니다');
 *
 * // 에러 토스트
 * showError('오류가 발생했습니다');
 */

import { toast } from 'sonner';

/**
 * 성공 토스트 표시
 *
 * @param message - 표시할 메시지
 * @param description - 선택적 설명 텍스트
 *
 * @example
 * showSuccess('관심종목에 추가되었습니다');
 * showSuccess('설정 저장 완료', '변경사항이 적용되었습니다');
 */
export function showSuccess(message: string, description?: string) {
  toast.success(message, {
    description,
    icon: '✅',
  });
}

/**
 * 에러 토스트 표시
 *
 * @param message - 표시할 메시지
 * @param description - 선택적 설명 텍스트
 *
 * @example
 * showError('저장에 실패했습니다');
 * showError('네트워크 오류', '잠시 후 다시 시도해주세요');
 */
export function showError(message: string, description?: string) {
  toast.error(message, {
    description,
    icon: '❌',
  });
}

/**
 * 경고 토스트 표시
 *
 * @param message - 표시할 메시지
 * @param description - 선택적 설명 텍스트
 *
 * @example
 * showWarning('저장 공간이 부족합니다');
 * showWarning('세션 만료 예정', '10분 후 자동 로그아웃됩니다');
 */
export function showWarning(message: string, description?: string) {
  toast.warning(message, {
    description,
    icon: '⚠️',
  });
}

/**
 * 정보 토스트 표시
 *
 * @param message - 표시할 메시지
 * @param description - 선택적 설명 텍스트
 *
 * @example
 * showInfo('새로운 기능이 추가되었습니다');
 * showInfo('업데이트 안내', '앱이 최신 버전으로 업데이트되었습니다');
 */
export function showInfo(message: string, description?: string) {
  toast.info(message, {
    description,
    icon: 'ℹ️',
  });
}

/**
 * 로딩 토스트 표시 (Promise 기반)
 *
 * 비동기 작업의 진행 상태를 표시합니다.
 * Promise가 resolve되면 성공, reject되면 에러 토스트로 자동 전환됩니다.
 *
 * @param promise - 추적할 Promise
 * @param messages - 각 상태별 메시지
 *
 * @example
 * showLoading(
 *   saveSettings(),
 *   {
 *     loading: '저장 중...',
 *     success: '저장되었습니다',
 *     error: '저장에 실패했습니다',
 *   }
 * );
 */
export function showLoading<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
}

/**
 * 커스텀 토스트 표시
 *
 * 기본 타입에 맞지 않는 특별한 토스트가 필요할 때 사용합니다.
 *
 * @param message - 표시할 메시지
 * @param options - sonner 토스트 옵션
 *
 * @example
 * showCustom('새 알림이 있습니다', {
 *   icon: '🔔',
 *   duration: 5000,
 *   action: {
 *     label: '확인',
 *     onClick: () => console.log('clicked'),
 *   },
 * });
 */
export function showCustom(
  message: string,
  options?: Parameters<typeof toast>[1]
) {
  toast(message, options);
}

/**
 * 모든 토스트 닫기
 *
 * 화면에 표시된 모든 토스트를 한 번에 닫습니다.
 *
 * @example
 * dismissAll();
 */
export function dismissAll() {
  toast.dismiss();
}
