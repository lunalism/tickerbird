'use client';

/**
 * AvatarSelectModal - 아바타 선택 모달 컴포넌트
 *
 * 사용자가 프로필 아바타를 선택할 수 있는 모달입니다.
 * 10개의 동물 아바타 중 하나를 선택할 수 있습니다.
 *
 * 기능:
 * - 그리드 형태로 아바타 목록 표시 (5열 x 2행)
 * - 각 아바타 아래에 이름 표시 (황소, 곰 등)
 * - 현재 선택된 아바타 테두리 강조
 * - 저장 시 Firestore에 avatarId 저장
 * - 배경 클릭 또는 취소 버튼으로 닫기 가능
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AVATARS, Avatar } from '@/constants/avatars';
import { showSuccess, showError } from '@/lib/toast';

/**
 * AvatarSelectModal 컴포넌트 Props
 */
interface AvatarSelectModalProps {
  /** 모달 열림/닫힘 상태 */
  isOpen: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 사용자 ID (Firebase Auth uid) */
  userId: string;
  /** 현재 선택된 아바타 ID */
  currentAvatarId?: string | null;
  /** 저장 완료 콜백 (선택적) - 새 avatarId 전달 */
  onSave?: (avatarId: string) => void;
}

export function AvatarSelectModal({
  isOpen,
  onClose,
  userId,
  currentAvatarId,
  onSave,
}: AvatarSelectModalProps) {
  // ========================================
  // 상태 관리
  // ========================================

  /** 선택된 아바타 ID (모달 내 임시 상태) */
  const [selectedId, setSelectedId] = useState<string | null>(currentAvatarId || null);

  /** 저장 중 로딩 상태 */
  const [isSaving, setIsSaving] = useState(false);

  // ========================================
  // 모달 열림 시 초기화
  // ========================================

  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 현재 아바타 ID로 초기화
      setSelectedId(currentAvatarId || null);
    }
  }, [isOpen, currentAvatarId]);

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  // ========================================
  // 이벤트 핸들러
  // ========================================

  /**
   * 아바타 클릭 핸들러
   * - 선택 상태 토글
   */
  const handleAvatarClick = (avatar: Avatar) => {
    setSelectedId(avatar.id);
  };

  /**
   * 저장 버튼 클릭 핸들러
   * - Firestore에 avatarId 저장
   * - 성공 시 콜백 호출 및 모달 닫기
   */
  const handleSave = async () => {
    if (!selectedId) {
      showError('아바타를 선택해주세요');
      return;
    }

    setIsSaving(true);

    try {
      // Firestore users/{uid} 문서 업데이트
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, {
        avatarId: selectedId,
        updatedAt: serverTimestamp(),
      }, { merge: true }); // merge: 기존 필드 유지하고 업데이트

      showSuccess('아바타가 변경되었습니다');

      // 콜백 호출 (있으면)
      onSave?.(selectedId);

      // 모달 닫기
      onClose();
    } catch (err) {
      console.error('[AvatarSelectModal] 아바타 저장 에러:', err);
      showError('아바타 변경에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  // 변경사항 있는지 확인 (저장 버튼 활성화 조건)
  const hasChanges = selectedId !== currentAvatarId;

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
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-[90%] max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            아바타 선택
          </h2>
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

        {/* 안내 문구 */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Tickerbird에서 사용할 아바타를 선택하세요
        </p>

        {/* 아바타 그리드 (5열 x 2행) */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {AVATARS.map((avatar) => {
            const isSelected = selectedId === avatar.id;
            return (
              <button
                key={avatar.id}
                onClick={() => handleAvatarClick(avatar)}
                className={`
                  flex flex-col items-center p-2 rounded-xl transition-all
                  ${isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }
                `}
                disabled={isSaving}
              >
                {/* 아바타 이미지 */}
                <div className={`
                  relative w-12 h-12 rounded-full overflow-hidden mb-1
                  ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : ''}
                `}>
                  <Image
                    src={avatar.path}
                    alt={avatar.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                  {/* 선택됨 체크마크 */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                {/* 아바타 이름 */}
                <span className={`
                  text-xs font-medium truncate w-full text-center
                  ${isSelected
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                  }
                `}>
                  {avatar.name}
                </span>
              </button>
            );
          })}
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
            disabled={isSaving || !selectedId}
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
