"use client";
import { useEffect, useMemo } from "react";
import type { School } from "@/lib/types";

const CITY = "양주시";

/**
 * 홈 우측 상단 지역 표시를 누르면 뜨는 바텀시트.
 * 현재 서비스 지역(양주시)과 그 안의 동네(법정동·읍·면) 칩을 보여주고, 동네를 고르면 그 동네 학교 목록으로 넘어간다.
 * 서비스는 양주시 한 곳이라 도시를 고르는 기능은 없고, 확대 가능성만 문구로 알린다.
 */
export default function RegionSheet({ schools, current, onPickDong, onClose }: { schools: School[]; current?: string; onPickDong: (dong: string) => void; onClose: () => void }) {
  // 학교가 있는 동네만, 학교 수가 많은 순 → 이름순
  const dongs = useMemo(() => {
    const n = new Map<string, number>();
    for (const s of schools) if (s.dong) n.set(s.dong, (n.get(s.dong) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")).map(([dong, count]) => ({ dong, count }));
  }, [schools]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[1500] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="서비스 지역">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div className="relative w-full max-w-[430px] max-h-[85dvh] overflow-y-auto overscroll-contain bg-white rounded-t-2xl px-5 pb-8">
        <div className="sticky top-0 bg-white pt-2.5 pb-3">
          <div className="mx-auto w-10 h-1 rounded-full bg-line-strong" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>
            </span>
            <div>
              <div className="text-xs text-muted">현재 지역</div>
              <div className="text-[18px] font-bold leading-tight">경기도 {CITY}</div>
            </div>
          </div>
          <span className="h-7 px-2.5 rounded-full bg-done-soft text-done-ink text-xs font-bold flex items-center">서비스 중</span>
        </div>

        <h2 className="mt-5 mb-2.5 font-bold">동네로 학교 찾기</h2>
        <div className="grid grid-cols-3 gap-2">
          {dongs.map(({ dong, count }) => {
            const on = dong === current;
            return (
              <button
                key={dong}
                type="button"
                onClick={() => onPickDong(dong)}
                aria-label={`${dong} 초등학교 ${count}곳 보기`}
                aria-current={on ? "true" : undefined}
                className={`h-11 rounded-full text-sm font-medium border flex items-center justify-center gap-1 active:bg-ground-deep ${on ? "bg-ink text-white border-ink" : "bg-white border-line text-ink"}`}
              >
                {dong}
                <span className={`text-[11px] ${on ? "text-white/70" : "text-muted"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-xs text-muted">동네를 누르면 그 동네 초등학교만 골라서 보여 드려요.</p>

        <div className="mt-5 rounded-xl bg-ground px-4 py-3.5 text-[13px] text-muted leading-relaxed">
          현재는 <span className="font-bold text-ink">{CITY}에서만</span> 서비스하고 있어요. 학교·보호구역 자료가 전국 표준데이터로 들어오기 때문에, 추후 다른 지역까지 확대할 수 있어요.
        </div>
      </div>
    </div>
  );
}
