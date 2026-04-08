// 커뮤니티 게시글 상세 API Route
// GET: 게시글 상세 조회 (조회수 증가)
// PATCH: 게시글 수정 (본인만 가능)
// DELETE: 게시글 삭제 (본인 또는 관리자)

import { createClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/auth";
import type {
  Post,
  PostWithAuthor,
  CommunityAuthor,
} from "@/types/community";

/** 작성자 정보를 포함해 조회할 컬럼 목록 */
const POST_SELECT_WITH_AUTHOR = `
  id, user_id, category, title, content, related_ticker,
  view_count, like_count, comment_count, is_pinned, is_deleted,
  created_at, updated_at,
  author:profiles!user_id(id, display_name, avatar_url)
`;

/** Supabase 조인 결과의 author 필드 정규화 */
function normalizeAuthor(
  author: CommunityAuthor | CommunityAuthor[] | null
): CommunityAuthor {
  if (Array.isArray(author)) {
    return author[0] ?? { id: "", display_name: null, avatar_url: null };
  }
  return author ?? { id: "", display_name: null, avatar_url: null };
}

type PostJoinRow = Post & {
  author: CommunityAuthor | CommunityAuthor[] | null;
};

// GET /api/posts/[id] - 게시글 상세 조회
// 쿼리 파라미터 no_view=true를 전달하면 조회수 증가를 건너뜁니다.
// (수정 페이지처럼 단순 조회 목적일 때 view_count 오염 방지용)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const skipViewCount =
    new URL(request.url).searchParams.get("no_view") === "true";
  const supabase = await createClient();

  // 게시글 조회 (작성자 정보 포함, 삭제되지 않은 것만)
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT_WITH_AUTHOR)
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (error || !data) {
    return Response.json(
      { error: "게시글을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const row = data as unknown as PostJoinRow;

  // 조회수 증가 (no_view=true 인 경우 건너뜀, 실패해도 응답에는 영향 없음)
  let nextViewCount = row.view_count;
  if (!skipViewCount) {
    nextViewCount = row.view_count + 1;
    const { error: updateError } = await supabase
      .from("posts")
      .update({ view_count: nextViewCount })
      .eq("id", id);

    if (updateError) {
      console.error("조회수 증가 실패:", updateError);
    }
  }

  const { author, ...rest } = row;
  const post: PostWithAuthor = {
    ...rest,
    view_count: nextViewCount,
    author: normalizeAuthor(author),
  };

  return Response.json({ post });
}

// PATCH /api/posts/[id] - 게시글 수정 (본인만)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  // 요청 본문 파싱
  let body: { title?: string; content?: string };
  try {
    body = (await request.json()) as { title?: string; content?: string };
  } catch {
    return Response.json(
      { error: "잘못된 요청 본문입니다" },
      { status: 400 }
    );
  }

  // 게시글 존재 및 작성자 확인
  const { data: existing, error: fetchError } = await supabase
    .from("posts")
    .select("user_id, is_deleted")
    .eq("id", id)
    .single();

  if (fetchError || !existing || existing.is_deleted) {
    return Response.json(
      { error: "게시글을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  // 본인 게시글만 수정 가능
  if (existing.user_id !== user.id) {
    return Response.json({ error: "수정 권한이 없습니다" }, { status: 403 });
  }

  // 업데이트 페이로드 구성 (전달된 필드만 검증 후 포함)
  const updates: { title?: string; content?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (title.length < 1 || title.length > 100) {
      return Response.json(
        { error: "제목은 1자 이상 100자 이하여야 합니다" },
        { status: 400 }
      );
    }
    updates.title = title;
  }

  if (body.content !== undefined) {
    const content = body.content.trim();
    if (content.length < 1 || content.length > 500) {
      return Response.json(
        { error: "본문은 1자 이상 500자 이하여야 합니다" },
        { status: 400 }
      );
    }
    updates.content = content;
  }

  // 변경 사항이 없으면 400
  if (updates.title === undefined && updates.content === undefined) {
    return Response.json(
      { error: "수정할 내용이 없습니다" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("게시글 수정 실패:", error);
    return Response.json({ error: "수정 실패" }, { status: 500 });
  }

  return Response.json({ post: data as Post });
}

// DELETE /api/posts/[id] - 게시글 삭제 (소프트 삭제, 본인 또는 관리자)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  // 게시글 존재 확인
  const { data: existing, error: fetchError } = await supabase
    .from("posts")
    .select("user_id, is_deleted")
    .eq("id", id)
    .single();

  if (fetchError || !existing || existing.is_deleted) {
    return Response.json(
      { error: "게시글을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  // 본인이 아니면 관리자 권한 확인
  if (existing.user_id !== user.id) {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return Response.json(
        { error: "삭제 권한이 없습니다" },
        { status: 403 }
      );
    }
  }

  // 소프트 삭제
  const { error } = await supabase
    .from("posts")
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("게시글 삭제 실패:", error);
    return Response.json({ error: "삭제 실패" }, { status: 500 });
  }

  return Response.json({ success: true });
}
