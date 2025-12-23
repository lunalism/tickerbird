'use client';

/**
 * ToastProvider 컴포넌트
 *
 * sonner 라이브러리의 Toaster를 설정합니다.
 * - 위치: 데스크톱은 우측 상단, 모바일은 하단 중앙
 * - 다크모드 자동 감지 및 적용
 * - 타입별 커스텀 스타일 적용
 */

import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';

export function ToastProvider() {
  // 다크모드 상태 감지
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 초기 다크모드 상태 확인
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // MutationObserver로 클래스 변경 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkDarkMode();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Toaster
      // 다크모드 테마 연동
      theme={isDark ? 'dark' : 'light'}
      // 위치 설정: 데스크톱은 우측 상단
      position="top-right"
      // 토스트 표시 시간 (ms)
      duration={3000}
      // 최대 표시 개수
      visibleToasts={5}
      // 닫기 버튼 표시
      closeButton
      // 토스트 간격
      gap={12}
      // 반응형: 모바일에서는 하단 중앙으로 이동
      // (CSS로 처리)
      toastOptions={{
        // 공통 스타일
        className: 'toast-custom',
        style: {
          // 기본 스타일
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          fontFamily: 'Pretendard Variable, Pretendard, system-ui, sans-serif',
        },
        // 타입별 스타일
        classNames: {
          // 성공 토스트: 초록색
          success: 'toast-success',
          // 에러 토스트: 빨간색
          error: 'toast-error',
          // 경고 토스트: 노란색
          warning: 'toast-warning',
          // 정보 토스트: 파란색
          info: 'toast-info',
        },
      }}
    />
  );
}
