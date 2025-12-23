/**
 * Skeleton 컴포넌트
 *
 * Shimmer 효과가 있는 기본 로딩 스켈레톤 UI입니다.
 * 콘텐츠가 로딩 중일 때 플레이스홀더로 사용됩니다.
 *
 * @example
 * // 기본 사용
 * <Skeleton width={200} height={20} />
 *
 * // 원형 아바타
 * <Skeleton width={40} height={40} rounded="full" />
 *
 * // 커스텀 클래스
 * <Skeleton className="w-full h-48" rounded="2xl" />
 */

interface SkeletonProps {
  /** 너비 (px 또는 tailwind 클래스로 지정) */
  width?: number | string;
  /** 높이 (px 또는 tailwind 클래스로 지정) */
  height?: number | string;
  /** 모서리 둥글기: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 모서리 둥글기 매핑
 * Tailwind의 rounded 클래스와 매핑됩니다.
 */
const roundedMap = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
};

export function Skeleton({
  width,
  height,
  rounded = 'md',
  className = '',
}: SkeletonProps) {
  // 인라인 스타일로 너비/높이 지정
  const style: React.CSSProperties = {};

  // width 처리: 숫자면 px, 문자열이면 그대로 사용 (%, rem 등)
  if (typeof width === 'number') {
    style.width = `${width}px`;
  } else if (typeof width === 'string') {
    style.width = width;
  }

  // height 처리: 숫자면 px, 문자열이면 그대로 사용
  if (typeof height === 'number') {
    style.height = `${height}px`;
  } else if (typeof height === 'string') {
    style.height = height;
  }

  return (
    <div
      className={`
        skeleton-shimmer
        bg-gray-200 dark:bg-gray-700
        ${roundedMap[rounded]}
        ${className}
      `}
      style={style}
      // 스크린 리더를 위한 접근성 속성
      role="status"
      aria-label="로딩 중..."
    />
  );
}

/**
 * SkeletonText 컴포넌트
 *
 * 텍스트 줄을 시뮬레이션하는 스켈레톤입니다.
 * 여러 줄의 텍스트를 표현할 때 사용합니다.
 *
 * @example
 * <SkeletonText lines={3} />
 */
interface SkeletonTextProps {
  /** 텍스트 줄 수 */
  lines?: number;
  /** 마지막 줄 너비 (%) - 자연스러운 텍스트 효과 */
  lastLineWidth?: number;
  /** 줄 간격 */
  gap?: 'sm' | 'md' | 'lg';
  /** 추가 CSS 클래스 */
  className?: string;
}

const gapMap = {
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-3',
};

export function SkeletonText({
  lines = 1,
  lastLineWidth = 75,
  gap = 'md',
  className = '',
}: SkeletonTextProps) {
  return (
    <div className={`flex flex-col ${gapMap[gap]} ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={14}
          rounded="md"
          // 마지막 줄은 짧게 표시 (% 단위로 너비 지정)
          width={index === lines - 1 ? `${lastLineWidth}%` : '100%'}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCircle 컴포넌트
 *
 * 원형 스켈레톤입니다. 아바타나 아이콘 플레이스홀더로 사용합니다.
 *
 * @example
 * <SkeletonCircle size={40} />
 */
interface SkeletonCircleProps {
  /** 원의 크기 (px) */
  size?: number;
  /** 추가 CSS 클래스 */
  className?: string;
}

export function SkeletonCircle({ size = 40, className = '' }: SkeletonCircleProps) {
  return (
    <Skeleton
      width={size}
      height={size}
      rounded="full"
      className={className}
    />
  );
}
