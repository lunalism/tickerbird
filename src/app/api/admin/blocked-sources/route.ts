// 차단 언론사 관리 API Route
// admin_settings 테이블에서 blocked_news_sources를 조회/수정합니다.
// service_role 키를 사용하여 RLS를 우회합니다.

import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/auth";

const SETTINGS_KEY = "blocked_news_sources";

// service_role 클라이언트 생성
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: 차단 언론사 목록 조회
export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return Response.json({ error: "권한 없음" }, { status: 403 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .single();

  if (error) {
    return Response.json({ sources: [] });
  }

  // jsonb 컬럼은 Supabase JS가 이미 파싱된 상태로 반환합니다
  const sources = Array.isArray(data.value) ? data.value : [];
  return Response.json({ sources });
}

// PUT: 차단 언론사 목록 업데이트
export async function PUT(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return Response.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await request.json();
  const sources: string[] = body.sources;

  if (!Array.isArray(sources)) {
    return Response.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("admin_settings")
    .upsert(
      { key: SETTINGS_KEY, value: sources as unknown as string },
      { onConflict: "key" }
    );

  if (error) {
    console.error("차단 언론사 업데이트 실패:", error);
    return Response.json({ error: "저장 실패" }, { status: 500 });
  }

  return Response.json({ success: true, sources });
}
