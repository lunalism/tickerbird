// 루트 페이지
// 비로그인 유저도 뉴스를 볼 수 있도록 /news로 리다이렉트합니다.

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/news");
}
