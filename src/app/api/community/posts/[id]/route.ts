/**
 * 개별 게시글 API
 *
 * GET /api/community/posts/[id] - 게시글 상세 조회
 * PATCH /api/community/posts/[id] - 게시글 수정
 * DELETE /api/community/posts/[id] - 게시글 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  PostRow,
  CommunityPost,
  UpdatePostRequest,
  CommunityApiResponse,
  rowToPost,
} from '@/types/community';

interface RouteParams {
  params: Promise<{ id: string }>;
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
    const supabase = await createClient();

    // 현재 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser();

    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (error || !post) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 좋아요 여부 확인
    let isLiked = false;
    if (user) {
      const { data: like } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .single();

      isLiked = !!like;
    }

    const postData = rowToPost(post as PostRow, isLiked);

    return NextResponse.json<CommunityApiResponse<CommunityPost>>({
      success: true,
      data: postData,
    });
  } catch (error) {
    console.error('게시글 조회 에러:', error);
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
    const supabase = await createClient();

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body: UpdatePostRequest = await request.json();
    const { content, category, tickers, hashtags } = body;

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
    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content.trim();
    if (category !== undefined) updateData.category = category;
    if (tickers !== undefined) updateData.tickers = tickers;
    if (hashtags !== undefined) updateData.hashtags = hashtags;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '수정할 내용이 없습니다.' },
        { status: 400 }
      );
    }

    // 게시글 수정 (RLS가 본인 확인)
    const { data: updatedPost, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // 본인 확인
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          avatar_url
        )
      `)
      .single();

    if (error || !updatedPost) {
      console.error('게시글 수정 에러:', error);
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글 수정에 실패했습니다. 권한을 확인해주세요.' },
        { status: 403 }
      );
    }

    // 좋아요 여부 확인
    const { data: like } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .single();

    const postData = rowToPost(updatedPost as PostRow, !!like);

    return NextResponse.json<CommunityApiResponse<CommunityPost>>({
      success: true,
      data: postData,
    });
  } catch (error) {
    console.error('게시글 수정 에러:', error);
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
    const supabase = await createClient();

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 게시글 삭제 (RLS가 본인 확인)
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // 본인 확인

    if (error) {
      console.error('게시글 삭제 에러:', error);
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json<CommunityApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('게시글 삭제 에러:', error);
    return NextResponse.json<CommunityApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
