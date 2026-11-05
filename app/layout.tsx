import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "제9세계 캐릭터 아틀라스",
  description: "누메네라 캐릭터를 만들고 모험 기록을 관리하는 비공식 팬 제작 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
