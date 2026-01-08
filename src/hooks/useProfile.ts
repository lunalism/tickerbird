/**
 * 프로필 관리 훅
 *
 * Supabase profiles 테이블 및 Storage와 연동하여
 * 사용자 프로필 조회/수정/이미지 업로드 기능 제공
 */

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  name?: string;
  avatar_url?: string;
}

interface UseProfileReturn {
  // 상태
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;

  // 함수
  fetchProfile: (userId: string) => Promise<Profile | null>;
  updateProfile: (userId: string, data: UpdateProfileData) => Promise<boolean>;
  uploadAvatar: (userId: string, file: File) => Promise<string | null>;
}

// 허용 이미지 타입
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// 최대 파일 크기 (2MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export function useProfile(): UseProfileReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 프로필 조회
   */
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      return data as Profile;
    } catch (err) {
      const message = err instanceof Error ? err.message : '프로필을 불러오는데 실패했습니다';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 프로필 업데이트
   */
  const updateProfile = useCallback(async (
    userId: string,
    data: UpdateProfileData
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '프로필 수정에 실패했습니다';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 아바타 이미지 업로드
   * @returns 업로드된 이미지의 public URL 또는 실패 시 null
   */
  const uploadAvatar = useCallback(async (
    userId: string,
    file: File
  ): Promise<string | null> => {
    setIsUploading(true);
    setError(null);

    try {
      // 파일 타입 검증
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('JPG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다');
      }

      // 파일 크기 검증
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('이미지 크기는 2MB 이하여야 합니다');
      }

      const supabase = createClient();

      // 파일 확장자 추출
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${userId}/profile.${ext}`;

      // Storage에 업로드 (upsert로 기존 파일 덮어쓰기)
      const { error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Public URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('avatar')
        .getPublicUrl(filePath);

      // 캐시 방지를 위해 타임스탬프 추가
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      return urlWithTimestamp;
    } catch (err) {
      const message = err instanceof Error ? err.message : '이미지 업로드에 실패했습니다';
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    isLoading,
    isUploading,
    error,
    fetchProfile,
    updateProfile,
    uploadAvatar,
  };
}
