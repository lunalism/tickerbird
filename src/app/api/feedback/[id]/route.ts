/**
 * 피드백 상세 API
 *
 * GET /api/feedback/[id] - 피드백 상세 조회
 * PUT /api/feedback/[id] - 피드백 수정 (상태 변경, 운영진 답변)
 * DELETE /api/feedback/[id] - 피드백 삭제
 *
 * ============================================================
 * 권한:
 * ============================================================
 * - GET: 공개 피드백은 누구나, 비공개는 본인/관리자만
 * - PUT: 관리자만 (상태 변경, 운영진 답변)
 * - DELETE: 본인 또는 관리자
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  feedbackDoc,
  getDocument,
  updateDocument,
  deleteDocument,
  timestampToString,
  serverTimestamp,
} from '@/lib/firestore';
import {
  Feedback,
  FeedbackApiResponse,
  UpdateFeedbackRequest,
  FirestoreFeedback,
} from '@/types/feedback';

// ============================================
// Firestore 문서 → 클라이언트 타입 변환
// ============================================

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

    isLiked: currentUserId ? (doc.likes || []).includes(currentUserId) : false,
  };
}

// ============================================
// GET: 피드백 상세 조회
// ============================================

/**
 * GET /api/feedback/[id]
 *
 * 피드백 상세 정보를 조회합니다.
 *
 * Headers:
 * - x-user-id: 현재 사용자 ID
 * - x-is-admin: 관리자 여부 (true/false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const isAdmin = request.headers.get('x-is-admin') === 'true';

    // 피드백 조회
    const feedback = await getDocument<FirestoreFeedback>(feedbackDoc(id));

    if (!feedback) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '피드백을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 비공개 피드백 접근 권한 확인
    if (feedback.isPrivate && !isAdmin && feedback.userId !== userId) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    return NextResponse.json<FeedbackApiResponse<Feedback>>({
      success: true,
      data: docToFeedback(feedback, userId),
    });
  } catch (error) {
    console.error('[Feedback API] 상세 조회 에러:', error);
    return NextResponse.json<FeedbackApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: 피드백 수정 (관리자용)
// ============================================

/**
 * PUT /api/feedback/[id]
 *
 * 피드백을 수정합니다. (상태 변경, 운영진 답변)
 * 관리자만 사용 가능합니다.
 *
 * Headers:
 * - x-user-id: 사용자 ID
 * - x-user-name: 사용자 이름 (관리자 답변자 이름으로 사용)
 * - x-is-admin: 관리자 여부 (true 필수)
 *
 * Body:
 * - status: 변경할 상태 (선택)
 * - adminResponse: 운영진 답변 (선택)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name') || '관리자';
    const isAdmin = request.headers.get('x-is-admin') === 'true';

    // 관리자 권한 확인
    if (!isAdmin) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 피드백 존재 확인
    const feedback = await getDocument<FirestoreFeedback>(feedbackDoc(id));

    if (!feedback) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '피드백을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 요청 본문 파싱
    const body: UpdateFeedbackRequest = await request.json();
    const { status, adminResponse } = body;

    // 업데이트할 데이터 구성
    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
    }

    if (adminResponse !== undefined) {
      updateData.adminResponse = adminResponse;
      updateData.adminRespondedAt = serverTimestamp();
      updateData.adminResponderName = decodeURIComponent(userName);
    }

    // 업데이트 실행
    await updateDocument(feedbackDoc(id), updateData);

    // 업데이트된 데이터 반환
    const updatedFeedback = await getDocument<FirestoreFeedback>(feedbackDoc(id));

    return NextResponse.json<FeedbackApiResponse<Feedback>>({
      success: true,
      data: docToFeedback(updatedFeedback!, userId),
    });
  } catch (error) {
    console.error('[Feedback API] 수정 에러:', error);
    return NextResponse.json<FeedbackApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: 피드백 삭제
// ============================================

/**
 * DELETE /api/feedback/[id]
 *
 * 피드백을 삭제합니다.
 * 본인 또는 관리자만 삭제 가능합니다.
 *
 * Headers:
 * - x-user-id: 사용자 ID
 * - x-is-admin: 관리자 여부
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const isAdmin = request.headers.get('x-is-admin') === 'true';

    // 인증 확인
    if (!userId) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 피드백 조회
    const feedback = await getDocument<FirestoreFeedback>(feedbackDoc(id));

    if (!feedback) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '피드백을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인 (본인 또는 관리자)
    if (feedback.userId !== userId && !isAdmin) {
      return NextResponse.json<FeedbackApiResponse<null>>(
        { success: false, error: '삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 삭제 실행
    await deleteDocument(feedbackDoc(id));

    return NextResponse.json<FeedbackApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('[Feedback API] 삭제 에러:', error);
    return NextResponse.json<FeedbackApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
