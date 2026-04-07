// 계정 탈퇴 API Route
// 서버사이드에서 Supabase Admin API를 사용하여 유저를 삭제합니다.
// 클라이언트에서는 admin.deleteUser()를 호출할 수 없으므로 서버 API를 거칩니다.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function DELETE() {
  // 현재 로그인된 유저를 확인합니다
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "인증되지 않은 요청입니다" },
      { status: 401 }
    );
  }

  // Service Role Key를 사용하여 Admin 클라이언트를 생성합니다
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 유저를 삭제합니다 (관련 데이터도 cascade 삭제)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("계정 삭제 실패:", error);
    return NextResponse.json(
      { error: "계정 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
