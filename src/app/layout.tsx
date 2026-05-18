import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "투전 (Tujeon) — 조선 전통 카드 놀이",
  description:
    "투전은 조선 후기에 성행했던 한국의 전통 카드 게임입니다. 40장의 패로 돌려대기, 가구, 수투전 등 다양한 게임 모드를 즐겨보세요.",
  keywords: ["투전", "Tujeon", "한국 전통 게임", "카드 게임", "돌려대기"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700;900&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full"
        style={{
          background: 'var(--tujeon-bg-deep)',
          color: 'var(--tujeon-cream)',
        }}
      >
        {children}
      </body>
    </html>
  );
}
