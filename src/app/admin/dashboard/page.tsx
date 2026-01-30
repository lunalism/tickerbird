'use client';

/**
 * 관리자 대시보드 페이지
 *
 * 사이트 운영 통계를 한눈에 볼 수 있는 대시보드입니다.
 *
 * 표시 항목:
 * - 총 사용자 수
 * - 오늘 가입자 수
 * - 요금제별 사용자 수 (무료/프리미엄)
 * - 최근 가입한 사용자 5명
 */

import Link from 'next/link';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { PLAN_INFO, type PlanType } from '@/types/admin';

/**
 * 통계 카드 컴포넌트
 */
function StatCard({
  title,
  value,
  icon,
  color = 'blue',
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/**
 * 요금제별 사용자 수 카드
 */
function PlanStatsCard({ usersByPlan }: { usersByPlan: Record<PlanType, number> }) {
  const plans: { type: PlanType; color: string }[] = [
    { type: 'free', color: 'bg-gray-100 dark:bg-gray-700' },
    { type: 'premium', color: 'bg-yellow-100 dark:bg-yellow-900/30' },
  ];

  const total = Object.values(usersByPlan).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        요금제별 사용자
      </h3>
      <div className="space-y-4">
        {plans.map(({ type, color }) => {
          const count = usersByPlan[type];
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={type}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {PLAN_INFO[type].label}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {count.toLocaleString()}명 ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${color}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 최근 가입 사용자 테이블
 */
function RecentUsersTable({
  users,
}: {
  users: Array<{
    id: string;
    email: string;
    nickname?: string;
    displayName?: string;
    plan: PlanType;
    createdAt: { toDate: () => Date };
  }>;
}) {
  // 요금제 배지 색상
  const planBadgeColors: Record<PlanType, string> = {
    free: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    premium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          최근 가입 사용자
        </h3>
        <Link
          href="/admin/users"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          전체 보기
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                사용자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                요금제
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                가입일
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  가입한 사용자가 없습니다.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link href={`/admin/users/${user.id}`} className="hover:underline">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.nickname || user.displayName || '(이름 없음)'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${planBadgeColors[user.plan]}`}>
                      {PLAN_INFO[user.plan].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {user.createdAt?.toDate?.()
                      ? new Date(user.createdAt.toDate()).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 대시보드 페이지 메인 컴포넌트
 */
export default function AdminDashboardPage() {
  const { stats, isLoading, error, refreshStats } = useAdminDashboard();

  // 에러 상태
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={() => refreshStats()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 로딩 상태
  if (isLoading || !stats) {
    return (
      <div>
        {/* 페이지 헤더 스켈레톤 */}
        <div className="mb-8">
          <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* 통계 카드 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* 하단 섹션 스켈레톤 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                    <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          대시보드
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          AlphaBoard 운영 현황을 한눈에 확인하세요.
        </p>
      </div>

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 총 사용자 수 */}
        <StatCard
          title="총 사용자"
          value={stats.totalUsers}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />

        {/* 오늘 가입자 수 */}
        <StatCard
          title="오늘 가입"
          value={stats.todaySignups}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
        />

        {/* 프리미엄 사용자 수 */}
        <StatCard
          title="프리미엄"
          value={stats.usersByPlan.premium}
          color="yellow"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          }
        />
      </div>

      {/* 하단 섹션: 요금제별 통계 + 최근 가입 사용자 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 요금제별 사용자 수 */}
        <PlanStatsCard usersByPlan={stats.usersByPlan} />

        {/* 최근 가입 사용자 */}
        <RecentUsersTable users={stats.recentUsers} />
      </div>
    </div>
  );
}
