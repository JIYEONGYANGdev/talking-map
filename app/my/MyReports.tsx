"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Mascot from "@/components/Mascot";
import ProgressBar, { type PublicStatus } from "@/components/ProgressBar";
import { useMyReports } from "@/lib/local";

type Status = { status: PublicStatus; statusLabel: string; school: string | null; category: string | null; agency: string | null; receivedAt: string; resolvedAt: string | null };

/** 내 신고: 이 기기에서 보낸 신고의 진행 상황. 로그인 없이 토큰으로 조회. */
export default function MyReports() {
  const [list, , ready] = useMyReports();
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  useEffect(() => {
    let alive = true;
    list.forEach((r) => {
      fetch(`/api/reports/${r.token}`)
        .then((x) => (x.ok ? x.json() : null))
        .then((d: Status | null) => {
          if (alive && d) setStatuses((prev) => ({ ...prev, [r.token]: d }));
        })
        .catch(() => {});
    });
    return () => {
      alive = false;
    };
  }, [list]);

  if (!ready) return <div className="px-5 pt-5"><div className="h-40 rounded-2xl bg-white/60 animate-pulse" /></div>;

  return (
    <div className="flex flex-col gap-3.5 px-5 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold">내 신고</h1>
        <span className="text-[13px] text-muted">{list.length}건</span>
      </div>

      {list.length === 0 && (
        <div className="bg-white border border-line rounded-2xl p-6 flex flex-col items-center text-center gap-3">
          <Mascot size={64} />
          <div className="font-bold">아직 보낸 신고가 없어요</div>
          <p className="text-sm text-muted leading-relaxed">사진 한 장과 한 줄이면 됩니다. 보낸 신고는 여기서 고쳐질 때까지 따라갈 수 있어요.</p>
          <Link href="/report" className="h-12 px-6 rounded-2xl bg-brand text-white font-bold flex items-center">신고하러 가기</Link>
        </div>
      )}

      {list.map((r) => {
        const s = statuses[r.token];
        return (
          <Link key={r.token} href={`/reports/${r.token}`} className="bg-white rounded-2xl px-[18px] py-4 flex flex-col gap-3.5 border border-transparent active:border-line">
            <div className="flex items-start justify-between gap-2.5">
              <div>
                <div className="text-xs text-muted">{new Date(r.at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}{s?.school ? ` · ${s.school}` : ""}</div>
                <div className="text-[15px] font-bold leading-snug mt-1">{r.text}</div>
              </div>
              {s && <StatusPill status={s.status} label={s.statusLabel} />}
            </div>
            <ProgressBar status={s?.status ?? "received"} />
            {s && (s.status === "confirmed" || s.status === "resolved") && (
              <div className="grid grid-cols-[5rem_1fr] gap-x-2.5 gap-y-1 text-[13px]">
                <div className="text-muted">종류</div><div className="font-medium">{s.category}</div>
                <div className="text-muted">담당 기관</div><div className="font-medium">{s.agency}</div>
              </div>
            )}
            {s && (s.status === "ai_proposed" || s.status === "received") && (
              <div className="text-[13px] text-muted leading-relaxed bg-ground rounded-lg px-3 py-2.5">AI가 종류와 담당 기관을 정리했어요. 공무원이 확인하면 종류·기관이 보이고 지도에 표시돼요.</div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function StatusPill({ status, label }: { status: PublicStatus; label: string }) {
  const cls =
    status === "resolved" ? "bg-done-soft text-done-ink" : status === "confirmed" ? "bg-progress-soft text-progress-ink" : status === "dismissed" ? "bg-review-soft text-muted" : "bg-review-soft text-muted";
  return <span className={`shrink-0 h-[26px] px-2.5 rounded-full text-xs font-bold inline-flex items-center ${cls}`}>{label}</span>;
}
