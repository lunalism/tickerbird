import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider, ToastProvider, AuthProvider, PriceAlertProvider } from "@/components/providers";
import { OfflineIndicator } from "@/components/common";

export const metadata: Metadata = {
  title: "AlphaBoard - 글로벌 투자 정보 플랫폼",
  description: "실시간 글로벌 투자 정보와 분석을 제공하는 플랫폼",
};

// iOS Safari safe area support
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
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
          <AuthProvider>
            <PriceAlertProvider>
              <ToastProvider />
              <OfflineIndicator />
              {children}
            </PriceAlertProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
