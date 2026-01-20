/**
 * 디버그 유틸리티 함수
 *
 * 개발 환경에서만 로그를 출력합니다.
 * 프로덕션에서는 아무것도 출력하지 않습니다.
 *
 * @example
 * ```ts
 * import { debug } from '@/lib/debug';
 *
 * debug.log('[Component]', 'message');
 * debug.warn('[Component]', 'warning');
 * debug.info('[Component]', 'info');
 * ```
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 개발 환경에서만 동작하는 console.log 래퍼
 */
function log(...args: unknown[]): void {
  if (isDevelopment) {
    console.log(...args);
  }
}

/**
 * 개발 환경에서만 동작하는 console.warn 래퍼
 */
function warn(...args: unknown[]): void {
  if (isDevelopment) {
    console.warn(...args);
  }
}

/**
 * 개발 환경에서만 동작하는 console.info 래퍼
 */
function info(...args: unknown[]): void {
  if (isDevelopment) {
    console.info(...args);
  }
}

/**
 * 항상 출력되는 에러 로그 (프로덕션에서도 출력)
 * console.error와 동일하게 동작
 */
function error(...args: unknown[]): void {
  console.error(...args);
}

export const debug = {
  log,
  warn,
  info,
  error,
};

export default debug;
