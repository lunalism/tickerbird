import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, ToastProvider } from "@/components/providers";
import { OfflineIndicator } from "@/components/common";

export const metadata: Metadata = {
  title: "AlphaBoard - 글로벌 투자 정보 플랫폼",
  description: "실시간 글로벌 투자 정보와 분석을 제공하는 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <ToastProvider />
          <OfflineIndicator />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
