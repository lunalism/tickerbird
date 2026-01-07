/**
 * 게시글 좋아요 API
 *
 * POST /api/community/posts/[id]/like - 좋아요 토글
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CommunityApiResponse } from '@/types/community';

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
      .select('id, likes_count')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json<CommunityApiResponse<null>>(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이미 좋아요 했는지 확인
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    let liked: boolean;

    if (existingLike) {
      // 좋아요 취소
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('좋아요 취소 에러:', deleteError);
        return NextResponse.json<CommunityApiResponse<null>>(
          { success: false, error: '좋아요 취소에 실패했습니다.' },
          { status: 500 }
        );
      }
      liked = false;
    } else {
      // 좋아요 추가
      const { error: insertError } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (insertError) {
        console.error('좋아요 추가 에러:', insertError);
        return NextResponse.json<CommunityApiResponse<null>>(
          { success: false, error: '좋아요에 실패했습니다.' },
          { status: 500 }
        );
      }
      liked = true;
    }

    // 업데이트된 좋아요 수 조회
    const { data: updatedPost } = await supabase
      .from('posts')
      .select('likes_count')
      .eq('id', postId)
      .single();

    return NextResponse.json<CommunityApiResponse<LikeResponse>>({
      success: true,
      data: {
        liked,
        likesCount: updatedPost?.likes_count ?? post.likes_count,
      },
    });
  } catch (error) {
    console.error('좋아요 처리 에러:', error);
    return NextResponse.json<CommunityApiResponse<null>>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
