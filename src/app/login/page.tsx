'use client';

/**
 * 로그인 페이지
 *
 * Firebase Auth를 사용한 사용자 인증 페이지
 * - Google OAuth 로그인 (Firebase signInWithPopup)
 * - 테스트 모드 로그인 (개발용 - 일단 유지)
 *
 * 로그인 후 리다이렉트:
 * - 신규 사용자 (닉네임 없음) → /onboarding
 * - 기존 사용자 → /
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAuthStore } from '@/stores';
import { Sidebar, BottomNav } from '@/components/layout';

export default function LoginPage() {
  // 활성 메뉴 상태 (사이드바용)
  const [activeMenu, setActiveMenu] = useState('');
  const router = useRouter();

  // Firebase Auth 상태 (AuthProvider에서)
  const {
    isLoggedIn,
    isLoading,
    needsOnboarding,
    signInWithGoogle,
  } = useAuth();

  // Zustand 스토어 (테스트 모드용 - 일단 유지)
  const { isTestMode, testLogin, testLogout } = useAuthStore();

  // 로딩 상태 (Google 로그인 버튼 클릭 후)
  const [isSigningIn, setIsSigningIn] = useState(false);

  // 에러 메시지 상태
  const [error, setError] = useState<string | null>(null);

  /**
   * 로그인 상태 체크 및 리다이렉트
   *
   * 이미 로그인된 사용자:
   * - 신규 사용자 → /onboarding
   * - 기존 사용자 → /
   */
  useEffect(() => {
    // 로딩 중이면 대기
    if (isLoading) return;

    // 로그인 상태면 리다이렉트
    if (isLoggedIn) {
      if (needsOnboarding) {
        router.replace('/onboarding');
      } else {
        router.replace('/');
      }
    }
  }, [isLoggedIn, isLoading, needsOnboarding, router]);

  /**
   * Firebase 에러 코드별 사용자 친화적 메시지 반환
   */
  const getErrorMessage = (errorCode: string | undefined): string | null => {
    switch (errorCode) {
      case 'auth/popup-closed-by-user':
        return null; // 사용자가 취소한 경우 무시
      case 'auth/popup-blocked':
        return '팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.';
      case 'auth/unauthorized-domain':
        return '이 도메인에서는 로그인할 수 없습니다. 관리자에게 문의하세요.';
      case 'auth/operation-not-allowed':
        return 'Google 로그인이 비활성화되어 있습니다.';
      case 'auth/invalid-api-key':
        return 'Firebase 설정 오류가 발생했습니다.';
      case 'auth/network-request-failed':
        return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인하세요.';
      default:
        return '로그인에 실패했습니다. 다시 시도해주세요.';
    }
  };

  /**
   * Google 로그인 버튼 클릭 핸들러
   *
   * Firebase signInWithPopup 호출
   * 성공 시 AuthProvider의 onAuthStateChanged에서 상태 업데이트
   */
  const handleGoogleLogin = async () => {
    setError(null);
    setIsSigningIn(true);

    try {
      await signInWithGoogle();
      // 성공 시 useEffect에서 리다이렉트 처리됨
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      console.error('[LoginPage] Google 로그인 에러:', {
        code: firebaseError.code,
        message: firebaseError.message,
      });

      // Firebase 에러 코드에 따른 메시지 표시
      const errorMessage = getErrorMessage(firebaseError.code);
      setError(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  /**
   * 테스트 모드 토글 핸들러 (개발용 - 일단 유지)
   *
   * 실제 Firebase 인증 없이 테스트용 로그인/로그아웃
   */
  const handleTestLogin = () => {
    setError(null);

    if (isTestMode) {
      // 테스트 로그아웃
      testLogout();
    } else {
      // 테스트 로그인
      testLogin({
        id: 'test-user-id',
        email: 'test@alphaboard.dev',
        name: '테스트 사용자',
      });
      // 메인 페이지로 이동
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      {/* Sidebar - hidden on mobile */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Bottom Navigation - visible only on mobile */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Main Content */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300">
        <div className="min-h-screen flex items-center justify-center px-4 pb-24 md:pb-0">
          <div className="max-w-md w-full space-y-8">
            {/* Logo & Title */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">A</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AlphaBoard</h1>
              <p className="text-gray-500 dark:text-gray-400">글로벌 투자 정보 플랫폼</p>
            </div>

            {/* Google Login Button */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSigningIn || isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningIn ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">로그인 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="text-sm font-medium">Google로 계속하기</span>
                  </>
                )}
              </button>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Test Mode Toggle (개발용 - 일단 유지) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">테스트 모드</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    개발용 로그인 테스트
                  </p>
                </div>
                <button
                  onClick={handleTestLogin}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isTestMode ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isTestMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* 테스트 모드 로그인 상태 표시 */}
              {isTestMode && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    테스트 모드로 로그인됨
                  </p>
                </div>
              )}
            </div>

            {/* Terms */}
            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              로그인하면 서비스 이용약관 및 개인정보처리방침에<br />
              동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
