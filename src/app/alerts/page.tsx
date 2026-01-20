/**
 * 가격 알림 목록 페이지
 *
 * 사용자가 설정한 가격 알림 목록을 표시하고 관리하는 페이지
 *
 * 기능:
 * - 알림 목록 조회 (탭으로 분류)
 *   - 활성 알림: 발동 대기 중인 알림
 *   - 발동된 알림: 조건 충족되어 발동된 알림
 *   - 비활성 알림: 사용자가 비활성화한 알림
 * - 알림 활성화/비활성화 토글
 * - 알림 삭제
 * - 종목 상세 페이지로 이동
 *
 * 경로: /alerts
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar, BottomNav } from '@/components/layout';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAlerts } from '@/hooks';
import { PriceAlert } from '@/types/priceAlert';
import { showSuccess, showError } from '@/lib/toast';
import { EditAlertModal } from '@/components/features/alert/EditAlertModal';

/**
 * 탭 타입 정의
 */
type AlertTab = 'active' | 'triggered' | 'inactive';

/**
 * 탭 정보
 */
const TABS: { id: AlertTab; label: string; description: string }[] = [
  { id: 'active', label: '활성', description: '발동 대기 중' },
  { id: 'triggered', label: '발동됨', description: '목표가 도달' },
  { id: 'inactive', label: '비활성', description: '일시 중지' },
];

/**
 * 로딩 스피너 컴포넌트
 *
 * 삭제 버튼 로딩 상태에 사용되는 작은 원형 회전 애니메이션
 * Tailwind CSS animate-spin 클래스 사용
 */
