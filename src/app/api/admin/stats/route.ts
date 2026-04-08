// 관리자 통계 API Route
// 유저, 기사, 트럼프 게시물 등 전체 통계를 반환합니다.

import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/auth";

// service_role 클라이언트 생성
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return Response.json({ error: "권한 없음" }, { status: 403 });
  }

  const supabase = getAdminClient();

  // 모든 통계를 병렬로 조회
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [
    totalUsersRes,
    premiumUsersRes,
    freeUsersRes,
    todaySignupsRes,
    totalArticlesRes,
    krArticlesRes,
    usArticlesRes,
    trumpPostsRes,
    cnbcRes,
    marketWatchRes,
    investingRes,
    nasdaqRes,
    naverRes,
  ] = await Promise.all([
    // 유저 통계
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("tier", "premium"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("tier", "free"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
    // 기사 통계
    supabase.from("articles").select("*", { count: "exact", head: true }),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("country", "KR"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("country", "US"),
    // 트럼프 게시물
    supabase.from("trump_posts").select("*", { count: "exact", head: true }),
    // 소스별 기사수
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("source_name", "CNBC"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("source_name", "MarketWatch"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("source_name", "Investing.com"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("source_name", "Nasdaq"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("source_name", "네이버"),
  ]);

  return Response.json({
    totalUsers: totalUsersRes.count ?? 0,
    premiumUsers: premiumUsersRes.count ?? 0,
    freeUsers: freeUsersRes.count ?? 0,
    todaySignups: todaySignupsRes.count ?? 0,
    totalArticles: totalArticlesRes.count ?? 0,
    krArticles: krArticlesRes.count ?? 0,
    usArticles: usArticlesRes.count ?? 0,
    trumpPosts: trumpPostsRes.count ?? 0,
    sourceStats: {
      CNBC: cnbcRes.count ?? 0,
      MarketWatch: marketWatchRes.count ?? 0,
      "Investing.com": investingRes.count ?? 0,
      Nasdaq: nasdaqRes.count ?? 0,
      "네이버": naverRes.count ?? 0,
    },
  });
}
