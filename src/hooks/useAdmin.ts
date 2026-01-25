/**
 * useAdmin - 관리자 권한 확인 및 관리자 설정 관리 훅
 *
 * Firestore adminSettings 컬렉션에서 관리자 이메일 목록을 가져와
 * 현재 로그인한 사용자가 관리자인지 확인합니다.
 *
 * 주요 기능:
 * - 관리자 이메일 목록 조회 (adminSettings/config)
 * - 현재 사용자의 관리자 여부 확인
 * - 관리자 이메일 추가/삭제
 * - 실시간 관리자 상태 감지
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import type { AdminSettings } from '@/types/admin';
import { debug } from '@/lib/debug';

/**
 * useAdmin 훅 반환 타입
 */
interface UseAdminReturn {
  // 현재 사용자가 관리자인지 여부
  isAdmin: boolean;
  // 관리자 설정 로딩 중 여부
  isLoading: boolean;
  // 에러 메시지
  error: string | null;
  // 관리자 이메일 목록
  adminEmails: string[];
  // 관리자 이메일 추가
  addAdminEmail: (email: string) => Promise<void>;
  // 관리자 이메일 삭제 (최소 1명 유지)
  removeAdminEmail: (email: string) => Promise<void>;
  // 관리자 설정 새로고침
  refreshAdminSettings: () => Promise<void>;
}

/**
 * 관리자 권한 확인 및 설정 관리 훅
 *
 * @example
 * const { isAdmin, isLoading, adminEmails, addAdminEmail, removeAdminEmail } = useAdmin();
 *
 * // 관리자 여부 확인
 * if (!isAdmin) {
 *   redirect('/');
 * }
 *
 * // 관리자 이메일 추가
 * await addAdminEmail('newadmin@example.com');
 *
 * // 관리자 이메일 삭제
 * await removeAdminEmail('oldadmin@example.com');
 */
export function useAdmin(): UseAdminReturn {
  // AuthProvider에서 현재 사용자 정보 가져오기
  const { userProfile, isLoggedIn, isLoading: authLoading } = useAuth();

  // 관리자 설정 상태
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 현재 사용자가 관리자인지 확인
  const isAdmin = isLoggedIn && userProfile?.email
    ? adminEmails.includes(userProfile.email)
    : false;

  /**
   * Firestore에서 관리자 설정 조회
   */
  const fetchAdminSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const adminSettingsRef = doc(db, 'adminSettings', 'config');
      const adminSettingsDoc = await getDoc(adminSettingsRef);

      if (adminSettingsDoc.exists()) {
        const data = adminSettingsDoc.data() as AdminSettings;
        setAdminEmails(data.adminEmails || []);
        debug.log('[useAdmin] 관리자 이메일 목록 로드:', data.adminEmails);
      } else {
        // 문서가 없으면 초기 설정 생성 (chrisholic11@gmail.com을 기본 관리자로)
        debug.log('[useAdmin] 관리자 설정 문서 없음 - 초기 설정 생성');
        const initialSettings: Omit<AdminSettings, 'id'> = {
          adminEmails: ['chrisholic11@gmail.com'],
          updatedAt: serverTimestamp() as AdminSettings['updatedAt'],
        };
        await setDoc(adminSettingsRef, initialSettings);
        setAdminEmails(initialSettings.adminEmails);
      }
    } catch (err) {
      console.error('[useAdmin] 관리자 설정 조회 에러:', err);
      setError('관리자 설정을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 관리자 설정 실시간 구독
   */
  useEffect(() => {
    // Auth 로딩이 완료될 때까지 대기
    if (authLoading) return;

    const adminSettingsRef = doc(db, 'adminSettings', 'config');

    // 실시간 구독 시작
    const unsubscribe = onSnapshot(
      adminSettingsRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as AdminSettings;
          setAdminEmails(data.adminEmails || []);
          debug.log('[useAdmin] 관리자 설정 업데이트:', data.adminEmails);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('[useAdmin] 관리자 설정 구독 에러:', err);
        setError('관리자 설정 구독에 실패했습니다.');
        setIsLoading(false);

        // 구독 실패 시 한 번 조회 시도
        fetchAdminSettings();
      }
    );

    // 클린업: 구독 해제
    return () => {
      debug.log('[useAdmin] 관리자 설정 구독 해제');
      unsubscribe();
    };
  }, [authLoading, fetchAdminSettings]);

  /**
   * 관리자 이메일 추가
   *
   * @param email - 추가할 관리자 이메일
   */
  const addAdminEmail = useCallback(async (email: string) => {
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('올바른 이메일 형식이 아닙니다.');
    }

    // 이미 존재하는지 확인
    if (adminEmails.includes(email)) {
      throw new Error('이미 관리자로 등록된 이메일입니다.');
    }

    try {
      const adminSettingsRef = doc(db, 'adminSettings', 'config');
      const newAdminEmails = [...adminEmails, email];

      await setDoc(adminSettingsRef, {
        adminEmails: newAdminEmails,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      debug.log('[useAdmin] 관리자 이메일 추가:', email);
    } catch (err) {
      console.error('[useAdmin] 관리자 이메일 추가 에러:', err);
      throw new Error('관리자 이메일 추가에 실패했습니다.');
    }
  }, [adminEmails]);

  /**
   * 관리자 이메일 삭제
   *
   * 최소 1명의 관리자는 유지해야 합니다.
   *
   * @param email - 삭제할 관리자 이메일
   */
  const removeAdminEmail = useCallback(async (email: string) => {
    // 최소 1명 유지 확인
    if (adminEmails.length <= 1) {
      throw new Error('최소 1명의 관리자는 유지해야 합니다.');
    }

    // 존재하는지 확인
    if (!adminEmails.includes(email)) {
      throw new Error('해당 이메일이 관리자 목록에 없습니다.');
    }

    try {
      const adminSettingsRef = doc(db, 'adminSettings', 'config');
      const newAdminEmails = adminEmails.filter(e => e !== email);

      await setDoc(adminSettingsRef, {
        adminEmails: newAdminEmails,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      debug.log('[useAdmin] 관리자 이메일 삭제:', email);
    } catch (err) {
      console.error('[useAdmin] 관리자 이메일 삭제 에러:', err);
      throw new Error('관리자 이메일 삭제에 실패했습니다.');
    }
  }, [adminEmails]);

  /**
   * 관리자 설정 새로고침
   */
  const refreshAdminSettings = useCallback(async () => {
    await fetchAdminSettings();
  }, [fetchAdminSettings]);

  return {
    isAdmin,
    isLoading: isLoading || authLoading,
    error,
    adminEmails,
    addAdminEmail,
    removeAdminEmail,
    refreshAdminSettings,
  };
}

export default useAdmin;
