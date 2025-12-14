'use client';

import { useState } from 'react';
import { UserSettings } from '@/types';
import { Sidebar, BottomNav } from '@/components/layout';
import {
  ProfileLoginPrompt,
  ProfileCard,
  ActivitySummaryCard,
  SettingsSection,
} from '@/components/features/profile';
import {
  dummyUserProfile,
  dummyActivitySummary,
  defaultUserSettings,
} from '@/constants';

export default function ProfilePage() {
  const [activeMenu, setActiveMenu] = useState('profile');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleEditProfile = () => {
    alert('프로필 수정 기능은 준비 중입니다.');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
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
              <h1 className="text-2xl font-bold text-gray-900 mb-1">프로필</h1>
              <p className="text-gray-500 text-sm">계정 정보와 설정을 관리하세요</p>
            </div>

            {/* Login Test Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">로그인 테스트</span>
              <button
                onClick={() => setIsLoggedIn(!isLoggedIn)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isLoggedIn ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    isLoggedIn ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {!isLoggedIn ? (
            <ProfileLoginPrompt onLogin={handleLogin} />
          ) : (
            <div className="space-y-6">
              {/* Profile Card */}
              <ProfileCard profile={dummyUserProfile} onEdit={handleEditProfile} />

              {/* Activity Summary */}
              <ActivitySummaryCard activity={dummyActivitySummary} />

              {/* Settings */}
              <SettingsSection
                settings={settings}
                onSettingsChange={setSettings}
                onLogout={handleLogout}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
