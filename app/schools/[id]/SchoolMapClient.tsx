"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MapSignal } from "@/components/SchoolMap";
import { rememberSchool } from "@/lib/local";
import { MARKER_LABEL } from "@/lib/geo";
import type { Accident, School, Zone } from "@/lib/types";

const SchoolMap = dynamic(() => import("@/components/SchoolMap"), { ssr: false });

type Data = { school: School; radiusM: number; signals: MapSignal[]; reviewing: number; zones: Zone[]; accidents: Accident[] };

const PILL: Record<string, string> = {
  priority: "bg-priority-soft text-priority-ink",
  inprogress: "bg-progress-soft text-progress-ink",
  resolved: "bg-done-soft text-done-ink",
};

/** 지도 탭: 지도 위에 학교 칩·신고 버튼·범례, 아래에 신호 목록 시트 */
export default function SchoolMapClient({ school, schools }: { school: School; schools: { id: string; name: string }[] }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    rememberSchool(school.id);
    let alive = true;
    fetch(`/api/schools/${school.id}/signals`)
      .then((r) => r.json())
      .then((d: Data) => {
        if (alive) setData(d);
      });
    return () => {
      alive = false;
    };
  }, [school.id]);

  const counts = { priority: 0, inprogress: 0, resolved: 0 };
  data?.signals.forEach((s) => counts[s.kind]++);
  const month = new Date().toISOString().slice(0, 7);

  return (
    <div className="flex flex-col">
      <div className="relative">
        {data ? (
          <SchoolMap center={{ lat: school.lat, lng: school.lng, name: school.name }} radiusM={data.radiusM} signals={data.signals} zones={data.zones} accidents={data.accidents ?? []} height={440} />
        ) : (
          <div className="h-[440px] bg-ground-deep animate-pulse" />
        )}

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between pointer-events-none" style={{ zIndex: 1000 }}>
          <label className="pointer-events-auto relative h-10 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center pl-3 pr-8">
            <svg className="shrink-0 text-brand" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>
            <span className="sr-only">학교 바꾸기</span>
            <select value={school.id} onChange={(e) => router.push(`/schools/${e.target.value}`)} className="appearance-none bg-transparent pl-1.5 text-[15px] font-bold outline-none max-w-[200px] truncate">
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <svg className="absolute right-3 pointer-events-none text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </label>
          <Link href={`/report?school=${school.id}`} aria-label="신고하기" className="pointer-events-auto w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center shadow-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></svg>
          </Link>
        </div>

        <div className="absolute left-4 right-4 top-[68px] flex flex-wrap gap-1.5 pointer-events-none" style={{ zIndex: 1000 }}>
          <Chip dot="bg-priority" label={`점검 우선 ${counts.priority}`} bold />
          <Chip dot="bg-progress" label={`처리 중 ${counts.inprogress}`} bold />
          <Chip dot="bg-done" label={`고쳐짐 ${counts.resolved}`} bold />
          <Chip dot="bg-zone border border-zone-ink" label="보호구역" />
          <Chip dot="border-[1.5px] border-dashed border-priority" label="사고다발" />
        </div>
      </div>

      <div className="relative -mt-6 bg-white rounded-t-[24px] shadow-[0_-6px_20px_rgba(0,0,0,0.08)] px-5 pt-2.5 pb-4 flex flex-col gap-3" style={{ zIndex: 1001 }}>
        <div className="w-10 h-1 rounded-full bg-line self-center" />
        <div className="flex items-baseline justify-between">
          <h1 className="font-bold text-[15px]">{school.name} 주변 신호 {data ? data.signals.length : "…"}건</h1>
          {data && data.reviewing > 0 && <span className="text-xs text-muted">검토 중 {data.reviewing}건은 미표시</span>}
        </div>

        {data && (
          <div className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${data.accidents.length ? "bg-priority-soft text-priority-ink" : "bg-ground text-ink"}`}>
            {data.accidents.length ? (
              <>어린이 사고다발지역 <b>{data.accidents.length}곳</b>이 이 학교 반경 안에 있어요(도로교통공단, 최근 집계).</>
            ) : (
              <><b>이 학교 주변은 아직 사고다발지역 지도에 없어요.</b> <span className="text-muted">안전하다는 뜻이 아니라 기록이 쌓이기 전이라는 뜻이에요. 신고가 첫 신호입니다.</span></>
            )}
          </div>
        )}

        {data && data.signals.length > 0 && (
          <ul className="divide-y divide-line">
            {data.signals.map((s) => (
              <li key={s.id} className="py-2.5 flex items-center gap-3">
                <span className={`shrink-0 h-6 px-2 rounded-full text-[11px] font-bold inline-flex items-center ${PILL[s.kind]}`}>{MARKER_LABEL[s.kind]}</span>
                <span className="text-[13px] leading-snug"><span className="text-muted">{s.category} · </span>{s.summary}</span>
              </li>
            ))}
          </ul>
        )}
        {data && data.signals.length === 0 && <p className="text-sm text-muted">아직 확정된 신호가 없어요. 첫 신고가 지도의 첫 점이 됩니다.</p>}

        <div className="flex gap-2 pt-1">
          <Link href={`/report?school=${school.id}`} className="flex-1 h-12 rounded-2xl bg-brand text-white font-bold flex items-center justify-center active:bg-brand-dark">이 학교 주변 신고하기</Link>
          <Link href={`/schools/${school.id}/reports/${month}`} className="h-12 px-4 rounded-2xl bg-white border border-line font-bold flex items-center justify-center">이번 달 리포트</Link>
        </div>
      </div>
    </div>
  );
}

function Chip({ dot, label, bold }: { dot: string; label: string; bold?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white text-xs shadow-[0_1px_4px_rgba(0,0,0,0.1)] ${bold ? "font-bold text-ink" : "font-medium text-muted"}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
