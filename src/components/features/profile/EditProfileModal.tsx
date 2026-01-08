'use client';

import { useState, useRef, useEffect } from 'react';
import { useProfile } from '@/hooks';
import { showSuccess, showError } from '@/lib/toast';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentName: string;
  currentAvatar?: string;
  onSave: (name: string, avatarUrl?: string) => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  userId,
  currentName,
  currentAvatar,
  onSave,
}: EditProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isLoading, isUploading, error, updateProfile, uploadAvatar } = useProfile();

  // 모달이 열릴 때 현재 값으로 초기화
  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setPreviewUrl(currentAvatar || null);
      setSelectedFile(null);
    }
  }, [isOpen, currentName, currentAvatar]);

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError('JPG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다');
      return;
    }

    // 파일 크기 검증 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      showError('이미지 크기는 2MB 이하여야 합니다');
      return;
    }

    setSelectedFile(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      let newAvatarUrl: string | undefined;

      // 이미지가 선택되었으면 업로드
      if (selectedFile) {
        const uploadedUrl = await uploadAvatar(userId, selectedFile);
        if (!uploadedUrl) {
          showError(error || '이미지 업로드에 실패했습니다');
          return;
        }
        newAvatarUrl = uploadedUrl;
      }

      // 프로필 업데이트
      const updateData: { name?: string; avatar_url?: string } = {};

      if (name !== currentName) {
        updateData.name = name;
      }

      if (newAvatarUrl) {
        updateData.avatar_url = newAvatarUrl;
      }

      // 변경사항이 있으면 DB 업데이트
      if (Object.keys(updateData).length > 0) {
        const success = await updateProfile(userId, updateData);
        if (!success) {
          showError(error || '프로필 수정에 실패했습니다');
          return;
        }
      }

      showSuccess('프로필이 수정되었습니다');
      onSave(name, newAvatarUrl || currentAvatar);
      onClose();
    } catch {
      showError('프로필 수정 중 오류가 발생했습니다');
    }
  };

  const isSaving = isLoading || isUploading;
  const hasChanges = name !== currentName || selectedFile !== null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-[90%] max-w-md shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">프로필 수정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 프로필 이미지 */}
        <div className="flex flex-col items-center mb-6">
          <button
            onClick={handleImageClick}
            className="relative group"
            disabled={isSaving}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="프로필 이미지"
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-4xl text-white font-bold">
                  {name.charAt(0)}
                </span>
              </div>
            )}

            {/* 오버레이 */}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            {/* 업로드 중 스피너 */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            클릭하여 이미지 변경
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            JPG, PNG, WebP / 최대 2MB
          </p>
        </div>

        {/* 표시 이름 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            표시 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="닉네임을 입력하세요"
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSaving}
            maxLength={50}
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges || !name.trim()}
            className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
