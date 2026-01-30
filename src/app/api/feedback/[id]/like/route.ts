/**
 * 피드백 공감(좋아요) API
 *
 * POST /api/feedback/[id]/like - 공감 토글
 *
 * ============================================================
 * 동작 방식:
 * ============================================================
 * - 이미 공감한 상태면 공감 취소
 * - 공감하지 않은 상태면 공감 추가
 * - likes 배열과 likeCount를 동시에 업데이트
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  feedbackDoc,
  getDocument,
  updateDocument,
} from '@/lib/firestore';
import { arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { FeedbackApiResponse, FirestoreFeedback } from '@/types/feedback';

// ============================================
// POST: 공감 토글
// ============================================

/**
 * POST /api/feedback/[id]/like
 *
 * 피드백에 공감을 토글합니다.
 *
 * Headers:
 * - x-user-id: 사용자 ID (필수)
 *
 * Response:
 * - liked: 공감 여부 (토글 후 상태)
 * - likeCount: 총 공감 수
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

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

    // 현재 공감 상태 확인
    const likes = feedback.likes || [];
    const isLiked = likes.includes(userId);

    // 공감 토글
    if (isLiked) {
      // 공감 취소
      await updateDocument(feedbackDoc(id), {
        likes: arrayRemove(userId),
        likeCount: increment(-1),
      });
    } else {
      // 공감 추가
      await updateDocument(feedbackDoc(id), {
        likes: arrayUnion(userId),
        likeCount: increment(1),
      });
    }

    // 새로운 상태 반환
    const newLikeCount = isLiked
      ? Math.max(0, (feedback.likeCount || 0) - 1)
      : (feedback.likeCount || 0) + 1;

    return NextResponse.json<
      FeedbackApiResponse<{ liked: boolean; likeCount: number }>
    >({
      success: true,
      data: {
        liked: !isLiked,
        likeCount: newLikeCount,
      },
    });
  } catch (error) {
    console.error('[Feedback Like API] 에러:', error);
    return NextResponse.json<FeedbackApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
