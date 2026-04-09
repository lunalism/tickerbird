// 특정 게시글의 댓글 목록 API Route
// GET: 최상위 댓글 목록 조회 (대댓글 제외, 작성자 정보 포함)

import { createClient } from "@/lib/supabase/server";
import type {
  Comment,
  CommentWithAuthor,
  CommunityAuthor,
} from "@/types/community";

/** 작성자 정보를 포함해 조회할 컬럼 목록 */
const COMMENT_SELECT_WITH_AUTHOR = `
  id, post_id, user_id, parent_id, content, like_count, is_deleted,
  created_at, updated_at,
  author:profiles!user_id(id, display_name, avatar)
`;

/** Supabase 조인 결과의 author 필드 정규화 (배열/단일/null 대응) */
function normalizeAuthor(
  author: CommunityAuthor | CommunityAuthor[] | null
): CommunityAuthor {
  if (Array.isArray(author)) {
    return author[0] ?? { id: "", display_name: null, avatar: null };
  }
  return author ?? { id: "", display_name: null, avatar: null };
}

/** 조인 결과 행 타입 */
type CommentJoinRow = Comment & {
  author: CommunityAuthor | CommunityAuthor[] | null;
};

// GET /api/posts/[id]/comments - 게시글의 최상위 댓글 목록 조회
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();

  // 삭제되지 않은 최상위 댓글만 (parent_id IS NULL), 작성순 정렬
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_SELECT_WITH_AUTHOR)
    .eq("post_id", postId)
    .eq("is_deleted", false)
    .is("parent_id", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("댓글 목록 조회 실패:", error);
    return Response.json({ error: "조회 실패" }, { status: 500 });
  }

  const comments: CommentWithAuthor[] = (data ?? []).map((row) => {
    const { author, ...rest } = row as unknown as CommentJoinRow;
    return { ...rest, author: normalizeAuthor(author) };
  });

  return Response.json({ comments });
}
