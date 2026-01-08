'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { UserSettings, UserProfile, ActivitySummary } from '@/types';
import { Sidebar, BottomNav } from '@/components/layout';
import {
  ProfileLoginPrompt,
  ProfileCard,
  ActivitySummaryCard,
  SettingsSection,
  EditProfileModal,
} from '@/components/features/profile';
import { defaultUserSettings } from '@/constants';
import { useAuthStore } from '@/stores';
import { showSuccess, showError, showWarning, showInfo } from '@/lib/toast';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('profile');
  const { isLoggedIn, user, isTestMode, setUser, toggleLogin, login, logout } = useAuthStore();
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [joinDate, setJoinDate] = useState<string>('');
  const [activitySummary, setActivitySummary] = useState<ActivitySummary>({
    posts: 0,
    comments: 0,
    watchlist: 0,
  });

  // Hydration 문제 방지
  useEffect(() => {
    setMounted(true);
  }, []);

  // Supabase에서 가입일과 활동 통계 가져오기
  useEffect(() => {
    if (user?.id) {
      const fetchUserData = async () => {
        const supabase = createClient();

        // 가입일 가져오기
        const { data } = await supabase.auth.getUser();
        if (data.user?.created_at) {
          const date = new Date(data.user.created_at);
          setJoinDate(date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }));
        }

        // 활동 통계 가져오기 (병렬 실행)
        const [postsResult, commentsResult, watchlistResult] = await Promise.all([
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('watchlist')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);

        setActivitySummary({
          posts: postsResult.count || 0,
          comments: commentsResult.count || 0,
          watchlist: watchlistResult.count || 0,
        });
      };
      fetchUserData();
    }
  }, [user?.id]);

  // 실제 사용자 프로필 데이터 생성
  const userProfile: UserProfile = useMemo(() => ({
    id: user?.id || '',
    name: user?.name || '사용자',
    email: user?.email || '',
    avatar: user?.avatarUrl,
    joinDate: joinDate || '알 수 없음',
  }), [user, joinDate]);

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSaveProfile = (name: string, avatarUrl?: string) => {
    // Zustand 스토어의 user 정보 업데이트
    if (user) {
      setUser({
        ...user,
        name,
        avatarUrl: avatarUrl || user.avatarUrl,
      });
    }
  };

  const handleTestToggle = () => {
    if (isLoggedIn) {
      // 로그인 상태에서 토글 OFF → 즉시 로그아웃 후 홈으로 이동
      toggleLogin();
      router.push('/');
    } else {
      // 비로그인 상태에서 토글 ON
      toggleLogin();
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutModal(false);
    showSuccess('로그아웃되었습니다');
    router.push('/');
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  /**
   * 설정 변경 핸들러
   * 설정이 변경되면 토스트로 알림을 표시합니다.
   */
  const handleSettingsChange = (newSettings: UserSettings) => {
    setSettings(newSettings);
    // 설정 저장 완료 토스트
    showSuccess('설정이 저장되었습니다');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      {/* Sidebar - hidden on mobile */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Bottom Navigation - visible only on mobile */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Main Content */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">프로필</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">계정 정보와 설정을 관리하세요</p>
            </div>

            {/* Login Test Toggle - 테스트 모드일 때만 표시 (실제 로그인 시 숨김) */}
            {mounted && isTestMode && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">테스트 모드</span>
                <button
                  onClick={handleTestToggle}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isLoggedIn ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      isLoggedIn ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {!(mounted && isLoggedIn) ? (
            <ProfileLoginPrompt onLogin={login} />
          ) : (
            <div className="space-y-6">
              {/* Profile Card */}
              <ProfileCard profile={userProfile} onEdit={handleEditProfile} onLogout={handleLogoutClick} />

              {/* Activity Summary */}
              <ActivitySummaryCard activity={activitySummary} />

              {/* Settings - 설정 변경 시 토스트 표시 */}
              <SettingsSection
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />

              {/* ========== 토스트 테스트 섹션 ========== */}
              <ToastTestSection />
            </div>
          )}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleLogoutCancel}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-[90%] max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">로그아웃</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">정말 로그아웃하시겠습니까?</p>
            <div className="flex gap-3">
              <button
                onClick={handleLogoutCancel}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {user && (
        <EditProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          userId={user.id}
          currentName={user.name}
          currentAvatar={user.avatarUrl}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}

/**
 * 토스트 테스트 섹션 컴포넌트
 *
 * 4가지 타입의 토스트를 테스트할 수 있는 버튼을 제공합니다.
 * - 성공 (success): 초록색
 * - 에러 (error): 빨간색
 * - 경고 (warning): 노란색
 * - 정보 (info): 파란색
 */
function ToastTestSection() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
          <span className="text-xl">🔔</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">토스트 테스트</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">각 타입의 토스트 알림을 테스트해보세요</p>
        </div>
      </div>

      {/* 토스트 버튼들 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 성공 토스트 버튼 */}
        <button
          onClick={() => showSuccess('작업이 성공적으로 완료되었습니다', '변경사항이 저장되었습니다')}
          className="flex flex-col items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <span className="text-2xl">✅</span>
          <span className="text-sm font-medium text-green-700 dark:text-green-400">성공</span>
        </button>

        {/* 에러 토스트 버튼 */}
        <button
          onClick={() => showError('오류가 발생했습니다', '잠시 후 다시 시도해주세요')}
          className="flex flex-col items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <span className="text-2xl">❌</span>
          <span className="text-sm font-medium text-red-700 dark:text-red-400">에러</span>
        </button>

        {/* 경고 토스트 버튼 */}
        <button
          onClick={() => showWarning('주의가 필요합니다', '저장 공간이 부족합니다')}
          className="flex flex-col items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
        >
          <span className="text-2xl">⚠️</span>
          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">경고</span>
        </button>

        {/* 정보 토스트 버튼 */}
        <button
          onClick={() => showInfo('새로운 기능 안내', '다크모드가 추가되었습니다')}
          className="flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <span className="text-2xl">ℹ️</span>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">정보</span>
        </button>
      </div>
    </div>
  );
}
