/**
 * 게시글 댓글 API (Firestore)
 *
 * GET /api/community/posts/[id]/comments - 댓글 목록 조회
 * POST /api/community/posts/[id]/comments - 새 댓글 작성
 *
 * Firestore 구조:
 * posts/{postId}/comments/{commentId}
 *   - userId: string
 *   - authorName: string
 *   - authorPhotoURL: string | null
 *   - content: string
 *   - createdAt: timestamp
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  postDoc,
  commentsCollection,
  getDocument,
  queryCollection,
  timestampToString,
  orderBy,
  startAfter,
  limit as firestoreLimit,
  addDoc,
  serverTimestamp,
  updateDoc,
  type FirestorePost,
  type FirestoreComment,
} from '@/lib/firestore';
import { CommunityComment, CreateCommentRequest, CommunityApiResponse } from '@/types/community';
import { increment } from 'firebase/firestore';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CommentsListResponse {
  comments: CommunityComment[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Firestore 문서를 CommunityComment로 변환
 */
function docToComment(doc: FirestoreComment & { id: string }): CommunityComment {
  return {
    id: doc.id,
    postId: '', // 서브컬렉션이므로 postId는 상위에서 제공
    userId: doc.userId,
    content: doc.content,
    createdAt: timestampToString(doc.createdAt),
    author: {
      id: doc.userId,
      name: doc.authorName || '사용자',
      avatarUrl: doc.authorPhotoURL || null,
    },
  };
}

/**
 * GET /api/community/posts/[id]/comments
 * 댓글 목록 조회
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // 게시글 존재 확인
    const post = await getDocument<FirestorePost>(postDoc(postId));

    if (!post) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 쿼리 조건 구성
    const constraints = [
      orderBy('createdAt', 'asc'),
    ];

    if (cursor) {
      const cursorDate = new Date(cursor);
      constraints.push(startAfter(cursorDate));
    }

    constraints.push(firestoreLimit(limit + 1));

    // 댓글 조회
    const comments = await queryCollection<FirestoreComment>(
      commentsCollection(postId),
      constraints
    );

    const hasMore = comments.length > limit;
    const commentsData = comments.slice(0, limit);
    const communityComments: CommunityComment[] = commentsData.map((doc) => ({
      ...docToComment(doc),
      postId,
    }));

    const nextCursor = hasMore && communityComments.length > 0
      ? communityComments[communityComments.length - 1].createdAt
      : undefined;

    return NextResponse.json<CommunityApiResponse<CommentsListResponse>>({
      success: true,
      data: {
        comments: communityComments,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error('[Comments API] 댓글 조회 에러:', error);
    return NextResponse.json<CommunityApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/posts/[id]/comments
 * 새 댓글 작성
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: postId } = await params;

    // 요청 헤더에서 사용자 정보 가져오기
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name') || '사용자';
    const userPhotoURL = request.headers.get('x-user-photo');

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

    const body: CreateCommentRequest = await request.json();
    const { content } = body;

    // 유효성 검사
    if (!content || content.trim().length === 0) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '댓글 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (content.length > 300) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '댓글은 300자를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // Firestore에 댓글 생성
    const commentData: Omit<FirestoreComment, 'createdAt'> = {
      userId,
      authorName: decodeURIComponent(userName),
      authorPhotoURL: userPhotoURL ? decodeURIComponent(userPhotoURL) : null,
      content: content.trim(),
    };

    const docRef = await addDoc(commentsCollection(postId), {
      ...commentData,
      createdAt: serverTimestamp(),
    });

    // 게시글의 commentsCount 증가
    await updateDoc(postDoc(postId), {
      commentsCount: increment(1),
    });

    // 생성된 댓글 데이터 반환
    const createdComment: CommunityComment = {
      id: docRef.id,
      postId,
      userId,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      author: {
        id: userId,
        name: decodeURIComponent(userName),
        avatarUrl: userPhotoURL ? decodeURIComponent(userPhotoURL) : null,
      },
    };

    return NextResponse.json<CommunityApiResponse<CommunityComment>>(
      { success: true, data: createdComment },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Comments API] 댓글 생성 에러:', error);
    return NextResponse.json<CommunityApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
