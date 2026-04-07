// 알림 페이지 (준비 중)

import type { Metadata } from "next";

// 알림 페이지 탭 제목
export const metadata: Metadata = {
  title: "알림",
};

export default function NotificationsPage() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <p className="text-lg text-muted-foreground">알림 페이지 - 준비 중</p>
    </div>
  );
}
