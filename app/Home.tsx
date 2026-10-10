"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Mascot from "@/components/Mascot";
import SchoolPicker from "@/components/SchoolPicker";
import { useMyReports, useSchoolId } from "@/lib/local";
import type { School } from "@/lib/types";

type Summary = { signals: { kind: "priority" | "inprogress" | "resolved" }[]; reviewing: number; accidents: unknown[] };

export default function Home({ schools }: { schools: School[] }) {
  const [schoolId, setSchoolId, ready] = useSchoolId();
  const [picking, setPicking] = useState(false);
  // /?school=<id> 로 열면 그 학교를 기억하고 바로 대시보드를 보여준다 (공유 링크, 디자인 도구 가져오기용)
  const params = useSearchParams();
  const paramSchool = params.get("school");
  useEffect(() => {
    if (ready && paramSchool && paramSchool !== schoolId && schools.some((s) => s.id === paramSchool)) setSchoolId(paramSchool);
  }, [ready, paramSchool, schoolId, schools, setSchoolId]);
  const [sum, setSum] = useState<Summary | null>(null);
  const [myReports] = useMyReports();
  const school = schools.find((s) => s.id === schoolId) ?? null;
  const month = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (!school) return;
    let alive = true;
    fetch(`/api/schools/${school.id}/signals`)
      .then((r) => r.json())
      .then((d: Summary) => {
        if (alive) setSum(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [school]);

  if (!ready) return <div className="px-5 pt-5"><div className="h-40 rounded-2xl bg-white/60 animate-pulse" /></div>;
  if (!school || picking) {
    return (
      <SchoolPicker
        schools={schools}
        onPick={(id) => {
          setSchoolId(id);
          setSum(null);
          setPicking(false);
        }}
        onClose={school ? () => setPicking(false) : undefined}
        title={school ? "학교 바꾸기" : undefined}
      />
    );
  }

  const counts = { priority: 0, inprogress: 0, resolved: 0 };
  sum?.signals.forEach((s) => counts[s.kind]++);
  const noAccidents = sum ? sum.accidents.length === 0 : true;
  const short = school.name.replace(/초등학교(\(시연\))?$/, "초");

  return (
    <div className="flex flex-col gap-4 px-5 pt-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setPicking(true)} className="h-10 pl-3 pr-3.5 rounded-full bg-white border border-line flex items-center gap-1.5 text-[15px] font-bold">
          <svg className="text-brand" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>
          {school.name}
          <svg className="text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <div className="text-xs text-muted">{school.district} · 양주시</div>
      </div>

      <section className="bg-white border border-line rounded-2xl p-5 flex items-center gap-3.5">
        <Mascot size={64} mood={counts.priority > 0 ? "priority" : "default"} />
        <div className="flex flex-col gap-1.5">
          {noAccidents ? (
            <>
              <h1 className="text-[19px] font-bold leading-snug">{short} 주변은 아직<br />사고 지도에 없어요</h1>
              <p className="text-[13px] text-muted leading-relaxed">사고가 쌓이기 전에, 학부모의 신고가 첫 신호가 됩니다.</p>
            </>
          ) : (
            <>
              <h1 className="text-[19px] font-bold leading-snug">{short} 주변에<br />사고다발지역이 있어요</h1>
              <p className="text-[13px] text-muted leading-relaxed">도로교통공단 집계 {sum?.accidents.length}곳. 지도에서 붉은 점선 원으로 표시돼요.</p>
            </>
          )}
        </div>
      </section>

      <Link href={`/report?school=${school.id}`} className="h-[60px] rounded-xl bg-brand text-white font-bold text-[17px] flex items-center justify-center gap-2.5 shadow-sm active:bg-brand-dark">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></svg>
        사진 한 장으로 신고하기
      </Link>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">우리 학교 길, 지금</h2>
          <Link href={`/schools/${school.id}`} className="text-[13px] font-medium text-brand-dark">지도에서 보기</Link>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <Tile n={counts.priority} label="점검 우선" dot="bg-priority" ink="text-priority-ink" />
          <Tile n={counts.inprogress} label="처리 중" dot="bg-progress" ink="text-progress-ink" />
          <Tile n={counts.resolved} label="고쳐짐" dot="bg-done" ink="text-done-ink" />
        </div>
        <p className="text-xs text-muted px-1">
          {sum ? (sum.reviewing > 0 ? `검토 중 ${sum.reviewing}건은 공무원이 확인한 뒤 지도에 표시돼요.` : "검토 중인 신고는 공무원이 확인한 뒤 지도에 표시돼요.") : "불러오는 중…"}
        </p>
      </section>

      <Link href="/my" className="bg-white border border-line rounded-xl px-[18px] py-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-[15px]">내 신고</div>
          <div className="text-[13px] text-muted">{myReports.length ? `${myReports.length}건 보냈어요 · 진행 상황 보기` : "아직 보낸 신고가 없어요"}</div>
        </div>
        <svg className="text-muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
      </Link>

      <div className="bg-white border border-line rounded-xl px-[18px] py-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-[15px]">{Number(month.slice(5))}월 우리 학교 길 리포트</div>
          <div className="text-[13px] text-muted">{sum ? `신호 ${sum.signals.length + sum.reviewing}건 · 고쳐짐 ${counts.resolved}건` : "이달의 변화를 쉬운 말로"}</div>
        </div>
        <Link href={`/schools/${school.id}/reports/${month}`} className="h-10 px-4 rounded-full bg-ink text-white text-sm font-bold flex items-center">읽기</Link>
      </div>
    </div>
  );
}

function Tile({ n, label, dot, ink }: { n: number; label: string; dot: string; ink: string }) {
  return (
    <div className="bg-white border border-line rounded-xl py-3.5 px-3 flex flex-col items-center gap-1">
      <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
      <div className={`text-[26px] font-bold leading-none ${ink}`}>{n}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
