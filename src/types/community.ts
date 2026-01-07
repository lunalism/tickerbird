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

// =====================================================
// Supabase 연동을 위한 타입 정의
// =====================================================

/**
 * DB posts 테이블 행 타입
 */
export interface PostRow {
  id: string;
  user_id: string;
  content: string;
  category: string;
  tickers: string[];
  hashtags: string[];
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  created_at: string;
  updated_at: string;
  // JOIN된 프로필 정보 (profiles 테이블의 컬럼명과 일치)
  profiles?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
}

/**
 * DB comments 테이블 행 타입
 */
export interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // JOIN된 프로필 정보 (profiles 테이블의 컬럼명과 일치)
  profiles?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
}

/**
 * DB likes 테이블 행 타입
 */
export interface LikeRow {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

/**
 * DB follows 테이블 행 타입
 */
export interface FollowRow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

/**
 * 클라이언트에서 사용하는 Post 타입 (camelCase)
 */
export interface CommunityPost {
  id: string;
  userId: string;
  content: string;
  category: CommunityCategory;
  tickers: string[];
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: string;
  updatedAt: string;
  // 작성자 정보
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  // 현재 사용자 상태
  isLiked: boolean;
}

/**
 * 클라이언트에서 사용하는 Comment 타입 (camelCase)
 */
export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  // 작성자 정보
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

/**
 * 게시글 생성 요청 타입
 */
export interface CreatePostRequest {
  content: string;
  category?: CommunityCategory;
  tickers?: string[];
  hashtags?: string[];
}

/**
 * 게시글 수정 요청 타입
 */
export interface UpdatePostRequest {
  content?: string;
  category?: CommunityCategory;
  tickers?: string[];
  hashtags?: string[];
}

/**
 * 댓글 생성 요청 타입
 */
export interface CreateCommentRequest {
  content: string;
}

/**
 * API 응답 타입
 */
export interface CommunityApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 게시글 목록 응답 타입
 */
export interface PostsListResponse {
  posts: CommunityPost[];
  hasMore: boolean;
  nextCursor?: string;
}

// =====================================================
// 타입 변환 함수
// =====================================================

/**
 * PostRow를 CommunityPost로 변환
 */
export function rowToPost(row: PostRow, isLiked: boolean = false): CommunityPost {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    category: row.category as CommunityCategory,
    tickers: row.tickers || [],
    hashtags: row.hashtags || [],
    likesCount: row.likes_count,
    commentsCount: row.comments_count,
    repostsCount: row.reposts_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: {
      id: row.profiles?.id || row.user_id,
      name: row.profiles?.name || '사용자',
      avatarUrl: row.profiles?.avatar_url || null,
    },
    isLiked,
  };
}

/**
 * CommentRow를 CommunityComment로 변환
 */
export function rowToComment(row: CommentRow): CommunityComment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    author: {
      id: row.profiles?.id || row.user_id,
      name: row.profiles?.name || '사용자',
      avatarUrl: row.profiles?.avatar_url || null,
    },
  };
}
