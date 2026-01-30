/**
 * 피드백 API
 *
 * GET /api/feedback - 피드백 목록 조회
 * POST /api/feedback - 새 피드백 작성
 *
 * ============================================================
 * Firestore 컬렉션 구조:
 * ============================================================
 * feedbacks/{feedbackId}
 *   - userId: string
 *   - userEmail: string
 *   - userName: string
 *   - userPhoto: string | null
 *   - category: 'bug' | 'feature' | 'complaint' | 'praise' | 'other'
 *   - title: string
 *   - content: string
 *   - isPrivate: boolean
 *   - status: 'received' | 'reviewing' | 'resolved' | 'rejected'
 *   - adminResponse: string | null
 *   - adminRespondedAt: timestamp | null
 *   - adminResponderName: string | null
 *   - likes: string[]
 *   - likeCount: number
 *   - commentCount: number
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  feedbacksCollection,
  queryCollection,
  timestampToString,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  addDoc,
  serverTimestamp,
} from '@/lib/firestore';
import {
  Feedback,
  FeedbackApiResponse,
  FeedbackListResponse,
  CreateFeedbackRequest,
  FeedbackCategory,
  FeedbackStatus,
  FirestoreFeedback,
} from '@/types/feedback';

// ============================================
// Firestore 문서 → 클라이언트 타입 변환
// ============================================

/**
 * Firestore 문서를 Feedback 타입으로 변환
 *
 * @param doc - Firestore 문서 데이터
 * @param currentUserId - 현재 사용자 ID (좋아요 여부 확인용)
 * @returns Feedback 객체
 */
function docToFeedback(
  doc: FirestoreFeedback & { id: string },
  currentUserId?: string | null
): Feedback {
  return {
    id: doc.id,
    userId: doc.userId,
    userEmail: doc.userEmail,
    userName: doc.userName,
    userPhoto: doc.userPhoto,

    category: doc.category,
    title: doc.title,
    content: doc.content,
    isPrivate: doc.isPrivate,

    status: doc.status,
    adminResponse: doc.adminResponse,
    adminRespondedAt: doc.adminRespondedAt
      ? timestampToString(doc.adminRespondedAt)
      : null,
    adminResponderName: doc.adminResponderName,

    likes: doc.likes || [],
    likeCount: doc.likeCount || 0,
    commentCount: doc.commentCount || 0,

    createdAt: timestampToString(doc.createdAt),
    updatedAt: timestampToString(doc.updatedAt),

    // 현재 사용자가 공감했는지 여부
    isLiked: currentUserId ? (doc.likes || []).includes(currentUserId) : false,
  };
}

// ============================================
// GET: 피드백 목록 조회
// ============================================

