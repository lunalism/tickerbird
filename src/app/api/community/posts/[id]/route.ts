/**
 * 개별 게시글 API (Firestore)
 *
 * GET /api/community/posts/[id] - 게시글 상세 조회
 * PATCH /api/community/posts/[id] - 게시글 수정
 * DELETE /api/community/posts/[id] - 게시글 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  postDoc,
  likesCollection,
  getDocument,
  updateDocument,
  deleteDocument,
  timestampToString,
  query,
  where,
  getDocs,
  type FirestorePost,
} from '@/lib/firestore';
import {
  CommunityPost,
  UpdatePostRequest,
  CommunityApiResponse,
  CommunityCategory,
} from '@/types/community';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Firestore 문서를 CommunityPost로 변환
 *
 * 기존 게시글 호환성:
 * - markets, tickerNames 필드가 없는 경우 빈 배열로 처리
 * - authorHandle 필드가 없는 경우 userId 앞 8자리로 대체
 */
function docToPost(
  docData: FirestorePost & { id: string },
  isLiked: boolean = false
): CommunityPost {
  return {
    id: docData.id,
    userId: docData.userId,
    content: docData.content,
    category: (docData.category || 'stock') as CommunityCategory,
    tickers: docData.tickers || [],
    markets: docData.markets || [],           // 기존 글 호환 - 없으면 빈 배열
    tickerNames: docData.tickerNames || [],   // 기존 글 호환 - 없으면 빈 배열
    hashtags: docData.hashtags || [],
    likesCount: docData.likesCount || 0,
    commentsCount: docData.commentsCount || 0,
    repostsCount: docData.repostsCount || 0,
    createdAt: timestampToString(docData.createdAt),
    updatedAt: timestampToString(docData.updatedAt),
    author: {
      id: docData.userId,
      name: docData.authorName || '사용자',
      // 기존 글 호환: authorHandle 없으면 userId 앞 8자리 사용
      handle: docData.authorHandle || docData.userId.slice(0, 8),
      avatarUrl: docData.authorPhotoURL || null,
    },
    isLiked,
  };
}

/**
 * GET /api/community/posts/[id]
 * 게시글 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // 현재 사용자 ID 가져오기 (좋아요 여부 확인용)
    const userId = request.headers.get('x-user-id');

    // 게시글 조회
    const post = await getDocument<FirestorePost>(postDoc(id));

    if (!post) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 좋아요 여부 확인
    let isLiked = false;
    if (userId) {
      const likesQuery = query(
        likesCollection(id),
        where('userId', '==', userId)
      );
      const likeSnapshot = await getDocs(likesQuery);
      isLiked = !likeSnapshot.empty;
    }

    const postData = docToPost(post, isLiked);

    return NextResponse.json<CommunityApiResponse<CommunityPost>>({
      success: true,
      data: postData,
    });
  } catch (error) {
    console.error('[Post API] 게시글 조회 에러:', error);
    return NextResponse.json<CommunityApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/community/posts/[id]
 * 게시글 수정 (본인만 가능)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // 요청 헤더에서 사용자 ID 가져오기
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 게시글 조회
    const post = await getDocument<FirestorePost>(postDoc(id));

    if (!post) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 본인 확인
    if (post.userId !== userId) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글 수정 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const body: UpdatePostRequest = await request.json();
    // 종목 태그 관련 필드 추가: markets (시장 코드), tickerNames (종목명)
    const { content, category, tickers, markets, tickerNames, hashtags } = body;

    // 유효성 검사
    if (content !== undefined) {
      if (content.trim().length === 0) {
        return NextResponse.json<CommunityApiResponse<null>>(
          { success: false, error: '게시글 내용을 입력해주세요.' },
          { status: 400 }
        );
      }
      if (content.length > 500) {
        return NextResponse.json<CommunityApiResponse<null>>(
          { success: false, error: '게시글은 500자를 초과할 수 없습니다.' },
          { status: 400 }
        );
      }
    }

    // 업데이트할 필드 구성
    // 종목 태그 관련: tickers, markets, tickerNames
    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content.trim();
    if (category !== undefined) updateData.category = category;
    if (tickers !== undefined) updateData.tickers = tickers;
    if (markets !== undefined) updateData.markets = markets;           // 시장 코드 배열
    if (tickerNames !== undefined) updateData.tickerNames = tickerNames; // 종목명 배열
    if (hashtags !== undefined) updateData.hashtags = hashtags;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '수정할 내용이 없습니다.' },
        { status: 400 }
      );
    }

    // Firestore 문서 업데이트
    await updateDocument(postDoc(id), updateData);

    // 업데이트된 게시글 조회
    const updatedPost = await getDocument<FirestorePost>(postDoc(id));

    if (!updatedPost) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 좋아요 여부 확인
    const likesQuery = query(
      likesCollection(id),
      where('userId', '==', userId)
    );
    const likeSnapshot = await getDocs(likesQuery);
    const isLiked = !likeSnapshot.empty;

    const postData = docToPost(updatedPost, isLiked);

    return NextResponse.json<CommunityApiResponse<CommunityPost>>({
      success: true,
      data: postData,
    });
  } catch (error) {
    console.error('[Post API] 게시글 수정 에러:', error);
    return NextResponse.json<CommunityApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/posts/[id]
 * 게시글 삭제 (본인만 가능)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // 요청 헤더에서 사용자 ID 가져오기
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 게시글 조회
    const post = await getDocument<FirestorePost>(postDoc(id));

    if (!post) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 본인 확인
    if (post.userId !== userId) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글 삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Firestore 문서 삭제 (서브컬렉션은 자동 삭제되지 않지만, 일단 메인 문서 삭제)
    await deleteDocument(postDoc(id));

    return NextResponse.json<CommunityApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('[Post API] 게시글 삭제 에러:', error);
    return NextResponse.json<CommunityApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
