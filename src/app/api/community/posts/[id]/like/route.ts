/**
 * 게시글 좋아요 API (Firestore)
 *
 * POST /api/community/posts/[id]/like - 좋아요 토글
 *
 * Firestore 구조:
 * posts/{postId}/likes/{docId}
 *   - userId: string
 *   - createdAt: timestamp
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  postDoc,
  likesCollection,
  getDocument,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  type FirestorePost,
} from '@/lib/firestore';
import { CommunityApiResponse } from '@/types/community';
import { increment } from 'firebase/firestore';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface LikeResponse {
  liked: boolean;
  likesCount: number;
}

/**
 * POST /api/community/posts/[id]/like
 * 좋아요 토글 (좋아요 추가/취소)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: postId } = await params;

    // 요청 헤더에서 사용자 ID 가져오기
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 게시글 존재 확인
    const post = await getDocument<FirestorePost>(postDoc(postId));

    if (!post) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이미 좋아요 했는지 확인
    const likesQuery = query(
      likesCollection(postId),
      where('userId', '==', userId)
    );
    const likeSnapshot = await getDocs(likesQuery);

    let liked: boolean;
    let likesCount = post.likesCount || 0;

    if (!likeSnapshot.empty) {
      // 좋아요 취소
      const likeDoc = likeSnapshot.docs[0];
      await deleteDoc(likeDoc.ref);

      // 게시글의 likesCount 감소
      await updateDoc(postDoc(postId), {
        likesCount: increment(-1),
      });

      liked = false;
      likesCount = Math.max(0, likesCount - 1);
    } else {
      // 좋아요 추가
      await addDoc(likesCollection(postId), {
        userId,
        createdAt: serverTimestamp(),
      });

      // 게시글의 likesCount 증가
      await updateDoc(postDoc(postId), {
        likesCount: increment(1),
      });

      liked = true;
      likesCount = likesCount + 1;
    }

    return NextResponse.json<CommunityApiResponse<LikeResponse>>({
      success: true,
      data: {
        liked,
        likesCount,
      },
    });
  } catch (error) {
    console.error('[Like API] 좋아요 처리 에러:', error);
    return NextResponse.json<CommunityApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
