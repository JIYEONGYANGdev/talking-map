"use client";
import { useMemo, useState } from "react";
import Mascot from "@/components/Mascot";
import type { School } from "@/lib/types";

const DISTRICTS = ["전체", "옥정", "회천", "기존시가지"] as const;

/** 첫 실행·학교 바꾸기: 권역 칩 + 검색 + 큰 버튼 목록 */
export default function SchoolPicker({ schools, onPick, title = "우리 아이 학교를 골라 주세요", onClose }: { schools: School[]; onPick: (id: string) => void; title?: string; onClose?: () => void }) {
  const [q, setQ] = useState("");
  const [d, setD] = useState<(typeof DISTRICTS)[number]>("전체");
  const list = useMemo(
    () => schools.filter((s) => (d === "전체" || s.district === d) && (!q.trim() || s.name.includes(q.trim()))),
    [schools, d, q],
  );
  return (
    <div className="flex flex-col gap-4 px-5 pt-5 pb-8 min-h-screen">
      <div className="flex items-center gap-3">
        <Mascot size={56} />
        <div className="flex-1">
          <h1 className="text-xl font-bold leading-snug">{title}</h1>
          <p className="text-sm text-muted">양주시 초등학교 {schools.length}곳. 나중에 바꿀 수 있어요.</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="닫기" className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        )}
      </div>
      <label className="relative block">
        <span className="sr-only">학교 이름 검색</span>
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="학교 이름 검색" className="w-full h-12 rounded-2xl bg-white border border-line pl-11 pr-4 text-base outline-none focus:border-brand" />
      </label>
      <div className="flex gap-2 flex-wrap">
        {DISTRICTS.map((x) => (
          <button key={x} type="button" onClick={() => setD(x)} className={`h-9 px-4 rounded-full text-sm font-medium border ${d === x ? "bg-ink text-white border-ink" : "bg-white border-line text-ink"}`}>
            {x}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {list.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onPick(s.id)} className="w-full h-14 px-4 rounded-2xl bg-white border border-line flex items-center justify-between text-left active:bg-ground-deep">
              <span className="font-bold">{s.name}</span>
              <span className="text-xs text-muted">{s.district}{s.sample ? " · 시연" : ""}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-muted px-1">검색 결과가 없어요.</li>}
      </ul>
    </div>
  );
}
