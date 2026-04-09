// 커뮤니티 게시글 API Route
// GET: 게시글 목록 조회 (페이지네이션 + 카테고리 필터)
// POST: 게시글 작성 (인증 필요)

import { createClient } from "@/lib/supabase/server";
import type {
  Post,
  PostWithAuthor,
  CommunityAuthor,
  CreatePostInput,
} from "@/types/community";

/** 작성자 정보를 포함해 조회할 컬럼 목록 */
const POST_SELECT_WITH_AUTHOR = `
  id, user_id, category, title, content, related_ticker,
  view_count, like_count, comment_count, is_pinned, is_deleted,
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

/** 조인 결과 행을 PostWithAuthor 형태로 변환 */
type PostJoinRow = Post & {
  author: CommunityAuthor | CommunityAuthor[] | null;
};

function toPostWithAuthor(row: PostJoinRow): PostWithAuthor {
  const { author, ...rest } = row;
  return { ...rest, author: normalizeAuthor(author) };
}

// GET /api/posts - 게시글 목록 조회
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.max(
    1,
    Math.min(100, parseInt(url.searchParams.get("limit") ?? "20", 10))
  );
  const category = url.searchParams.get("category");
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  // 기본 쿼리: 삭제되지 않은 게시글, 고정 글 우선, 최신순
  let query = supabase
    .from("posts")
    .select(POST_SELECT_WITH_AUTHOR, { count: "exact" })
    .eq("is_deleted", false)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // 카테고리 필터 (선택)
  if (category) {
    query = query.eq("category", category);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("게시글 목록 조회 실패:", error);
    return Response.json({ error: "조회 실패" }, { status: 500 });
  }

  const posts: PostWithAuthor[] = (data ?? []).map((row) =>
    toPostWithAuthor(row as unknown as PostJoinRow)
  );

  return Response.json({
    posts,
    total: count ?? 0,
    page,
  });
}

// POST /api/posts - 게시글 작성
export async function POST(request: Request) {
  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  // 요청 본문 파싱
  let body: Partial<CreatePostInput>;
  try {
    body = (await request.json()) as Partial<CreatePostInput>;
  } catch {
    return Response.json(
      { error: "잘못된 요청 본문입니다" },
      { status: 400 }
    );
  }

  const title = (body.title ?? "").trim();
  const content = (body.content ?? "").trim();
  // 카테고리는 선택값이며 미지정 시 'free'로 기본 설정
  const category = (body.category ?? "free").trim();

  // 유효성 검사: 제목 1~100자
  if (title.length < 1 || title.length > 100) {
    return Response.json(
      { error: "제목은 1자 이상 100자 이하여야 합니다" },
      { status: 400 }
    );
  }

  // 유효성 검사: 본문 1~500자
  if (content.length < 1 || content.length > 500) {
    return Response.json(
      { error: "본문은 1자 이상 500자 이하여야 합니다" },
      { status: 400 }
    );
  }

  // 게시글 삽입
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      title,
      content,
      category,
    })
    .select("*")
    .single();

  if (error) {
    console.error("게시글 작성 실패:", error);
    return Response.json({ error: "작성 실패" }, { status: 500 });
  }

  return Response.json({ post: data as Post }, { status: 201 });
}
