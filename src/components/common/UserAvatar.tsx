'use client';

/**
 * UserAvatar - 사용자 아바타 공통 컴포넌트
 *
 * 사용자 프로필 이미지를 표시하는 공통 컴포넌트입니다.
 * 사이드바, 프로필 페이지, 커뮤니티 게시글/댓글 등에서 재사용됩니다.
 *
 * 이미지 표시 우선순위:
 * 1. avatarId가 있으면 → /avatars/avatar-{id}.png 표시
 * 2. avatarId가 없고 photoURL 있으면 → Google 프로필 사진 표시
 * 3. 둘 다 없으면 → 닉네임 첫 글자로 이니셜 아바타 표시
 *
 * @example
 * // 기본 사용
 * <UserAvatar avatarId="bull" name="홍길동" size="md" />
 *
 * // Google 프로필 사진 fallback
 * <UserAvatar photoURL="https://..." name="홍길동" size="lg" />
 *
 * // 이니셜 아바타
 * <UserAvatar name="홍길동" size="sm" />
 */

import Image from 'next/image';
import { getAvatarPath, isValidAvatarId } from '@/constants/avatars';

/**
 * UserAvatar 컴포넌트 Props
 */
interface UserAvatarProps {
  /** 선택한 아바타 ID (예: 'bull', 'bear' 등) */
  avatarId?: string | null;
  /** Google 프로필 사진 URL (avatarId 없을 때 fallback) */
  photoURL?: string | null;
  /** 사용자 이름 (이니셜 표시용) */
  name?: string;
  /** 아바타 크기 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 추가 CSS 클래스 */
  className?: string;
  /** 클릭 핸들러 */
  onClick?: () => void;
}

/**
 * 크기별 스타일 매핑
 */
const sizeStyles = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-xs',
    image: 24,
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-sm',
    image: 32,
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-base',
    image: 40,
  },
  lg: {
    container: 'w-16 h-16',
    text: 'text-2xl',
    image: 64,
  },
  xl: {
    container: 'w-24 h-24',
    text: 'text-4xl',
    image: 96,
  },
};

export function UserAvatar({
  avatarId,
  photoURL,
  name = '사용자',
  size = 'md',
  className = '',
  onClick,
}: UserAvatarProps) {
  // 크기 스타일 가져오기
  const sizeStyle = sizeStyles[size];

  // 표시할 이미지 결정
  // 1. avatarId가 유효하면 → 해당 아바타 이미지
  // 2. photoURL이 있으면 → Google 프로필 사진
  // 3. 둘 다 없으면 → 이니셜 아바타
  const hasValidAvatar = isValidAvatarId(avatarId);
  const hasPhotoURL = !!photoURL;

  // 이니셜 생성 (첫 글자 대문자)
  const initial = name.charAt(0).toUpperCase();

  // 기본 컨테이너 클래스
  const containerClasses = `
    ${sizeStyle.container}
    rounded-full
    flex-shrink-0
    overflow-hidden
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim();

  // 1. 선택한 아바타가 있는 경우
  if (hasValidAvatar) {
    const avatarPath = getAvatarPath(avatarId);
    return (
      <div className={`relative ${containerClasses}`} onClick={onClick}>
        <Image
          src={avatarPath}
          alt={`${name} 아바타`}
          width={sizeStyle.image}
          height={sizeStyle.image}
          className="w-full h-full object-cover rounded-full"
          priority={size === 'xl' || size === 'lg'}
        />
      </div>
    );
  }

  // 2. Google 프로필 사진이 있는 경우
  if (hasPhotoURL) {
    return (
      <div className={`relative ${containerClasses}`} onClick={onClick}>
        <img
          src={photoURL}
          alt={`${name} 프로필`}
          className="w-full h-full object-cover rounded-full"
        />
      </div>
    );
  }

  // 3. 이니셜 아바타 (둘 다 없는 경우)
  return (
    <div
      className={`
        relative
        ${containerClasses}
        bg-gradient-to-br from-blue-500 to-blue-600
        flex items-center justify-center
      `}
      onClick={onClick}
    >
      <span className={`text-white font-bold ${sizeStyle.text}`}>
        {initial}
      </span>
    </div>
  );
}
