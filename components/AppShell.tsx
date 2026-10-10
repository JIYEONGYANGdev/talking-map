"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 화면 틀. 학부모 화면은 모바일 폭(최대 430px) + 하단 탭 3개(홈·지도·내 신고),
 * 공무원 화면(/admin)은 넓은 폭 + 상단 바.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-line">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-bold">
              말하는 지도 <span className="text-muted font-normal text-sm">공무원 점검표</span>
            </Link>
            <Link href="/" className="text-sm text-muted">
              학부모 화면
            </Link>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-4">{children}</main>
      </div>
    );
  }

  const tab = pathname === "/" ? "home" : pathname.startsWith("/schools") ? "map" : pathname.startsWith("/my") || pathname.startsWith("/reports") ? "my" : "none";
  const hideTab = pathname.startsWith("/report") && !pathname.startsWith("/reports"); // 신고 중에는 탭을 숨겨 한 가지 일에 집중

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col bg-mint">
        <main className={`flex-1 flex flex-col ${hideTab ? "" : "pb-24"}`}>{children}</main>
        {!hideTab && <BottomTab active={tab} />}
      </div>
    </div>
  );
}

function BottomTab({ active }: { active: string }) {
  const items: { key: string; href: string; label: string; icon: React.ReactNode }[] = [
    {
      key: "home",
      href: "/",
      label: "홈",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 11 12 3l9 8" />
          <path d="M5 10v10h5v-6h4v6h5V10" />
        </svg>
      ),
    },
    {
      key: "map",
      href: "/schools",
      label: "지도",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
          <path d="M9 4v14M15 6v14" />
        </svg>
      ),
    },
    {
      key: "my",
      href: "/my",
      label: "내 신고",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 6h13M8 12h13M8 18h13" />
          <path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" />
        </svg>
      ),
    },
  ];
  return (
    <nav aria-label="주요 메뉴" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[84px] bg-white border-t border-line grid grid-cols-3 px-2 pt-2 pb-5 z-40">
      {items.map((it) => {
        const on = it.key === active;
        return (
          <Link
            key={it.key}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-1 text-xs ${on ? "text-brand font-bold" : "text-muted font-medium"}`}
          >
            {it.icon}
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
