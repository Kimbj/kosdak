import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "히든 시세",
  description: "국내 상장사 시세를 몰래 확인하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}
