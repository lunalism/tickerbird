/**
 * 커뮤니티 게시글 API (Firestore)
 *
 * GET /api/community/posts - 게시글 목록 조회
 * POST /api/community/posts - 새 게시글 작성
 *
 * Firestore 컬렉션 구조:
 * posts/{postId}
 *   - userId: string
 *   - authorName: string
 *   - authorPhotoURL: string | null
 *   - content: string
 *   - category: string
 *   - tickers: string[]         - 종목 코드 배열 ["005930", "AAPL", "TSLA"]
 *   - markets: string[]         - 시장 코드 배열 ["KR", "US"]
 *   - tickerNames: string[]     - 종목명 배열 ["삼성전자", "Apple", "Tesla"]
 *   - hashtags: array
 *   - likesCount: number
 *   - commentsCount: number
 *   - repostsCount: number
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  postsCollection,
  likesCollection,
  queryCollection,
  timestampToString,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getDocs,
  query,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
  type FirestorePost,
} from '@/lib/firestore';
import { db, auth } from '@/lib/firebase';
import {
  CommunityPost,
  CommunityApiResponse,
  PostsListResponse,
  CommunityCategory,
  CreatePostRequest,
} from '@/types/community';

/**
 * Firestore 문서를 CommunityPost로 변환
 * 기존 게시글 호환성: markets, tickerNames 필드가 없는 경우 빈 배열로 처리
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
      avatarUrl: docData.authorPhotoURL || null,
    },
    isLiked,
  };
}

/**
 * GET /api/community/posts
 * 게시글 목록 조회
 *
 * Query params:
 * - category: 카테고리 필터 (all, stock, strategy, qna)
 * - sort: 정렬 (latest, popular)
 * - cursor: 페이지네이션 커서 (createdAt ISO 문자열)
 * - limit: 조회 개수 (기본 20)
 * - ticker: 종목 코드 필터 (특정 종목 관련 게시글만 조회)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const category = (searchParams.get('category') || 'all') as CommunityCategory;
    const sort = searchParams.get('sort') || 'latest';
    const cursor = searchParams.get('cursor');
    const limitNum = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    // 종목별 게시글 조회를 위한 ticker 파라미터
    const ticker = searchParams.get('ticker');

    // 현재 사용자 ID 가져오기 (좋아요 여부 확인용)
    // API Route에서는 auth.currentUser가 null일 수 있으므로 헤더에서 userId를 받아옴
    const userId = request.headers.get('x-user-id');

    // 쿼리 조건 구성
    const constraints = [];

    // 종목 필터 (array-contains 사용)
    // 특정 종목의 게시글만 조회할 때 사용
    if (ticker) {
      constraints.push(where('tickers', 'array-contains', ticker));
    }

    // 카테고리 필터
    if (category !== 'all' && category !== 'following') {
      constraints.push(where('category', '==', category));
    }

    // 정렬
    if (sort === 'popular') {
      constraints.push(orderBy('likesCount', 'desc'));
    }
    constraints.push(orderBy('createdAt', 'desc'));

    // 커서 기반 페이지네이션
    if (cursor) {
      // 커서 문서 가져오기
      const cursorDate = new Date(cursor);
      constraints.push(startAfter(cursorDate));
    }

    // 개수 제한 (+1 for hasMore check)
    constraints.push(firestoreLimit(limitNum + 1));

    // Firestore 쿼리 실행
    const posts = await queryCollection<FirestorePost>(
      postsCollection(),
      constraints
    );

    // 좋아요 여부 조회 (로그인 사용자만)
    const likedPostIds = new Set<string>();
    if (userId && posts.length > 0) {
      // 각 게시글의 likes 서브컬렉션에서 현재 사용자의 좋아요 확인
      const likeChecks = posts.slice(0, limitNum).map(async (post) => {
        const likesQuery = query(
          likesCollection(post.id),
          where('userId', '==', userId)
        );
        const likeSnapshot = await getDocs(likesQuery);
        if (!likeSnapshot.empty) {
          likedPostIds.add(post.id);
        }
      });
      await Promise.all(likeChecks);
    }

    // hasMore 체크 및 결과 변환
    const hasMore = posts.length > limitNum;
    const postsData = posts.slice(0, limitNum);
    const communityPosts: CommunityPost[] = postsData.map((post) =>
      docToPost(post, likedPostIds.has(post.id))
    );

    const nextCursor = hasMore && communityPosts.length > 0
      ? communityPosts[communityPosts.length - 1].createdAt
      : undefined;

    return NextResponse.json<CommunityApiResponse<PostsListResponse>>({
      success: true,
      data: {
        posts: communityPosts,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error('[Posts API] 게시글 조회 에러:', error);
    // 예외 발생 시에도 빈 결과 반환 (페이지 렌더링을 방해하지 않도록)
    return NextResponse.json<CommunityApiResponse<PostsListResponse>>({
      success: true,
      data: {
        posts: [],
        hasMore: false,
      },
    });
  }
}

/**
 * POST /api/community/posts
 * 새 게시글 작성
 */
export async function POST(request: NextRequest) {
  try {
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

    const body: CreatePostRequest = await request.json();
    // 종목 태그 관련 필드 추가: markets (시장 코드), tickerNames (종목명)
    const { content, category = 'stock', tickers = [], markets = [], tickerNames = [], hashtags = [] } = body;

    // 유효성 검사
    if (!content || content.trim().length === 0) {
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

    // Firestore에 게시글 생성
    // 종목 태그: tickers (종목 코드), markets (시장), tickerNames (종목명)
    const postData: Omit<FirestorePost, 'createdAt' | 'updatedAt'> = {
      userId,
      authorName: decodeURIComponent(userName),
      authorPhotoURL: userPhotoURL ? decodeURIComponent(userPhotoURL) : null,
      content: content.trim(),
      category,
      tickers,
      markets,           // 시장 코드 배열 ["KR", "US"]
      tickerNames,       // 종목명 배열 ["삼성전자", "Apple", "Tesla"]
      hashtags,
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
    };

    const docRef = await addDoc(postsCollection(), {
      ...postData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 생성된 게시글 데이터 반환
    const createdPost: CommunityPost = {
      id: docRef.id,
      userId,
      content: content.trim(),
      category: category as CommunityCategory,
      tickers,
      markets,           // 시장 코드 배열
      tickerNames,       // 종목명 배열
      hashtags,
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: userId,
        name: decodeURIComponent(userName),
        avatarUrl: userPhotoURL ? decodeURIComponent(userPhotoURL) : null,
      },
      isLiked: false,
    };

    return NextResponse.json<CommunityApiResponse<CommunityPost>>(
      { success: true, data: createdPost },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Posts API] 게시글 생성 에러:', error);
    return NextResponse.json<CommunityApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
