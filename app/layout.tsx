import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "말하는 지도, 우리 아이 등굣길",
  description: "사고가 쌓이기 전에 학부모 신호로 먼저 고치는 통학로 지도 (양주시 프로토타입)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="bg-white border-b border-zinc-200">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold">
              말하는 지도 <span className="text-zinc-500 font-normal text-sm">우리 아이 등굣길</span>
            </Link>
            <nav className="text-sm flex gap-4">
              <Link href="/report" className="text-blue-700">
                신고하기
              </Link>
              <Link href="/admin" className="text-zinc-500">
                공무원
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-4">{children}</main>
        <footer className="text-xs text-zinc-500 text-center py-4">
          양주시 미래인재 AI 공모전 프로토타입 · 팀 지제가 · 시연용 모의 데이터 포함
        </footer>
      </body>
    </html>
  );
}
