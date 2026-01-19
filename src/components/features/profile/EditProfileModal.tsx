'use client';

/**
 * 프로필 수정 모달 컴포넌트
 *
 * 사용자가 닉네임을 수정할 수 있는 모달입니다.
 * 프로필 페이지에서 "프로필 수정" 버튼 클릭 시 표시됩니다.
 *
 * 기능:
 * - 닉네임 수정 (2-20자, 한글/영문/숫자만 허용)
 * - 실시간 유효성 검사
 * - Firestore users 컬렉션 업데이트
 * - 저장 완료 후 페이지 새로고침으로 상태 동기화
 *
 * Firebase Firestore 사용
 */

import { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { showSuccess, showError } from '@/lib/toast';

/**
 * EditProfileModal 컴포넌트 Props
 */
interface EditProfileModalProps {
  /** 모달 열림/닫힘 상태 */
  isOpen: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 사용자 ID (Firebase Auth uid) */
  userId: string;
  /** 현재 닉네임 */
  currentName: string;
  /** 현재 프로필 이미지 URL (Google OAuth에서 가져옴) */
  currentAvatar?: string;
  /** 저장 완료 콜백 (선택적) */
  onSave?: (name: string) => void;
}

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
  // 길이 검사
  if (value.length < 2) return '닉네임은 2자 이상이어야 합니다';
  if (value.length > 20) return '닉네임은 20자 이하여야 합니다';

  // 허용 문자 검사 (한글, 영문, 숫자만)
  const regex = /^[가-힣a-zA-Z0-9]+$/;
  if (!regex.test(value)) return '한글, 영문, 숫자만 사용할 수 있습니다';

  return null;
};

export function EditProfileModal({
  isOpen,
  onClose,
  userId,
  currentName,
  currentAvatar,
  onSave,
}: EditProfileModalProps) {
  // ========================================
  // 상태 관리
  // ========================================

  /** 닉네임 입력값 */
  const [name, setName] = useState(currentName);

  /** 저장 중 로딩 상태 */
  const [isSaving, setIsSaving] = useState(false);

  /** 유효성 검사 에러 메시지 */
  const [error, setError] = useState<string | null>(null);

  // ========================================
  // 모달 열림 시 초기화
  // ========================================

  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 현재 닉네임으로 초기화
      setName(currentName);
      setError(null);
    }
  }, [isOpen, currentName]);

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  // ========================================
  // 이벤트 핸들러
  // ========================================

  /**
   * 닉네임 입력 변경 핸들러
   * - 입력값 업데이트
   * - 에러가 있었으면 실시간 재검사
   */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);

    // 에러가 있었으면 다시 검사
    if (error) {
      setError(validateNickname(value));
    }
  };

  /**
   * 저장 버튼 클릭 핸들러
   * - 유효성 검사
   * - Firestore users 컬렉션 업데이트
   * - 성공 시 페이지 새로고침 (상태 동기화)
   */
  const handleSave = async () => {
    // 유효성 검사
    const validationError = validateNickname(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Firestore users/{uid} 문서 업데이트
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, {
        name: name.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true }); // merge: 기존 필드 유지하고 업데이트

      showSuccess('프로필이 수정되었습니다');

      // 콜백 호출 (있으면)
      onSave?.(name.trim());

      // 페이지 새로고침으로 AuthProvider 상태 갱신
      // (onClose 호출 없이 바로 새로고침)
      window.location.reload();
    } catch (err) {
      console.error('[EditProfileModal] 프로필 수정 에러:', err);
      showError('프로필 수정에 실패했습니다');
      setIsSaving(false);
    }
  };

  // 변경사항 있는지 확인 (저장 버튼 활성화 조건)
  const hasChanges = name.trim() !== currentName;

  // ========================================
  // 렌더링
  // ========================================

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 오버레이 (클릭 시 모달 닫기) */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 본체 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-[90%] max-w-md shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">프로필 수정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 프로필 이미지 (읽기 전용) */}
        <div className="flex flex-col items-center mb-6">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="프로필 이미지"
              className="w-20 h-20 rounded-full object-cover border-4 border-blue-100 dark:border-blue-900"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center border-4 border-blue-100 dark:border-blue-900">
              <span className="text-3xl text-white font-bold">
                {name.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            프로필 이미지는 Google 계정에서 가져옵니다
          </p>
        </div>

        {/* 닉네임 입력 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            닉네임
          </label>
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="닉네임을 입력하세요"
            className={`w-full px-4 py-3 border rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
            <p className="text-sm text-red-500 mt-2">{error}</p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              2-20자, 한글/영문/숫자만 사용 가능
            </p>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className="flex gap-3">
          {/* 취소 버튼 */}
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            취소
          </button>

          {/* 저장 버튼 */}
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
