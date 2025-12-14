'use client';

import { UserProfile } from '@/types';

interface ProfileCardProps {
  profile: UserProfile;
  onEdit: () => void;
}

export function ProfileCard({ profile, onEdit }: ProfileCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-4xl text-white font-bold">
            {profile.name.charAt(0)}
          </span>
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{profile.name}</h2>
          <p className="text-gray-500 mb-2">{profile.email}</p>
          <p className="text-sm text-gray-400">
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              가입일: {profile.joinDate}
            </span>
          </p>
        </div>

        {/* Edit Button */}
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          프로필 수정
        </button>
      </div>
    </div>
  );
}