function Spinner({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      {/* 배경 원 (투명도 낮음) */}
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      {/* 회전하는 호 (투명도 높음) */}
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * 알림 카드 컴포넌트
 *
 * 개별 알림 정보를 표시하고 수정/토글/삭제 버튼 제공
 */
function AlertCard({
  alert,
  onToggle,
  onDelete,
  onEdit,
  showToggle = true,
}: {
  alert: PriceAlert;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** 수정 버튼 클릭 핸들러 */
  onEdit: (alert: PriceAlert) => void;
  /** 토글 버튼 표시 여부 (발동된 알림은 숨김) */
  showToggle?: boolean;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // 시장에 따른 가격 포맷팅
  const formattedPrice =
    alert.market === 'KR'
      ? `${alert.targetPrice.toLocaleString('ko-KR')}원`
      : `$${alert.targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // 종목 상세 페이지 URL
  const detailUrl =
    alert.market === 'KR'
      ? `/market/${alert.ticker}?market=kr`
      : `/market/${alert.ticker}?market=us`;

  // 토글 핸들러 - 비동기 작업 완료까지 대기
  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(alert.id, !alert.isActive);
    } finally {
      setIsToggling(false);
    }
  };

  // 삭제 핸들러 - 비동기 작업 완료까지 대기
  const handleDelete = async () => {
    if (!confirm('정말 이 알림을 삭제하시겠습니까?')) return;
    setIsDeleting(true);
    try {
      await onDelete(alert.id);
    } finally {
      setIsDeleting(false);
    }
  };

  // 발동 시간 포맷팅
  const formatTriggeredAt = (triggeredAt?: string) => {
    if (!triggeredAt) return null;
    const date = new Date(triggeredAt);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-opacity ${
        !alert.isActive && !alert.isTriggered ? 'opacity-60' : ''
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* 종목 정보 */}
          <Link href={detailUrl} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-2 mb-1">
              {/* 시장 배지 */}
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${
                  alert.market === 'KR'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}
              >
                {alert.market === 'KR' ? '한국' : '미국'}
              </span>
              {/* 티커 */}
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {alert.ticker}
              </span>
              {/* 발동됨 배지 */}
              {alert.isTriggered && (
                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  발동됨
                </span>
              )}
            </div>
            {/* 종목명 */}
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {alert.stockName}
            </h3>
          </Link>

          {/* 토글 버튼 (발동된 알림에서는 숨김) */}
          {showToggle && (
            <button
              onClick={handleToggle}
              disabled={isToggling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                alert.isActive ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
              } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
              title={alert.isActive ? '알림 끄기' : '알림 켜기'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  alert.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          )}
        </div>

        {/* 알림 조건 */}
        <div className="mt-3 flex items-center gap-3">
          {/* 방향 아이콘 */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
              alert.direction === 'above'
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
            }`}
          >
            {alert.direction === 'above' ? (
              <svg
                className="w-4 h-4 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            )}
            <span
              className={`text-sm font-medium ${
                alert.direction === 'above'
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {alert.direction === 'above' ? '이상' : '이하'}
            </span>
          </div>

          {/* 목표가 */}
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formattedPrice}
          </span>
        </div>

        {/* 메타 정보 및 수정/삭제 버튼 */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {alert.isTriggered && alert.triggeredAt ? (
              // 발동된 알림: 발동 시간 표시
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTriggeredAt(alert.triggeredAt)} 발동
              </span>
            ) : (
              // 일반 알림: 생성 시간 표시
              <span>
                {new Date(alert.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                설정
              </span>
            )}
          </div>
          {/* 수정/삭제 버튼 */}
          <div className="flex items-center gap-3">
            {/* 수정 버튼 */}
            <button
              onClick={() => onEdit(alert)}
              className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              수정
            </button>
            {/* 삭제 버튼 */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`flex items-center gap-1 text-xs transition-colors ${
                isDeleting
                  ? 'text-red-400 dark:text-red-500 cursor-not-allowed'
                  : 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300'
              }`}
            >
              {isDeleting ? (
                <>
                  {/* 삭제 중: 로딩 스피너 표시 */}
                  <Spinner />
                  <span>삭제 중</span>
                </>
              ) : (
                '삭제'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 빈 상태 컴포넌트
 */
function EmptyState({
  tab,
  isLoggedIn,
}: {
  tab: AlertTab;
  isLoggedIn: boolean;
}) {
  // 비로그인 상태
  if (!isLoggedIn) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-700">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          로그인이 필요합니다
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          가격 알림 기능을 사용하려면 로그인해주세요
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          로그인하기
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    );
  }

  // 탭별 빈 상태 메시지
  const emptyMessages = {
    active: {
      icon: '🔔',
      title: '활성 알림이 없습니다',
      description: '종목 상세 페이지에서 새 알림을 추가해보세요',
      showAction: true,
    },
    triggered: {
      icon: '✅',
      title: '발동된 알림이 없습니다',
      description: '목표가에 도달하면 여기에 표시됩니다',
      showAction: false,
    },
    inactive: {
      icon: '⏸️',
      title: '비활성 알림이 없습니다',
      description: '알림을 비활성화하면 여기에 표시됩니다',
      showAction: false,
    },
  };

  const message = emptyMessages[tab];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-700">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">{message.icon}</span>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {message.title}
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        {message.description}
      </p>
      {message.showAction && (
        <Link
          href="/market"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          시세 보러 가기
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      )}
    </div>
  );
}

/**
 * 가격 알림 목록 페이지
 */
export default function AlertsPage() {
  const [activeMenu, setActiveMenu] = useState('alerts');
  const [activeTab, setActiveTab] = useState<AlertTab>('active');

  // 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);

  /**
   * 인증 상태 - useAuth() 훅 사용
   *
   * useAuthStore 대신 useAuth()를 사용하는 이유:
   * - useAuth()는 Firebase Auth 상태와 테스트 모드를 모두 고려하여 isLoggedIn 계산
   * - isLoggedIn = !!user || (isTestMode && isTestLoggedIn)
   * - isLoading은 Firebase Auth 초기화 상태를 나타냄 (초기화 중에는 로그인 여부 판단 불가)
   *
   * Sidebar도 동일하게 useAuth()를 사용하므로 일관성 유지
   */
  const { isLoggedIn, isLoading: isAuthLoading, isTestMode } = useAuth();

  // 디버그 로그: 인증 상태 확인
  useEffect(() => {
    console.log('[AlertsPage] 인증 상태:', {
      isLoggedIn,
      isAuthLoading,
      isTestMode,
    });
  }, [isLoggedIn, isAuthLoading, isTestMode]);

  // 알림 데이터 및 액션
  const { alerts, isLoading: isAlertsLoading, error, toggleAlert, deleteAlert, refetch } = useAlerts();

  /**
   * 전체 로딩 상태
   * - Auth 로딩 중이거나 알림 데이터 로딩 중일 때 true
   * - Auth 로딩이 완료되지 않으면 "로그인 필요" 메시지를 표시하지 않음
   */
  const isLoading = isAuthLoading || isAlertsLoading;

  /**
   * 알림 토글 핸들러
   */
  const handleToggle = async (id: string, isActive: boolean) => {
    const result = await toggleAlert(id, isActive);
    if (result.success) {
      showSuccess(isActive ? '알림이 활성화되었습니다' : '알림이 비활성화되었습니다');
    } else {
      showError(result.error || '알림 수정에 실패했습니다');
    }
  };

  /**
   * 알림 삭제 핸들러
   */
  const handleDelete = async (id: string) => {
    const result = await deleteAlert(id);
    if (result.success) {
      showSuccess('알림이 삭제되었습니다');
    } else {
      showError(result.error || '알림 삭제에 실패했습니다');
    }
  };

  /**
   * 알림 수정 모달 열기 핸들러
   */
  const handleEdit = (alert: PriceAlert) => {
    setEditingAlert(alert);
    setIsEditModalOpen(true);
  };

  /**
   * 알림 수정 성공 핸들러
   * 모달에서 저장 성공 시 호출되며, 목록은 useAlerts 훅에서 자동 업데이트됨
   */
  const handleEditSuccess = () => {
    console.log('[AlertsPage] 알림 수정 성공');
    // useAlerts 훅의 updateAlert에서 로컬 상태를 업데이트하므로
    // 별도의 refetch 없이 목록이 즉시 반영됨
  };

  // 알림 분류
  // useMemo로 불필요한 재계산 방지
  const { activeAlerts, triggeredAlerts, inactiveAlerts } = useMemo(() => {
    const active: PriceAlert[] = [];
    const triggered: PriceAlert[] = [];
    const inactive: PriceAlert[] = [];

    for (const alert of alerts) {
      if (alert.isTriggered) {
        // 발동된 알림 (isTriggered = true)
        triggered.push(alert);
      } else if (alert.isActive) {
        // 활성 알림 (isActive = true, isTriggered = false)
        active.push(alert);
      } else {
        // 비활성 알림 (isActive = false, isTriggered = false)
        inactive.push(alert);
      }
    }

    // 발동된 알림은 발동 시간 기준 내림차순 정렬
    triggered.sort((a, b) => {
      if (!a.triggeredAt || !b.triggeredAt) return 0;
      return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
    });

    return { activeAlerts: active, triggeredAlerts: triggered, inactiveAlerts: inactive };
  }, [alerts]);

  // 현재 탭의 알림 목록
  const currentAlerts = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return activeAlerts;
      case 'triggered':
        return triggeredAlerts;
      case 'inactive':
        return inactiveAlerts;
      default:
        return [];
    }
  }, [activeTab, activeAlerts, triggeredAlerts, inactiveAlerts]);

  // 탭별 알림 개수
  const tabCounts = useMemo(() => ({
    active: activeAlerts.length,
    triggered: triggeredAlerts.length,
    inactive: inactiveAlerts.length,
  }), [activeAlerts.length, triggeredAlerts.length, inactiveAlerts.length]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      {/* 사이드바 - 데스크톱 */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* 하단 네비게이션 - 모바일 */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* 메인 콘텐츠 */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300">
        <div className="max-w-3xl mx-auto px-4 py-6 pb-24 md:pb-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">가격 알림</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                설정한 가격에 도달하면 알림을 받습니다
              </p>
            </div>
            {/* 새로고침 버튼 - 로딩 완료 후 로그인 상태에서만 표시 */}
            {!isAuthLoading && isLoggedIn && (
              <button
                onClick={() => refetch()}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="새로고침"
              >
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* 로딩 상태 - Auth 로딩 중이면 로그인 여부와 관계없이 로딩 표시 */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {isAuthLoading ? '인증 상태 확인 중...' : '알림 목록 로딩 중...'}
              </p>
            </div>
          )}

          {/* 비로그인 상태 - Auth 로딩이 완료된 후에만 표시 */}
          {!isLoading && !isLoggedIn && <EmptyState tab={activeTab} isLoggedIn={false} />}

          {/* 에러 상태 - Auth 로딩 완료 후 로그인 상태에서만 표시 */}
          {!isLoading && isLoggedIn && error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => refetch()}
                className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* 알림 목록 - Auth 로딩 완료 후 로그인 상태에서만 표시 */}
          {!isLoading && isLoggedIn && !error && (
            <>
              {/* 탭 네비게이션 */}
              <div className="mb-6">
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {/* 알림 개수 배지 */}
                      {tabCounts[tab.id] > 0 && (
                        <span
                          className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                            activeTab === tab.id
                              ? tab.id === 'triggered'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : tab.id === 'active'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                              : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {tabCounts[tab.id]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 현재 탭의 알림 목록 */}
              {currentAlerts.length === 0 ? (
                <EmptyState tab={activeTab} isLoggedIn={true} />
              ) : (
                <div className="space-y-3">
                  {currentAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      // 발동된 알림은 토글 버튼 숨김
                      showToggle={!alert.isTriggered}
                    />
                  ))}
                </div>
              )}

              {/* 전체 알림이 없는 경우 안내 */}
              {alerts.length === 0 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    종목 상세 페이지에서 🔔 버튼을 눌러 알림을 추가할 수 있습니다
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 알림 수정 모달 */}
      <EditAlertModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAlert(null);
        }}
        alert={editingAlert}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
