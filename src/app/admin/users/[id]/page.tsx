'use client';

/**
 * 관리자 사용자 상세 페이지
 *
 * 개별 사용자의 상세 정보를 조회하고 수정할 수 있는 페이지입니다.
 *
 * 기능:
 * - 사용자 정보 표시 (이메일, 닉네임, 가입일 등)
 * - 요금제 변경
 * - 계정 정지/해제
 * - 저장
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminUserDetail } from '@/hooks/useAdminUsers';
import { PLAN_INFO, type PlanType } from '@/types/admin';
import { toast } from 'sonner';

/**
 * 정보 행 컴포넌트
 */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-32 mb-1 sm:mb-0">
        {label}
      </dt>
      <dd className="text-sm text-gray-900 dark:text-white flex-1">
        {value}
      </dd>
    </div>
  );
}

/**
 * 사용자 상세 페이지 메인 컴포넌트
 */
export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const { user, isLoading, isSaving, error, updateUser, refreshUser } = useAdminUserDetail(userId);

  // 수정 가능한 필드 상태
  const [editedPlan, setEditedPlan] = useState<PlanType>('free');
  const [editedIsBanned, setEditedIsBanned] = useState(false);

  // 수정 여부 확인
  const [hasChanges, setHasChanges] = useState(false);

  // 사용자 정보 로드 시 상태 초기화
  useEffect(() => {
    if (user) {
      setEditedPlan(user.plan);
      setEditedIsBanned(user.isBanned);
      setHasChanges(false);
    }
  }, [user]);

  // 변경 감지
  useEffect(() => {
    if (user) {
      const changed = editedPlan !== user.plan || editedIsBanned !== user.isBanned;
      setHasChanges(changed);
    }
  }, [editedPlan, editedIsBanned, user]);

  // 저장 핸들러
  const handleSave = async () => {
    try {
      await updateUser({
        plan: editedPlan,
        isBanned: editedIsBanned,
      });
      toast.success('사용자 정보가 저장되었습니다.');
      setHasChanges(false);
    } catch (err) {
      toast.error('저장에 실패했습니다.');
    }
  };

  // 취소 핸들러 (변경 사항 되돌리기)
  const handleCancel = () => {
    if (user) {
      setEditedPlan(user.plan);
      setEditedIsBanned(user.isBanned);
      setHasChanges(false);
    }
  };

  // 에러 상태
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => refreshUser()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (isLoading || !user) {
    return (
      <div>
        {/* 뒤로가기 스켈레톤 */}
        <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />

        {/* 페이지 헤더 스켈레톤 */}
        <div className="mb-8">
          <div className="w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="w-64 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* 카드 스켈레톤 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 뒤로가기 */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        사용자 목록
      </Link>

      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {user.nickname || user.displayName || '(이름 없음)'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {user.email}
        </p>
      </div>

      {/* 콘텐츠 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 사용자 정보 카드 */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            사용자 정보
          </h2>
          <dl>
            <InfoRow label="이메일" value={user.email} />
            <InfoRow label="닉네임" value={user.nickname || '(미설정)'} />
            <InfoRow label="Google 이름" value={user.displayName || '(없음)'} />
            <InfoRow
              label="가입일"
              value={
                user.createdAt?.toDate?.()
                  ? new Date(user.createdAt.toDate()).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'
              }
            />
            <InfoRow
              label="온보딩"
              value={
                user.onboardingCompleted ? (
                  <span className="text-green-600 dark:text-green-400">완료</span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">미완료</span>
                )
              }
            />
            <InfoRow label="사용자 ID" value={<code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{user.id}</code>} />
          </dl>
        </div>

        {/* 관리 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            관리
          </h2>

          <div className="space-y-6">
            {/* 요금제 변경 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                요금제
              </label>
              <select
                value={editedPlan}
                onChange={(e) => setEditedPlan(e.target.value as PlanType)}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="free">{PLAN_INFO.free.label}</option>
                <option value="premium">{PLAN_INFO.premium.label}</option>
              </select>
            </div>

            {/* 계정 상태 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                계정 상태
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditedIsBanned(false)}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    !editedIsBanned
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-2 ring-green-500'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  정상
                </button>
                <button
                  onClick={() => setEditedIsBanned(true)}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    editedIsBanned
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-2 ring-red-500'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  정지
                </button>
              </div>
            </div>

            {/* 저장/취소 버튼 */}
            {hasChanges && (
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      저장 중...
                    </>
                  ) : (
                    '저장'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
