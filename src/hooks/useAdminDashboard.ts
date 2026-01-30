/**
 * useAdminDashboard - 관리자 대시보드 통계 조회 훅
 *
 * Firestore users 컬렉션에서 대시보드에 필요한 통계를 조회합니다.
 *
 * 조회 항목:
 * - 총 사용자 수
 * - 오늘 가입자 수
 * - 요금제별 사용자 수
 * - 최근 가입한 사용자 5명
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DashboardStats, AdminUserListItem, PlanType } from '@/types/admin';
import { debug } from '@/lib/debug';

/**
 * useAdminDashboard 훅 반환 타입
 */
interface UseAdminDashboardReturn {
  // 대시보드 통계 데이터
  stats: DashboardStats | null;
  // 로딩 중 여부
  isLoading: boolean;
  // 에러 메시지
  error: string | null;
  // 통계 새로고침
  refreshStats: () => Promise<void>;
}

/**
 * 오늘 자정 시간 계산 (UTC 기준)
 */
function getTodayMidnight(): Date {
  const now = new Date();
  // 한국 시간 기준 오늘 자정 (UTC+9)
  const kstOffset = 9 * 60; // 9시간을 분으로
  const utcMidnight = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  );
  // UTC 자정에서 9시간을 빼면 KST 자정의 UTC 시간
  utcMidnight.setMinutes(utcMidnight.getMinutes() - kstOffset);
  return utcMidnight;
}

/**
 * 관리자 대시보드 통계 조회 훅
 *
 * @example
 * const { stats, isLoading, error, refreshStats } = useAdminDashboard();
 *
 * // 통계 표시
 * <p>총 사용자: {stats?.totalUsers}</p>
 * <p>오늘 가입: {stats?.todaySignups}</p>
 */
export function useAdminDashboard(): UseAdminDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 대시보드 통계 조회
   */
  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const usersRef = collection(db, 'users');

      // 1. 총 사용자 수 조회
      const totalSnapshot = await getCountFromServer(usersRef);
      const totalUsers = totalSnapshot.data().count;

      // 2. 오늘 가입자 수 조회 (createdAt >= 오늘 자정)
      const todayMidnight = getTodayMidnight();
      const todayTimestamp = Timestamp.fromDate(todayMidnight);

      const todayQuery = query(
        usersRef,
        where('createdAt', '>=', todayTimestamp)
      );
      const todaySnapshot = await getCountFromServer(todayQuery);
      const todaySignups = todaySnapshot.data().count;

      // 3. 요금제별 사용자 수 조회
      // Firestore에서 count 쿼리로 각 요금제별 사용자 수 조회
      const plans: PlanType[] = ['free', 'premium'];
      const usersByPlan: Record<PlanType, number> = {
        free: 0,
        premium: 0,
      };

      // 병렬로 요금제별 사용자 수 조회
      await Promise.all(
        plans.map(async (plan) => {
          try {
            const planQuery = query(usersRef, where('plan', '==', plan));
            const planSnapshot = await getCountFromServer(planQuery);
            usersByPlan[plan] = planSnapshot.data().count;
          } catch (err) {
            // plan 필드가 없는 사용자도 있을 수 있음 (기존 사용자)
            debug.log(`[useAdminDashboard] ${plan} 요금제 조회 에러:`, err);
          }
        })
      );

      // plan 필드가 없는 사용자는 무료 사용자로 계산
      // (total - 모든 plan 합계 = plan 필드 없는 사용자)
      const planSum = Object.values(usersByPlan).reduce((a, b) => a + b, 0);
      const usersWithoutPlan = totalUsers - planSum;
      usersByPlan.free += usersWithoutPlan;

      // 4. 최근 가입한 사용자 5명 조회
      const recentQuery = query(
        usersRef,
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentSnapshot = await getDocs(recentQuery);
      const recentUsers: AdminUserListItem[] = recentSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email || '',
          nickname: data.nickname || undefined,
          displayName: data.displayName || undefined,
          plan: (data.plan as PlanType) || 'free',
          isBanned: data.isBanned || false,
          createdAt: data.createdAt || Timestamp.now(),
        };
      });

      // 통계 데이터 설정
      setStats({
        totalUsers,
        todaySignups,
        usersByPlan,
        recentUsers,
      });

      debug.log('[useAdminDashboard] 통계 조회 완료:', {
        totalUsers,
        todaySignups,
        usersByPlan,
        recentUsersCount: recentUsers.length,
      });
    } catch (err) {
      console.error('[useAdminDashboard] 통계 조회 에러:', err);
      setError('통계를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 컴포넌트 마운트 시 통계 조회
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refreshStats: fetchStats,
  };
}

export default useAdminDashboard;
