'use client';

/**
 * OnboardingModal - 신규 사용자 온보딩 모달
 *
 * 신규 사용자가 처음 로그인 시 Tickerbird 전용 닉네임과 아바타를 설정하는 모달입니다.
 * 이 모달은 필수 입력이므로 배경 클릭이나 ESC 키로 닫을 수 없습니다.
 *
 * 기능:
 * - Tickerbird 전용 닉네임 입력
 * - Google displayName을 기본값으로 제공 (수정 가능)
 * - 실시간 유효성 검사 (2-20자, 한글/영문/숫자만)
 * - 10종 동물 아바타 선택 (5x2 그리드)
 * - 온보딩 완료 시 Firestore에 nickname, avatarId, onboardingCompleted 저장
 *
 * 표시 조건:
 * - isLoggedIn === true (로그인 상태)
 * - needsOnboarding === true (온보딩 필요)
 */

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/components/providers/AuthProvider';
import { showSuccess, showError } from '@/lib/toast';
import { AVATARS, DEFAULT_AVATAR_ID } from '@/constants/avatars';

/**
 * 닉네임 유효성 검사 함수
 *
 * @param value - 검사할 닉네임
 * @returns 에러 메시지 또는 null (유효한 경우)
 *
 * 규칙:
 * - 2자 이상 20자 이하
 * - 한글, 영문, 숫자만 허용 (특수문자, 공백 불가)
 */
const validateNickname = (value: string): string | null => {
  // 빈 값 검사
  if (!value.trim()) return '닉네임을 입력해주세요';

  // 길이 검사
  if (value.length < 2) return '닉네임은 2자 이상이어야 합니다';
  if (value.length > 20) return '닉네임은 20자 이하여야 합니다';

  // 허용 문자 검사 (한글, 영문, 숫자만)
  const regex = /^[가-힣a-zA-Z0-9]+$/;
  if (!regex.test(value)) return '한글, 영문, 숫자만 사용할 수 있습니다';

  return null;
};

/**
 * OnboardingModal 컴포넌트
 *
 * 전역적으로 렌더링되어 온보딩이 필요한 사용자에게 표시됩니다.
 * AuthProvider의 needsOnboarding 상태에 따라 자동으로 표시/숨김 처리됩니다.
 */
