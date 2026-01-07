/**
 * 게시글 댓글 API
 *
 * GET /api/community/posts/[id]/comments - 댓글 목록 조회
 * POST /api/community/posts/[id]/comments - 새 댓글 작성
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  CommentRow,
  CommunityComment,
  CreateCommentRequest,
  CommunityApiResponse,
  rowToComment,
} from '@/types/community';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CommentsListResponse {
  comments: CommunityComment[];
  hasMore: boolean;
  nextCursor?: string;
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
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // 게시글 존재 확인
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 댓글 조회
    let query = supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (cursor) {
      query = query.gt('created_at', cursor);
    }

    query = query.limit(limit + 1);

    const { data: rows, error } = await query;

    if (error) {
      console.error('댓글 조회 에러:', error);
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '댓글을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    const hasMore = rows && rows.length > limit;
    const commentsData = (rows || []).slice(0, limit) as CommentRow[];
    const comments: CommunityComment[] = commentsData.map(row => rowToComment(row));

    const nextCursor = hasMore && comments.length > 0
      ? comments[comments.length - 1].createdAt
      : undefined;

    return NextResponse.json<CommunityApiResponse<CommentsListResponse>>({
      success: true,
      data: {
        comments,
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error('댓글 조회 에러:', error);
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
    const supabase = await createClient();

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 게시글 존재 확인
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
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

    // 댓글 생성
    const { data: newComment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
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
      console.error('댓글 생성 에러:', error);
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '댓글 작성에 실패했습니다.' },
        { status: 500 }
      );
    }

    const comment = rowToComment(newComment as CommentRow);

    return NextResponse.json<CommunityApiResponse<CommunityComment>>(
      { success: true, data: comment },
      { status: 201 }
    );
  } catch (error) {
    console.error('댓글 생성 에러:', error);
    return NextResponse.json<CommunityApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