/**
 * GET /api/feedback
 *
 * 피드백 목록을 조회합니다.
 *
 * Query params:
 * - category: 카테고리 필터 (all, bug, feature, complaint, praise, other)
 * - status: 상태 필터 (all, received, reviewing, resolved, rejected)
 * - myOnly: 내 피드백만 조회 (true/false)
 * - cursor: 페이지네이션 커서 (createdAt ISO 문자열)
 * - limit: 조회 개수 (기본 20, 최대 50)
 * - isAdmin: 관리자 모드 (비공개 포함 조회)
 *
 * Headers:
 * - x-user-id: 현재 사용자 ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터 파싱
    const category = searchParams.get('category') || 'all';
    const status = searchParams.get('status') || 'all';
    const myOnly = searchParams.get('myOnly') === 'true';
    const cursor = searchParams.get('cursor');
    const limitNum = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const isAdmin = searchParams.get('isAdmin') === 'true';

    // 현재 사용자 ID
    const userId = request.headers.get('x-user-id');

    // 쿼리 조건 구성
    const constraints = [];

    // 카테고리 필터
    if (category !== 'all') {
      constraints.push(where('category', '==', category as FeedbackCategory));
    }

    // 상태 필터
    if (status !== 'all') {
      constraints.push(where('status', '==', status as FeedbackStatus));
    }

    // 내 피드백만 조회
    if (myOnly && userId) {
      constraints.push(where('userId', '==', userId));
    }

    // 비공개 피드백 필터링 (관리자가 아니면 공개된 것만 또는 본인 것만)
    // Firestore에서는 OR 조건이 제한적이므로 클라이언트에서 필터링
    if (!isAdmin && !myOnly) {
      constraints.push(where('isPrivate', '==', false));
    }

    // 최신순 정렬
    constraints.push(orderBy('createdAt', 'desc'));

    // 커서 기반 페이지네이션
    if (cursor) {
      const cursorDate = new Date(cursor);
      constraints.push(startAfter(cursorDate));
    }

    // 개수 제한 (+1 for hasMore check)
    constraints.push(firestoreLimit(limitNum + 1));

    // Firestore 쿼리 실행
    let feedbacks = await queryCollection<FirestoreFeedback>(
      feedbacksCollection(),
      constraints
    );

    // 내 피드백만 조회 시 비공개 포함 (본인 것은 볼 수 있음)
    // myOnly가 아닌 경우에도 본인의 비공개 피드백은 볼 수 있도록 추가 조회 필요
    // (복잡한 로직은 관리자 페이지에서만 필요하므로 여기서는 단순화)

    // hasMore 체크 및 결과 변환
    const hasMore = feedbacks.length > limitNum;
    const feedbacksData = feedbacks.slice(0, limitNum);

    const result: Feedback[] = feedbacksData.map((doc) =>
      docToFeedback(doc, userId)
    );

    const nextCursor =
      hasMore && result.length > 0
        ? result[result.length - 1].createdAt
        : undefined;

    return NextResponse.json<FeedbackApiResponse<FeedbackListResponse>>({
      success: true,
      data: {
        feedbacks: result,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error('[Feedback API] 목록 조회 에러:', error);
    return NextResponse.json<FeedbackApiResponse<FeedbackListResponse>>({
      success: true,
      data: {
        feedbacks: [],
        hasMore: false,
      },
    });
  }
}

// ============================================
// POST: 새 피드백 작성
// ============================================

/**
 * POST /api/feedback
 *
 * 새 피드백을 작성합니다.
 *
 * Headers:
 * - x-user-id: 사용자 ID (필수)
 * - x-user-email: 사용자 이메일 (필수)
 * - x-user-name: 사용자 이름
 * - x-user-photo: 프로필 사진 URL
 *
 * Body:
 * - category: 카테고리 (필수)
 * - title: 제목 (필수)
 * - content: 내용 (필수)
 * - isPrivate: 비공개 여부 (선택, 기본 false)
 */
export async function POST(request: NextRequest) {
  try {
    // 사용자 정보 헤더에서 가져오기
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userName = request.headers.get('x-user-name') || '사용자';
    const userPhoto = request.headers.get('x-user-photo');

    // 인증 확인
    if (!userId || !userEmail) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body: CreateFeedbackRequest = await request.json();
    const { category, title, content, isPrivate = false } = body;

    // 유효성 검사
    if (!category || !title || !content) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '카테고리, 제목, 내용은 필수입니다.' },
        { status: 400 }
      );
    }

    if (title.trim().length < 2) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '제목은 2자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    if (title.length > 100) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '제목은 100자를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    if (content.trim().length < 10) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '내용은 10자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '내용은 5000자를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 피드백 문서 생성
    const feedbackData: Omit<FirestoreFeedback, 'createdAt' | 'updatedAt'> = {
      userId,
      userEmail: decodeURIComponent(userEmail),
      userName: decodeURIComponent(userName),
      userPhoto: userPhoto ? decodeURIComponent(userPhoto) : null,

      category: category as FeedbackCategory,
      title: title.trim(),
      content: content.trim(),
      isPrivate,

      status: 'received',
      adminResponse: null,
      adminRespondedAt: null,
      adminResponderName: null,

      likes: [],
      likeCount: 0,
      commentCount: 0,
    };

    const docRef = await addDoc(feedbacksCollection(), {
      ...feedbackData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 생성된 피드백 반환
    const createdFeedback: Feedback = {
      id: docRef.id,
      ...feedbackData,
      adminRespondedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isLiked: false,
    };

    return NextResponse.json<FeedbackApiResponse<Feedback>>(
      { success: true, data: createdFeedback },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Feedback API] 작성 에러:', error);
    return NextResponse.json<FeedbackApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