export function OnboardingModal() {
  // ========================================
  // Auth 상태 가져오기
  // ========================================
  const {
    userProfile,
    isLoggedIn,
    needsOnboarding,
    completeOnboarding,
  } = useAuth();

  // ========================================
  // 로컬 상태 관리
  // ========================================

  /** 닉네임 입력값 */
  const [nickname, setNickname] = useState('');

  /** 선택한 아바타 ID */
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR_ID);

  /** 저장 중 로딩 상태 */
  const [isSaving, setIsSaving] = useState(false);

  /** 유효성 검사 에러 메시지 */
  const [error, setError] = useState<string | null>(null);

  // ========================================
  // 초기값 설정 (Google displayName)
  // ========================================

  useEffect(() => {
    // 온보딩 모달이 표시될 때 Google displayName을 기본값으로 설정
    if (needsOnboarding && userProfile) {
      // displayName이 있으면 기본값으로 사용 (사용자가 수정 가능)
      const defaultNickname = userProfile.displayName || '';
      setNickname(defaultNickname);
      setError(null);
    }
  }, [needsOnboarding, userProfile]);

  // ========================================
  // ESC 키 방지 (필수 입력이므로)
  // ========================================

  useEffect(() => {
    // 온보딩 모달이 표시 중일 때 ESC 키 이벤트 차단
    const handleKeyDown = (e: KeyboardEvent) => {
      if (needsOnboarding && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (needsOnboarding) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [needsOnboarding]);

  // ========================================
  // 이벤트 핸들러
  // ========================================

  /**
   * 닉네임 입력 변경 핸들러
   * - 입력값 업데이트
   * - 에러가 있었으면 실시간 재검사
   */
  const handleNicknameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNickname(value);

    // 에러가 있었으면 다시 검사 (실시간 피드백)
    if (error) {
      setError(validateNickname(value));
    }
  }, [error]);

  /**
   * "시작하기" 버튼 클릭 핸들러
   * - 유효성 검사
   * - completeOnboarding 호출 (Firestore 업데이트)
   * - 성공 시 모달 자동 닫힘 (needsOnboarding = false)
   */
  const handleSubmit = useCallback(async () => {
    // 유효성 검사
    const validationError = validateNickname(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // AuthProvider의 completeOnboarding 호출
      // - Firestore에 nickname, avatarId, onboardingCompleted 저장
      // - needsOnboarding 상태 업데이트 → 모달 자동 닫힘
      await completeOnboarding(nickname.trim(), selectedAvatar);

      showSuccess('환영합니다!', `${nickname.trim()}님, Tickerbird에 오신 것을 환영합니다!`);
    } catch (err) {
      console.error('[OnboardingModal] 온보딩 완료 에러:', err);
      showError('오류가 발생했습니다', '잠시 후 다시 시도해주세요');
      setIsSaving(false);
    }
  }, [nickname, selectedAvatar, completeOnboarding]);

  // ========================================
  // 렌더링 조건 체크
  // ========================================

  // 온보딩이 필요 없으면 렌더링하지 않음
  // - 로그인 안됨
  // - 온보딩 완료됨
  if (!isLoggedIn || !needsOnboarding) {
    return null;
  }

  // ========================================
  // 렌더링
  // ========================================

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* 오버레이 (클릭해도 닫히지 않음 - 필수 입력) */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 모달 본체 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 w-[90%] max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* 환영 헤더 */}
        <div className="text-center mb-8">
          {/* 환영 아이콘 */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">A</span>
          </div>

          {/* 제목 */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            환영합니다!
          </h2>

          {/* 설명 */}
          <p className="text-gray-600 dark:text-gray-300">
            Tickerbird에서 사용할 닉네임을 설정해주세요
          </p>
        </div>

        {/* Google 계정 정보 (참고용) */}
        {userProfile?.email && (
          <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              {/* Google 프로필 이미지 */}
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt="프로필"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {userProfile.displayName?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* Google displayName */}
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {userProfile.displayName}
                </p>
                {/* 이메일 */}
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userProfile.email}
                </p>
              </div>

              {/* Google 아이콘 */}
              <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* 닉네임 입력 필드 */}
        <div className="mb-6">
          <label
            htmlFor="onboarding-nickname"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            닉네임
          </label>
          <input
            id="onboarding-nickname"
            type="text"
            value={nickname}
            onChange={handleNicknameChange}
            placeholder="닉네임을 입력하세요"
            className={`w-full px-4 py-3 text-lg border rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
              error
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-200 dark:border-gray-600'
            }`}
            disabled={isSaving}
            maxLength={20}
            autoFocus
          />

          {/* 에러 메시지 또는 도움말 */}
          {error ? (
            <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              2-20자, 한글/영문/숫자만 사용 가능
            </p>
          )}
        </div>

        {/* 아바타 선택 섹션 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            프로필 아바타
          </label>
          <div className="grid grid-cols-5 gap-2">
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                onClick={() => setSelectedAvatar(avatar.id)}
                disabled={isSaving}
                className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-200 ${
                  selectedAvatar === avatar.id
                    ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 scale-105'
                    : 'hover:scale-105 hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={avatar.name}
              >
                <Image
                  src={avatar.path}
                  alt={avatar.name}
                  fill
                  sizes="(max-width: 768px) 50px, 60px"
                  className="object-cover"
                />
                {/* 선택 표시 체크마크 */}
                {selectedAvatar === avatar.id && (
                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            프로필에 표시될 아바타를 선택하세요
          </p>
        </div>

        {/* 시작하기 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={isSaving || !nickname.trim()}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              설정 중...
            </>
          ) : (
            <>
              시작하기
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
