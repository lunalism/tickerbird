'use client';

/**
 * 프로필 페이지
 *
 * 사용자 프로필 정보, 활동 통계, 설정을 표시합니다.
 * 전역 AuthContext (Firebase Auth)를 사용하여 인증 상태를 확인합니다.
 *
 * 데이터 소스:
 * - 사용자 정보: Firebase Auth + Firestore users 컬렉션
 * - 활동 통계: Firestore (posts, watchlist 컬렉션)
 */

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
  AvatarSelectModal,
} from '@/components/features/profile';
import { defaultUserSettings } from '@/constants';
import { showSuccess, showError, showWarning, showInfo } from '@/lib/toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ProfilePage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('profile');

  // 전역 인증 상태 사용 (Firebase Auth)
  const { user, userProfile: authProfile, isLoading, isLoggedIn, isProfileLoading, signOut, updateAvatarId } = useAuth();

  // 로컬 상태
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false); // 아바타 선택 모달 상태
  const [joinDate, setJoinDate] = useState<string>('');
  const [activitySummary, setActivitySummary] = useState<ActivitySummary>({
    posts: 0,
    comments: 0,
    watchlist: 0,
  });


  // 가입일과 활동 통계 가져오기
  useEffect(() => {
    if (authProfile?.id) {
      const fetchUserData = async () => {
        // 1. Firebase에서 가입일 가져오기 (Firestore users 컬렉션)
        try {
          const userDocRef = doc(db, 'users', authProfile.id);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.createdAt) {
              // Firestore Timestamp를 Date로 변환
              const date = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
              const formatted = date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
              setJoinDate(formatted);
            }
          }
        } catch (err) {
          console.error('[ProfilePage] Firestore 가입일 조회 에러:', err);
          // Firebase Auth의 생성 시간 사용 (폴백)
          if (user?.metadata?.creationTime) {
            const date = new Date(user.metadata.creationTime);
            const formatted = date.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            setJoinDate(formatted);
          }
        }

        // 2. 활동 통계 가져오기 (Firestore)
        try {
          // 게시글 수 조회
          const postsQuery = query(
            collection(db, 'posts'),
            where('userId', '==', authProfile.id)
          );
          const postsSnapshot = await getDocs(postsQuery);

          // 관심종목 수 조회
          const watchlistQuery = query(
            collection(db, 'watchlist'),
            where('userId', '==', authProfile.id)
          );
          const watchlistSnapshot = await getDocs(watchlistQuery);

          // 댓글 수는 서브컬렉션이라 직접 조회 어려움, 0으로 표시
          // (추후 별도 카운터 필드 도입 시 수정)
          setActivitySummary({
            posts: postsSnapshot.size,
            comments: 0,
            watchlist: watchlistSnapshot.size,
          });
        } catch (err) {
          console.error('[ProfilePage] 활동 통계 조회 에러:', err);
        }
      };
      fetchUserData();
    }
  }, [authProfile?.id, user]);

  // UI용 프로필 데이터 생성
  // nickname을 최우선으로 사용, 없으면 displayName 사용
  // avatarId가 있으면 동물 아바타 사용, 없으면 Google 프로필 사진 사용
  const userProfile: UserProfile & { avatarId?: string } = useMemo(() => ({
    id: authProfile?.id || '',
    // 닉네임 표시 우선순위: nickname > displayName > 기본값
    name: authProfile?.nickname || authProfile?.displayName || '사용자',
    email: authProfile?.email || '',
    // 아바타 표시: avatarId가 있으면 UserAvatar에서 처리, 없으면 Google 사진 사용
    avatarId: authProfile?.avatarId,
    avatar: authProfile?.avatarUrl,
    joinDate: joinDate || '알 수 없음',
  }), [authProfile, joinDate]);

  /**
   * 프로필 수정 모달 열기
   */
  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  /**
   * 아바타 선택 모달 열기
   */
  const handleAvatarClick = () => {
    setShowAvatarModal(true);
  };

  /**
   * 아바타 저장 완료 핸들러
   * AvatarSelectModal에서 저장 성공 시 호출됨
   */
  const handleAvatarSave = async (avatarId: string) => {
    try {
      await updateAvatarId(avatarId);
    } catch (err) {
      console.error('[ProfilePage] 아바타 저장 에러:', err);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    await signOut();
    setShowLogoutModal(false);
    showSuccess('로그아웃되었습니다');
    router.push('/');
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  /**
   * 설정 변경 핸들러
   */
  const handleSettingsChange = (newSettings: UserSettings) => {
    setSettings(newSettings);
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
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">프로필</h1>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">계정 정보와 설정을 관리하세요</p>
            </div>
          </div>

          {/* 로딩 중 */}
          {isLoading || isProfileLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !isLoggedIn ? (
            // 비로그인 상태
            <ProfileLoginPrompt onLogin={() => router.push('/login')} />
          ) : (
            // 로그인된 상태 - 프로필 표시
            <div className="space-y-6">
              {/* Profile Card - 아바타 클릭 시 아바타 선택 모달 열림 */}
              <ProfileCard
                profile={userProfile}
                onEdit={handleEditProfile}
                onLogout={handleLogoutClick}
                onAvatarClick={handleAvatarClick}
              />

              {/* Activity Summary */}
              <ActivitySummaryCard activity={activitySummary} />

              {/* Settings */}
              <SettingsSection
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />

              {/* 토스트 테스트 섹션 */}
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

      {/* Edit Profile Modal - 프로필 수정 모달 */}
      {/* currentName에 nickname 우선 사용 (nickname이 없으면 displayName 사용) */}
      {authProfile && (
        <EditProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          userId={authProfile.id}
          currentName={authProfile.nickname || authProfile.displayName || ''}
          currentAvatar={authProfile.avatarUrl}
        />
      )}

      {/* Avatar Select Modal - 아바타 선택 모달 */}
      {authProfile && (
        <AvatarSelectModal
          isOpen={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          userId={authProfile.id}
          currentAvatarId={authProfile.avatarId}
          onSave={handleAvatarSave}
        />
      )}
    </div>
  );
}

/**
 * 토스트 테스트 섹션 컴포넌트
 */
function ToastTestSection() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
          <span className="text-xl">🔔</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">토스트 테스트</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">각 타입의 토스트 알림을 테스트해보세요</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => showSuccess('작업이 성공적으로 완료되었습니다', '변경사항이 저장되었습니다')}
          className="flex flex-col items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <span className="text-2xl">✅</span>
          <span className="text-sm font-medium text-green-700 dark:text-green-400">성공</span>
        </button>

        <button
          onClick={() => showError('오류가 발생했습니다', '잠시 후 다시 시도해주세요')}
          className="flex flex-col items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <span className="text-2xl">❌</span>
          <span className="text-sm font-medium text-red-700 dark:text-red-400">에러</span>
        </button>

        <button
          onClick={() => showWarning('주의가 필요합니다', '저장 공간이 부족합니다')}
          className="flex flex-col items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
        >
          <span className="text-2xl">⚠️</span>
          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">경고</span>
        </button>

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
