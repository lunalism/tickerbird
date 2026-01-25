/**
 * useAdminUsers - 관리자용 사용자 목록 조회 훅
 *
 * Firestore users 컬렉션에서 사용자 목록을 조회합니다.
 * 검색, 필터, 페이지네이션 기능을 제공합니다.
 *
 * 주요 기능:
 * - 사용자 목록 조회 (페이지네이션)
 * - 이메일/닉네임 검색
 * - 요금제별 필터
 * - 정지 여부 필터
 * - 개별 사용자 정보 조회/수정
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  setDoc,
  doc,
  getCountFromServer,
  serverTimestamp,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  AdminUserProfile,
  AdminUserListItem,
  UserSearchParams,
  PaginationInfo,
  PlanType,
} from '@/types/admin';
import { debug } from '@/lib/debug';

// 페이지당 항목 수 기본값
const DEFAULT_PAGE_SIZE = 10;

/**
 * useAdminUsers 훅 반환 타입
 */
interface UseAdminUsersReturn {
  // 사용자 목록
  users: AdminUserListItem[];
  // 페이지네이션 정보
  pagination: PaginationInfo;
  // 로딩 중 여부
  isLoading: boolean;
  // 에러 메시지
  error: string | null;
  // 현재 검색/필터 조건
  searchParams: UserSearchParams;
  // 검색/필터 조건 변경
  setSearchParams: (params: UserSearchParams) => void;
  // 페이지 변경
  goToPage: (page: number) => void;
  // 사용자 목록 새로고침
  refreshUsers: () => Promise<void>;
}

/**
 * 개별 사용자 조회/수정 훅 반환 타입
 */
interface UseAdminUserDetailReturn {
  // 사용자 정보
  user: AdminUserProfile | null;
  // 로딩 중 여부
  isLoading: boolean;
  // 저장 중 여부
  isSaving: boolean;
  // 에러 메시지
  error: string | null;
  // 사용자 정보 수정
  updateUser: (updates: Partial<AdminUserProfile>) => Promise<void>;
  // 사용자 정보 새로고침
  refreshUser: () => Promise<void>;
}

/**
 * 관리자용 사용자 목록 조회 훅
 *
 * @example
 * const { users, pagination, isLoading, searchParams, setSearchParams, goToPage } = useAdminUsers();
 *
 * // 검색
 * setSearchParams({ ...searchParams, query: '검색어' });
 *
 * // 필터
 * setSearchParams({ ...searchParams, plan: 'pro' });
 *
 * // 페이지 이동
 * goToPage(2);
 */
