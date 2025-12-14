'use client';

import { UserSettings, ThemeMode, Language } from '@/types';

interface SettingsSectionProps {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  onLogout: () => void;
}

export function SettingsSection({ settings, onSettingsChange, onLogout }: SettingsSectionProps) {
  const handleNotificationChange = (key: keyof UserSettings['notifications']) => {
    onSettingsChange({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    });
  };

  const handleThemeChange = (theme: ThemeMode) => {
    if (theme === 'light') {
      onSettingsChange({ ...settings, theme });
    }
  };

  const handleLanguageChange = (language: Language) => {
    onSettingsChange({ ...settings, language });
  };

  return (
    <div className="space-y-6">
      {/* Notification Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          알림 설정
        </h3>
        <div className="space-y-4">
          <ToggleItem
            label="관심종목 알림"
            description="관심종목의 가격 변동 알림"
            checked={settings.notifications.watchlist}
            onChange={() => handleNotificationChange('watchlist')}
          />
          <ToggleItem
            label="커뮤니티 댓글 알림"
            description="내 게시글에 댓글이 달리면 알림"
            checked={settings.notifications.comments}
            onChange={() => handleNotificationChange('comments')}
          />
          <ToggleItem
            label="뉴스 알림"
            description="중요 뉴스 및 속보 알림"
            checked={settings.notifications.news}
            onChange={() => handleNotificationChange('news')}
          />
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          테마 설정
        </h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="theme"
              checked={settings.theme === 'light'}
              onChange={() => handleThemeChange('light')}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">라이트</span>
          </label>
          <label className="flex items-center gap-3 cursor-not-allowed opacity-60">
            <input
              type="radio"
              name="theme"
              checked={settings.theme === 'dark'}
              onChange={() => handleThemeChange('dark')}
              disabled
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">다크</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">준비 중</span>
          </label>
        </div>
      </div>

      {/* Language Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          언어 설정
        </h3>
        <select
          value={settings.language}
          onChange={(e) => handleLanguageChange(e.target.value as Language)}
          className="w-full sm:w-48 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Account Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          계정
        </h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={onLogout}
            className="text-red-500 font-medium hover:text-red-600 transition-colors"
          >
            로그아웃
          </button>
          <span className="hidden sm:block text-gray-300">|</span>
          <button className="text-gray-400 text-sm hover:text-gray-500 transition-colors">
            회원탈퇴
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToggleItemProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function ToggleItem({ label, description, checked, onChange }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}
