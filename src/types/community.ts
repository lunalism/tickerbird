/**
 * 커뮤니티 관련 타입 정의
 *
 * 타임라인 피드 스타일을 지원합니다.
 */

// 카테고리 탭 타입 (팔로잉 추가)
export type CommunityCategory = 'all' | 'following' | 'stock' | 'strategy' | 'qna';

// 정렬 타입
export type SortType = 'latest' | 'popular';

export interface CommunityTab {
  id: CommunityCategory;
  label: string;
}

/**
 * 종목 태그 정보
 * 본문에서 $AAPL 형태로 태그된 종목
 */
export interface StockTag {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
}

/**
 * 피드 포스트 (트위터/X 스타일)
 */
export interface FeedPost {
  id: number;
  // 작성자 정보
  author: string;
  username: string; // @아이디
  authorAvatar: string; // 이모지 또는 이미지 URL
  // 콘텐츠
  content: string; // 본문 (최대 280자)
  hashtags: string[]; // #해시태그
  stockTags: StockTag[]; // $종목 태그
  imageUrl?: string; // 첨부 이미지
  // 메타 정보
  category: CommunityCategory;
  createdAt: string;
  // 인터랙션 카운트
  likes: number;
  comments: number;
  reposts: number;
  // 현재 사용자 상태
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
  // 기타
  isHot: boolean;
}

/**
 * 기존 Post 타입 (하위 호환성)
 */
export interface PostStock {
  name: string;
  ticker: string;
}

export interface Post {
  id: number;
  category: CommunityCategory;
  categoryLabel: string;
  title: string;
  author: string;
  authorAvatar?: string;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  isHot: boolean;
  stock?: PostStock;
}

export interface HotPost {
  id: number;
  title: string;
  comments: number;
}

export interface DiscussionStock {
  name: string;
  ticker: string;
  mentions: number;
}

export interface ActiveUser {
  name: string;
  avatar: string;
  posts: number;
}
