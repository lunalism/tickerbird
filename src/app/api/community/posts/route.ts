/**
 * 커뮤니티 게시글 API
 *
 * GET /api/community/posts - 게시글 목록 조회
 * POST /api/community/posts - 새 게시글 작성
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  PostRow,
  CommunityPost,
  CreatePostRequest,
  CommunityApiResponse,
  PostsListResponse,
  rowToPost,
  CommunityCategory,
} from '@/types/community';

/**
 * GET /api/community/posts
 * 게시글 목록 조회
 *
 * Query params:
 * - category: 카테고리 필터 (all, stock, strategy, qna, following)
 * - sort: 정렬 (latest, popular)
 * - cursor: 페이지네이션 커서 (게시글 ID)
 * - limit: 조회 개수 (기본 20)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const category = (searchParams.get('category') || 'all') as CommunityCategory;
    const sort = searchParams.get('sort') || 'latest';
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // 현재 사용자 정보 가져오기 (좋아요 여부 확인용)
    const { data: { user } } = await supabase.auth.getUser();

    // 쿼리 빌드
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          avatar_url
        )
      `);

    // 카테고리 필터
    if (category !== 'all' && category !== 'following') {
      query = query.eq('category', category);
    }

    // 팔로잉 필터 (로그인 사용자만)
    if (category === 'following' && user) {
      // 팔로우하는 사용자들의 ID 가져오기
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = follows?.map(f => f.following_id) || [];

      if (followingIds.length > 0) {
        query = query.in('user_id', followingIds);
      } else {
        // 팔로잉이 없으면 빈 결과 반환
        return NextResponse.json<CommunityApiResponse<PostsListResponse>>({
          success: true,
          data: {
            posts: [],
            hasMore: false,
          },
        });
      }
    }

    // 정렬
    if (sort === 'popular') {
      query = query.order('likes_count', { ascending: false });
    }
    query = query.order('created_at', { ascending: false });

    // 페이지네이션
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    query = query.limit(limit + 1); // +1 for hasMore check

    const { data: rows, error } = await query;

    if (error) {
      // 테이블이 없는 경우 빈 결과 반환 (42P01 = undefined_table)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('posts 테이블이 아직 생성되지 않았습니다. 마이그레이션을 실행해주세요.');
        return NextResponse.json<CommunityApiResponse<PostsListResponse>>({
          success: true,
          data: {
            posts: [],
            hasMore: false,
          },
        });
      }
      console.error('게시글 조회 에러:', error);
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // 좋아요 여부 조회 (로그인 사용자만)
    let likedPostIds: Set<string> = new Set();
    if (user && rows && rows.length > 0) {
      const postIds = rows.map(r => r.id);
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);

      likedPostIds = new Set(likes?.map(l => l.post_id) || []);
    }

    // hasMore 체크 및 결과 변환
    const hasMore = rows && rows.length > limit;
    const postsData = (rows || []).slice(0, limit) as PostRow[];
    const posts: CommunityPost[] = postsData.map(row =>
      rowToPost(row, likedPostIds.has(row.id))
    );

    const nextCursor = hasMore && posts.length > 0
      ? posts[posts.length - 1].createdAt
      : undefined;

    return NextResponse.json<CommunityApiResponse<PostsListResponse>>({
      success: true,
      data: {
        posts,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error('게시글 조회 에러:', error);
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
    const supabase = await createClient();

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body: CreatePostRequest = await request.json();
    const { content, category = 'stock', tickers = [], hashtags = [] } = body;

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

    // 게시글 생성
    const { data: newPost, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: content.trim(),
        category,
        tickers,
        hashtags,
      })
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('게시글 생성 에러:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      // 테이블이 없는 경우
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json<CommunityApiResponse<null>>(
          { success: false, error: '커뮤니티 테이블이 아직 생성되지 않았습니다. 관리자에게 문의하세요.' },
          { status: 503 }
        );
      }

      // RLS 정책 위반
      if (error.code === '42501') {
        return NextResponse.json<CommunityApiResponse<null>>(
          { success: false, error: '게시글 작성 권한이 없습니다.' },
          { status: 403 }
        );
      }

      // FK 제약조건 위반 (user_id가 profiles에 없음)
      if (error.code === '23503') {
        return NextResponse.json<CommunityApiResponse<null>>(
          { success: false, error: '프로필 정보를 찾을 수 없습니다. 다시 로그인해주세요.' },
          { status: 400 }
        );
      }

      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: `게시글 작성에 실패했습니다: ${error.message}` },
        { status: 500 }
      );
    }

    const post = rowToPost(newPost as PostRow, false);

    return NextResponse.json<CommunityApiResponse<CommunityPost>>(
      { success: true, data: post },
      { status: 201 }
    );
  } catch (error) {
    console.error('게시글 생성 에러:', error);
    return NextResponse.json<CommunityApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
