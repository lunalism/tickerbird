'use client';

/**
 * 캘린더 네비게이션 컴포넌트
 *
 * 월/주 이동 버튼과 오늘로 돌아가기 버튼을 제공합니다.
 * 데스크톱에서는 월/주 보기 전환 탭도 표시합니다.
 *
 * Props:
 * - currentDate: 현재 표시 중인 날짜
 * - onPrevious: 이전 기간으로 이동
 * - onNext: 다음 기간으로 이동
 * - onToday: 오늘로 이동
 * - viewMode: 'month' | 'week' - 표시 모드
 * - onViewModeChange: 보기 모드 변경 핸들러 (데스크톱 전용, 옵션)
 * - showViewModeToggle: 보기 모드 토글 버튼 표시 여부 (데스크톱 전용)
 */
interface CalendarNavigationProps {
  currentDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  viewMode: 'month' | 'week';
  onViewModeChange?: (mode: 'month' | 'week') => void;
  showViewModeToggle?: boolean;
}

export function CalendarNavigation({
  currentDate,
  onPrevious,
  onNext,
  onToday,
  viewMode,
  onViewModeChange,
  showViewModeToggle = false,
}: CalendarNavigationProps) {
  // 월 표시 포맷
  const formatMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    return `${year}년 ${month}월`;
  };

  // 주 표시 포맷 (주의 시작일 ~ 종료일)
  const formatWeek = () => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const startMonth = startOfWeek.getMonth() + 1;
    const startDay = startOfWeek.getDate();
    const endMonth = endOfWeek.getMonth() + 1;
    const endDay = endOfWeek.getDate();

    // 같은 달인 경우
    if (startMonth === endMonth) {
      return `${startOfWeek.getFullYear()}년 ${startMonth}월 ${startDay}일 - ${endDay}일`;
    }
    // 다른 달인 경우
    return `${startMonth}월 ${startDay}일 - ${endMonth}월 ${endDay}일`;
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {/* 왼쪽: 기간 표시 + 보기 모드 토글 */}
      <div className="flex items-center gap-4">
        {/* 현재 기간 표시 */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {viewMode === 'month' ? formatMonth() : formatWeek()}
        </h2>

        {/* 월/주 보기 전환 탭 (데스크톱 전용) */}
        {showViewModeToggle && onViewModeChange && (
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            {/* 월간 보기 버튼 */}
            <button
              onClick={() => onViewModeChange('month')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              월
            </button>
            {/* 주간 보기 버튼 */}
            <button
              onClick={() => onViewModeChange('week')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              주
            </button>
          </div>
        )}
      </div>

      {/* 오른쪽: 네비게이션 버튼 */}
      <div className="flex items-center gap-2">
        {/* 오늘 버튼 */}
        <button
          onClick={onToday}
          className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
        >
          오늘
        </button>

        {/* 이전/다음 버튼 */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg">
          <button
            onClick={onPrevious}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-l-lg transition-colors"
            aria-label={viewMode === 'month' ? '이전 달' : '이전 주'}
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={onNext}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-r-lg transition-colors"
            aria-label={viewMode === 'month' ? '다음 달' : '다음 주'}
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