export function useAdminUsers(): UseAdminUsersReturn {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: DEFAULT_PAGE_SIZE,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<UserSearchParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  });

  // 페이지별 마지막 문서 캐시 (페이지네이션용)
  const [lastDocs, setLastDocs] = useState<Map<number, QueryDocumentSnapshot<DocumentData>>>(new Map());

  /**
   * 사용자 목록 조회
   */
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const usersRef = collection(db, 'users');
      const pageSize = searchParams.limit || DEFAULT_PAGE_SIZE;
      const currentPage = searchParams.page || 1;

      // 기본 쿼리: 가입일 기준 내림차순 정렬
      let baseQuery = query(usersRef, orderBy('createdAt', 'desc'));

      // 요금제 필터 적용
      if (searchParams.plan && searchParams.plan !== 'all') {
        baseQuery = query(
          usersRef,
          where('plan', '==', searchParams.plan),
          orderBy('createdAt', 'desc')
        );
      }

      // 정지 여부 필터 적용
      if (searchParams.isBanned !== undefined && searchParams.isBanned !== 'all') {
        baseQuery = query(
          usersRef,
          where('isBanned', '==', searchParams.isBanned),
          orderBy('createdAt', 'desc')
        );
      }

      // 총 개수 조회
      const totalSnapshot = await getCountFromServer(baseQuery);
      const totalItems = totalSnapshot.data().count;
      const totalPages = Math.ceil(totalItems / pageSize);

      // 페이지네이션 쿼리 구성
      let pageQuery = query(baseQuery, limit(pageSize));

      // 2페이지 이상이면 이전 페이지의 마지막 문서 이후부터 조회
      if (currentPage > 1) {
        const prevLastDoc = lastDocs.get(currentPage - 1);
        if (prevLastDoc) {
          pageQuery = query(baseQuery, startAfter(prevLastDoc), limit(pageSize));
        } else {
          // 이전 페이지 문서가 없으면 처음부터 조회 (skip 방식)
          // Firestore는 offset을 지원하지 않으므로 처음부터 다시 조회
          const skipCount = (currentPage - 1) * pageSize;
          const skipQuery = query(baseQuery, limit(skipCount));
          const skipSnapshot = await getDocs(skipQuery);

          if (skipSnapshot.docs.length > 0) {
            const lastSkipDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
            pageQuery = query(baseQuery, startAfter(lastSkipDoc), limit(pageSize));
          }
        }
      }

      // 사용자 목록 조회
      const snapshot = await getDocs(pageQuery);

      // 결과 변환
      const fetchedUsers: AdminUserListItem[] = snapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          email: data.email || '',
          nickname: data.nickname || undefined,
          displayName: data.displayName || undefined,
          plan: (data.plan as PlanType) || 'free',
          isBanned: data.isBanned || false,
          createdAt: data.createdAt || Timestamp.now(),
        };
      });

      // 클라이언트 사이드 검색 필터 (이메일/닉네임)
      // Firestore는 부분 문자열 검색을 지원하지 않으므로 클라이언트에서 필터링
      let filteredUsers = fetchedUsers;
      if (searchParams.query) {
        const searchLower = searchParams.query.toLowerCase();
        filteredUsers = fetchedUsers.filter(
          (user) =>
            user.email.toLowerCase().includes(searchLower) ||
            user.nickname?.toLowerCase().includes(searchLower) ||
            user.displayName?.toLowerCase().includes(searchLower)
        );
      }

      // 마지막 문서 캐시 업데이트
      if (snapshot.docs.length > 0) {
        setLastDocs((prev) => {
          const newMap = new Map(prev);
          newMap.set(currentPage, snapshot.docs[snapshot.docs.length - 1]);
          return newMap;
        });
      }

      setUsers(filteredUsers);
      setPagination({
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage: pageSize,
      });

      debug.log('[useAdminUsers] 사용자 목록 조회:', {
        count: filteredUsers.length,
        totalItems,
        currentPage,
        totalPages,
      });
    } catch (err) {
      console.error('[useAdminUsers] 사용자 목록 조회 에러:', err);
      setError('사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, lastDocs]);

  // 검색 조건 변경 시 조회
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * 페이지 이동
   */
  const goToPage = useCallback((page: number) => {
    setSearchParams((prev) => ({ ...prev, page }));
  }, []);

  return {
    users,
    pagination,
    isLoading,
    error,
    searchParams,
    setSearchParams,
    goToPage,
    refreshUsers: fetchUsers,
  };
}

/**
 * 개별 사용자 조회/수정 훅
 *
 * @param userId - 사용자 ID (Firebase UID)
 *
 * @example
 * const { user, isLoading, isSaving, updateUser } = useAdminUserDetail('userId');
 *
 * // 요금제 변경
 * await updateUser({ plan: 'pro' });
 *
 * // 계정 정지
 * await updateUser({ isBanned: true });
 */
export function useAdminUserDetail(userId: string): UseAdminUserDetailReturn {
  const [user, setUser] = useState<AdminUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 사용자 정보 조회
   */
  const fetchUser = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError('사용자를 찾을 수 없습니다.');
        setUser(null);
        return;
      }

      const data = userDoc.data();
      setUser({
        id: userDoc.id,
        email: data.email || '',
        displayName: data.displayName || undefined,
        nickname: data.nickname || undefined,
        photoURL: data.photoURL || undefined,
        avatarId: data.avatarId || undefined,
        role: data.role || 'user',
        plan: (data.plan as PlanType) || 'free',
        planExpiresAt: data.planExpiresAt || undefined,
        isBanned: data.isBanned || false,
        onboardingCompleted: data.onboardingCompleted || false,
        createdAt: data.createdAt || Timestamp.now(),
        updatedAt: data.updatedAt || undefined,
      });

      debug.log('[useAdminUserDetail] 사용자 정보 조회:', userDoc.id);
    } catch (err) {
      console.error('[useAdminUserDetail] 사용자 정보 조회 에러:', err);
      setError('사용자 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 컴포넌트 마운트 시 조회
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  /**
   * 사용자 정보 수정
   */
  const updateUser = useCallback(
    async (updates: Partial<AdminUserProfile>) => {
      if (!userId || !user) {
        throw new Error('사용자 정보가 없습니다.');
      }

      try {
        setIsSaving(true);
        setError(null);

        const userDocRef = doc(db, 'users', userId);

        // 업데이트할 필드만 추출 (undefined 제외)
        const updateData: Record<string, unknown> = {
          updatedAt: serverTimestamp(),
        };

        if (updates.plan !== undefined) updateData.plan = updates.plan;
        if (updates.planExpiresAt !== undefined) updateData.planExpiresAt = updates.planExpiresAt;
        if (updates.isBanned !== undefined) updateData.isBanned = updates.isBanned;
        if (updates.role !== undefined) updateData.role = updates.role;

        await setDoc(userDocRef, updateData, { merge: true });

        // 로컬 상태 업데이트
        setUser((prev) =>
          prev
            ? {
                ...prev,
                ...updates,
                updatedAt: Timestamp.now(),
              }
            : null
        );

        debug.log('[useAdminUserDetail] 사용자 정보 수정:', userId, updates);
      } catch (err) {
        console.error('[useAdminUserDetail] 사용자 정보 수정 에러:', err);
        setError('사용자 정보 수정에 실패했습니다.');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [userId, user]
  );

  return {
    user,
    isLoading,
    isSaving,
    error,
    updateUser,
    refreshUser: fetchUser,
  };
}

export default useAdminUsers;
