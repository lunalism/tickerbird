/**
 * 커뮤니티 기능 타입 정의
 * 게시글, 댓글, 좋아요, 북마크 등 커뮤니티 도메인의 TypeScript 타입입니다.
 */

/** 게시글 카테고리 */
export type PostCategory = string;

/** 좋아요 대상 타입 (게시글 또는 댓글) */
export type LikeTargetType = "post" | "comment";

/** 커뮤니티 게시글 */
export interface Post {
  /** 고유 ID */
  id: string;
  /** 작성자 ID (Profile.id 참조) */
  user_id: string;
  /** 카테고리 */
  category: PostCategory;
  /** 게시글 제목 */
  title: string;
  /** 게시글 본문 */
  content: string;
  /** 관련 티커 심볼 (단일, 없을 수 있음) */
  related_ticker: string | null;
  /** 조회 수 */
  view_count: number;
  /** 좋아요 수 */
  like_count: number;
  /** 댓글 수 */
  comment_count: number;
  /** 상단 고정 여부 */
  is_pinned: boolean;
  /** 삭제 여부 (소프트 삭제) */
  is_deleted: boolean;
  /** 생성 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
}

/** 댓글 */
export interface Comment {
  /** 고유 ID */
  id: string;
  /** 게시글 ID (Post.id 참조) */
  post_id: string;
  /** 작성자 ID (Profile.id 참조) */
  user_id: string;
  /** 부모 댓글 ID (대댓글인 경우, 최상위 댓글이면 null) */
  parent_id: string | null;
  /** 댓글 내용 */
  content: string;
  /** 좋아요 수 */
  like_count: number;
  /** 삭제 여부 (소프트 삭제) */
  is_deleted: boolean;
  /** 생성 일시 */
  created_at: string;
  /** 수정 일시 */
  updated_at: string;
}

/** 좋아요 (게시글/댓글 공용) */
export interface Like {
  /** 고유 ID */
  id: string;
  /** 좋아요를 누른 사용자 ID (Profile.id 참조) */
  user_id: string;
  /** 좋아요 대상 타입 (게시글 또는 댓글) */
  target_type: LikeTargetType;
  /** 좋아요 대상 ID (Post.id 또는 Comment.id) */
  target_id: string;
  /** 생성 일시 */
  created_at: string;
}

/** 게시글 북마크 */
export interface PostBookmark {
  /** 고유 ID */
  id: string;
  /** 북마크한 사용자 ID (Profile.id 참조) */
  user_id: string;
  /** 북마크 대상 게시글 ID (Post.id 참조) */
  post_id: string;
  /** 생성 일시 */
  created_at: string;
}

/** 작성자 요약 정보 (조인 시 사용) */
export interface CommunityAuthor {
  /** 사용자 ID */
  id: string;
  /** 사용자명 */
  username: string;
  /** 프로필 이미지 URL */
  avatar_url: string | null;
}

/** 작성자 정보가 포함된 게시글 (목록/상세 응답용) */
export interface PostWithAuthor extends Post {
  /** 작성자 정보 */
  author: CommunityAuthor;
}

/** 작성자 정보가 포함된 댓글 (목록/상세 응답용) */
export interface CommentWithAuthor extends Comment {
  /** 작성자 정보 */
  author: CommunityAuthor;
}

/** 게시글 생성 입력 */
export interface CreatePostInput {
  /** 게시글 제목 */
  title: string;
  /** 게시글 본문 */
  content: string;
  /** 카테고리 */
  category: PostCategory;
}

/** 댓글 생성 입력 */
export interface CreateCommentInput {
  /** 게시글 ID */
  post_id: string;
  /** 댓글 내용 */
  content: string;
  /** 부모 댓글 ID (대댓글 작성 시) */
  parent_id?: string;
}
