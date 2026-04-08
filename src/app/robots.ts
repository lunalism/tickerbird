// 검색엔진 크롤링 규칙 (robots.txt)
// /robots.txt 경로로 자동 제공됩니다.

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/news", "/community", "/calendar", "/reports"],
        disallow: [
          "/admin",
          "/admin/",
          "/profile",
          "/settings",
          "/notifications",
          "/api/",
        ],
      },
    ],
    sitemap: "https://tickerbird.me/sitemap.xml",
  };
}
