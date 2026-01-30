/**
 * 피드백(건의사항/불편사항) 관련 타입 정의
 *
 * Firestore 컬렉션 구조:
 * - feedbacks/{feedbackId}: 피드백 문서
 * - feedbacks/{feedbackId}/comments/{commentId}: 댓글 서브컬렉션
 */

import { Timestamp } from 'firebase/firestore';

// ============================================
// 카테고리 및 상태 타입
// ============================================

/** 피드백 카테고리 */
export type FeedbackCategory = 'bug' | 'feature' | 'complaint' | 'praise' | 'other';

/** 피드백 상태 */
export type FeedbackStatus = 'received' | 'reviewing' | 'resolved' | 'rejected';

// ============================================
// 카테고리/상태 설정
// ============================================

/** 피드백 카테고리 설정 */
export const FEEDBACK_CATEGORIES: Record<FeedbackCategory, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  bug: {
    label: '버그 제보',
    icon: '🐛',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  feature: {
    label: '기능 건의',
    icon: '💡',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  complaint: {
    label: '불편 사항',
    icon: '😤',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  praise: {
    label: '칭찬/감사',
    icon: '💖',
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  other: {
    label: '기타',
    icon: '📝',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
};

/** 피드백 상태 설정 */
export const FEEDBACK_STATUS: Record<FeedbackStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  received: {
    label: '접수됨',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  reviewing: {
    label: '검토중',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  resolved: {
    label: '반영됨',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  rejected: {
    label: '보류',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

// ============================================
// Firestore 문서 타입
// ============================================

/**
 * Firestore 피드백 문서 타입
 * 컬렉션 경로: feedbacks/{feedbackId}
 */
export interface FirestoreFeedback {
  /** 작성자 ID */
  userId: string;
  /** 작성자 이메일 */
  userEmail: string;
  /** 작성자 이름 */
  userName: string;
  /** 작성자 프로필 사진 */
  userPhoto: string | null;

  /** 카테고리 */
  category: FeedbackCategory;
  /** 제목 */
  title: string;
  /** 내용 */
  content: string;
  /** 비공개 여부 (운영진만 볼 수 있음) */
  isPrivate: boolean;

  /** 상태 */
  status: FeedbackStatus;
  /** 운영진 답변 */
  adminResponse: string | null;
  /** 운영진 답변 시간 */
  adminRespondedAt: Timestamp | null;
  /** 운영진 답변자 이름 */
  adminResponderName: string | null;

  /** 공감한 userId 배열 */
  likes: string[];
  /** 공감 수 */
  likeCount: number;
  /** 댓글 수 */
  commentCount: number;

  /** 생성일 */
  createdAt: Timestamp;
  /** 수정일 */
  updatedAt: Timestamp;
}

/**
 * Firestore 피드백 댓글 문서 타입
 * 컬렉션 경로: feedbacks/{feedbackId}/comments/{commentId}
 */
export interface FirestoreFeedbackComment {
  /** 작성자 ID */
  userId: string;
  /** 작성자 이메일 */
  userEmail: string;
  /** 작성자 이름 */
  userName: string;
  /** 작성자 프로필 사진 */
  userPhoto: string | null;
  /** 운영진 댓글 여부 */
  isAdmin: boolean;
  /** 내용 */
  content: string;
  /** 생성일 */
  createdAt: Timestamp;
}

// ============================================
// 클라이언트 타입 (camelCase)
// ============================================

/**
 * 클라이언트에서 사용하는 피드백 타입
 */
export interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhoto: string | null;

  category: FeedbackCategory;
  title: string;
  content: string;
  isPrivate: boolean;

  status: FeedbackStatus;
  adminResponse: string | null;
  adminRespondedAt: string | null;
  adminResponderName: string | null;

  likes: string[];
  likeCount: number;
  commentCount: number;

  createdAt: string;
  updatedAt: string;

  /** 현재 사용자가 공감했는지 여부 */
  isLiked: boolean;
}

/**
 * 클라이언트에서 사용하는 피드백 댓글 타입
 */
export interface FeedbackComment {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhoto: string | null;
  isAdmin: boolean;
  content: string;
  createdAt: string;
}

// ============================================
// API 요청/응답 타입
// ============================================

/** 피드백 생성 요청 */
export interface CreateFeedbackRequest {
  category: FeedbackCategory;
  title: string;
  content: string;
  isPrivate?: boolean;
}

/** 피드백 수정 요청 (관리자용) */
export interface UpdateFeedbackRequest {
  status?: FeedbackStatus;
  adminResponse?: string;
}

/** 댓글 생성 요청 */
export interface CreateFeedbackCommentRequest {
  content: string;
}

/** 피드백 목록 응답 */
export interface FeedbackListResponse {
  feedbacks: Feedback[];
  hasMore: boolean;
  nextCursor?: string;
}

/** API 응답 공통 타입 */
export interface FeedbackApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
