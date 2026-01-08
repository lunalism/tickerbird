'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores';
import { showSuccess, showError } from '@/lib/toast';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser, isLoggedIn } = useAuthStore();
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 닉네임 유효성 검사
  const validateNickname = (value: string): string | null => {
    if (value.length < 2) return '닉네임은 2자 이상이어야 합니다';
    if (value.length > 20) return '닉네임은 20자 이하여야 합니다';
    // 한글, 영문, 숫자만 허용
    const regex = /^[가-힣a-zA-Z0-9]+$/;
    if (!regex.test(value)) return '한글, 영문, 숫자만 사용할 수 있습니다';
    return null;
  };

  // 페이지 접근 권한 확인
  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // 로그인 안 한 사용자 → 로그인 페이지로
        router.replace('/login');
        return;
      }

      // 이미 닉네임이 있는 사용자인지 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', session.user.id)
        .single();

      if (profile?.name) {
        // 이미 닉네임이 있으면 홈으로
        router.replace('/');
        return;
      }

      setIsLoading(false);
    };

    checkAccess();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateNickname(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        showError('로그인이 필요합니다');
        router.replace('/login');
        return;
      }

      // profiles 테이블에 닉네임 저장
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          name: nickname.trim(),
          email: session.user.email,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) throw upsertError;

      // Zustand 스토어 업데이트
      if (user) {
        setUser({
          ...user,
          name: nickname.trim(),
        });
      }

      showSuccess('환영합니다! 🎉');
      router.replace('/');
    } catch (err) {
      console.error('[Onboarding] 에러:', err);
      showError('닉네임 저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNickname(value);
    if (error) {
      setError(validateNickname(value));
    }
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              AlphaBoard에 오신 것을
            </h1>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              환영합니다!
            </p>
          </div>

          {/* 프로필 이미지 */}
          <div className="flex justify-center mb-8">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="프로필"
                className="w-24 h-24 rounded-full object-cover border-4 border-blue-100 dark:border-blue-900"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center border-4 border-blue-100 dark:border-blue-900">
                <span className="text-4xl text-white font-bold">
                  {user?.email?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>

          {/* 닉네임 입력 폼 */}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                사용할 닉네임을 입력해주세요
              </label>
              <input
                type="text"
                value={nickname}
                onChange={handleNicknameChange}
                placeholder="닉네임"
                className={`w-full px-4 py-3 border rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg ${
                  error
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-200 dark:border-gray-600'
                }`}
                disabled={isSaving}
                maxLength={20}
                autoFocus
              />
              {error ? (
                <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                  2-20자, 한글/영문/숫자만 사용 가능
                </p>
              )}
            </div>

            {/* 시작하기 버튼 */}
            <button
              type="submit"
              disabled={isSaving || !nickname.trim()}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </>
              ) : (
                '시작하기'
              )}
            </button>
          </form>
        </div>

        {/* 푸터 */}
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
          닉네임은 나중에 프로필에서 변경할 수 있습니다
        </p>
      </div>
    </div>
  );
}
