// 차단 언론사 관리 페이지

import type { Metadata } from "next";
import BlockedSourcesClient from "./BlockedSourcesClient";

export const metadata: Metadata = {
  title: "차단 언론사 관리",
  robots: { index: false, follow: false },
};

export default function BlockedSourcesPage() {
  return <BlockedSourcesClient />;
}
