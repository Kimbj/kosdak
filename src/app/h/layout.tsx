import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "일일 업무 현황",
  description: "사내 인트라넷",
};

export default function HLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
