import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const noto = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-noto", display: "swap" });

export const metadata: Metadata = {
  title: "말하는 지도, 우리 아이 등굣길",
  description: "사고가 쌓이기 전에 학부모 신호로 먼저 고치는 통학로 지도 (양주시 프로토타입)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#eef5f1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`h-full antialiased ${noto.variable}`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
