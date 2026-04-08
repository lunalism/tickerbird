// 관리자 사용자 관리 API Route
// profiles + auth.users를 조인하여 유저 목록을 반환합니다.
// service_role 키를 사용하여 auth.users에 접근합니다.

import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/auth";

// service_role 클라이언트 생성
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: 유저 목록 조회 (페이지네이션 + 검색)
export async function GET(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return Response.json({ error: "권한 없음" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const search = url.searchParams.get("search") ?? "";
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const supabase = getAdminClient();

  // profiles 조회 (검색 + 페이지네이션)
  let query = supabase
    .from("profiles")
    .select("id, display_name, avatar_url, is_admin, tier, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  // 닉네임 검색
  if (search) {
    query = query.ilike("display_name", `%${search}%`);
  }

  const { data: profiles, count, error } = await query;

  if (error) {
    console.error("유저 목록 조회 실패:", error);
    return Response.json({ error: "조회 실패" }, { status: 500 });
  }

  // auth.users에서 이메일 가져오기
  const {
    data: { users: authUsers },
  } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  // auth 유저 이메일 맵 생성
  const emailMap = new Map<string, string>();
  for (const authUser of authUsers) {
    emailMap.set(authUser.id, authUser.email ?? "");
  }

  // profiles + email 결합
  const users = (profiles ?? []).map((profile) => ({
    ...profile,
    email: emailMap.get(profile.id) ?? "",
  }));

  // 이메일 검색 시 클라이언트 사이드 필터 (display_name ilike로 못 찾은 경우)
  let filteredUsers = users;
  if (search && filteredUsers.length === 0) {
    // 전체 profiles에서 이메일 기준 재검색
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, is_admin, tier, created_at")
      .order("created_at", { ascending: false });

    filteredUsers = (allProfiles ?? [])
      .map((profile) => ({
        ...profile,
        email: emailMap.get(profile.id) ?? "",
      }))
      .filter((u) => u.email.toLowerCase().includes(search.toLowerCase()))
      .slice(offset, offset + perPage);
  }

  return Response.json({
    users: filteredUsers,
    total: count ?? 0,
    page,
    perPage,
  });
}

// PATCH: 유저 등급 변경
export async function PATCH(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return Response.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, tier } = body;

  if (!userId || !["free", "premium"].includes(tier)) {
    return Response.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ tier })
    .eq("id", userId);

  if (error) {
    console.error("유저 등급 변경 실패:", error);
    return Response.json({ error: "변경 실패" }, { status: 500 });
  }

  return Response.json({ success: true });
}
