/**
 * 피드백 댓글 API
 *
 * GET /api/feedback/[id]/comments - 댓글 목록 조회
 * POST /api/feedback/[id]/comments - 새 댓글 작성
 *
 * ============================================================
 * Firestore 서브컬렉션:
 * ============================================================
 * feedbacks/{feedbackId}/comments/{commentId}
 *   - userId: string
 *   - userEmail: string
 *   - userName: string
 *   - userPhoto: string | null
 *   - isAdmin: boolean
 *   - content: string
 *   - createdAt: timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  feedbackDoc,
  feedbackCommentsCollection,
  getDocument,
  queryCollection,
  timestampToString,
  orderBy,
  addDoc,
  serverTimestamp,
  updateDocument,
} from '@/lib/firestore';
import { increment } from 'firebase/firestore';
import {
  FeedbackComment,
  FeedbackApiResponse,
  CreateFeedbackCommentRequest,
  FirestoreFeedbackComment,
  FirestoreFeedback,
} from '@/types/feedback';

// ============================================
// Firestore 문서 → 클라이언트 타입 변환
// ============================================

function docToComment(doc: FirestoreFeedbackComment & { id: string }): FeedbackComment {
  return {
    id: doc.id,
    userId: doc.userId,
    userEmail: doc.userEmail,
    userName: doc.userName,
    userPhoto: doc.userPhoto,
    isAdmin: doc.isAdmin,
    content: doc.content,
    createdAt: timestampToString(doc.createdAt),
  };
}

// ============================================
// GET: 댓글 목록 조회
// ============================================

/**
 * GET /api/feedback/[id]/comments
 *
 * 피드백의 댓글 목록을 조회합니다.
 * 작성일 오름차순으로 정렬됩니다.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feedbackId } = await params;

    // 피드백 존재 확인
    const feedback = await getDocument<FirestoreFeedback>(feedbackDoc(feedbackId));

    if (!feedback) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '피드백을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 댓글 목록 조회 (작성일 오름차순)
    const comments = await queryCollection<FirestoreFeedbackComment>(
      feedbackCommentsCollection(feedbackId),
      [orderBy('createdAt', 'asc')]
    );

    return NextResponse.json<FeedbackApiResponse<FeedbackComment[]>>({
      success: true,
      data: comments.map(docToComment),
    });
  } catch (error) {
    console.error('[Feedback Comments API] 목록 조회 에러:', error);
    return NextResponse.json<FeedbackApiResponse<FeedbackComment[]>>({
      success: true,
      data: [],
    });
  }
}

// ============================================
// POST: 새 댓글 작성
// ============================================

/**
 * POST /api/feedback/[id]/comments
 *
 * 새 댓글을 작성합니다.
 *
 * Headers:
 * - x-user-id: 사용자 ID (필수)
 * - x-user-email: 사용자 이메일 (필수)
 * - x-user-name: 사용자 이름
 * - x-user-photo: 프로필 사진 URL
 * - x-is-admin: 관리자 여부
 *
 * Body:
 * - content: 댓글 내용 (필수)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feedbackId } = await params;

    // 사용자 정보 헤더에서 가져오기
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userName = request.headers.get('x-user-name') || '사용자';
    const userPhoto = request.headers.get('x-user-photo');
    const isAdmin = request.headers.get('x-is-admin') === 'true';

    // 인증 확인
    if (!userId || !userEmail) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 피드백 존재 확인
    const feedback = await getDocument<FirestoreFeedback>(feedbackDoc(feedbackId));

    if (!feedback) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '피드백을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 요청 본문 파싱
    const body: CreateFeedbackCommentRequest = await request.json();
    const { content } = body;

    // 유효성 검사
    if (!content || content.trim().length === 0) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '댓글 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '댓글은 1000자를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 댓글 문서 생성
    const commentData: Omit<FirestoreFeedbackComment, 'createdAt'> = {
      userId,
      userEmail: decodeURIComponent(userEmail),
      userName: decodeURIComponent(userName),
      userPhoto: userPhoto ? decodeURIComponent(userPhoto) : null,
      isAdmin,
      content: content.trim(),
    };

    const docRef = await addDoc(feedbackCommentsCollection(feedbackId), {
      ...commentData,
      createdAt: serverTimestamp(),
    });

    // 피드백의 commentCount 증가
    await updateDocument(feedbackDoc(feedbackId), {
      commentCount: increment(1),
    });

    // 생성된 댓글 반환
    const createdComment: FeedbackComment = {
      id: docRef.id,
      ...commentData,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json<FeedbackApiResponse<FeedbackComment>>(
      { success: true, data: createdComment },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Feedback Comments API] 작성 에러:', error);
    return NextResponse.json<FeedbackApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
