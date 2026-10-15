"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MonthlyReport } from "@/lib/db";
import { inReport, monthLabel, prevMonth } from "@/lib/report";
import type { School, Status } from "@/lib/types";

type Summary = Omit<MonthlyReport, "body">;
type RowLite = { schoolId: string | null; status: Status; updatedAt: string };

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
const thisMonth = () => new Date().toISOString().slice(0, 7);
/** 이번 달부터 거꾸로 6달 */
const monthOptions = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
};

/**
 * 월간 리포트 패널 (시안 10 개선안 A).
 * 학교 필터를 고르면 그 학교의 리포트 상태(미생성 → 초안 → 공개)와 들어갈 신호 수를 보여 주고, 버튼은 상태에 맞춰 하나만.
 * "모든 학교"일 때는 한 줄 요약으로 접힌다. 생성은 POST /api/admin/reports/generate, 확인·공개는 /admin/reports/:school/:month.
 */
export default function ReportPanel({ schools, schoolId, rows }: { schools: School[]; schoolId: string; rows: RowLite[] }) {
  const [month, setMonth] = useState(thisMonth);
  const [reports, setReports] = useState<Summary[] | null>(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/reports/monthly")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Summary[]) => {
        if (alive) setReports(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [version]);

  const school = schools.find((s) => s.id === schoolId) ?? null;
  const report = reports?.find((r) => r.schoolId === schoolId && r.month === month) ?? null;
  const prev = prevMonth(month);
  const prevReport = reports?.find((r) => r.schoolId === schoolId && r.month === prev) ?? null;

  const counts = useMemo(() => {
    const mine = rows.filter((s) => s.schoolId === schoolId && inReport(s, month));
    return {
      total: mine.length,
      inProgress: mine.filter((s) => s.status === "confirmed").length,
      resolved: mine.filter((s) => s.status === "resolved").length,
      reviewing: mine.filter((s) => s.status === "ai_proposed").length,
    };
  }, [rows, schoolId, month]);

  async function generate() {
    if (!school) return;
    if (report?.status === "published" && !window.confirm("이미 공개된 리포트예요. 다시 생성하면 공개 전 초안으로 돌아가고, 담당자가 다시 공개해야 학부모에게 보여요. 계속할까요?")) return;
    setBusy(true);
    setError(null);
    const r = await fetch("/api/admin/reports/generate", { method: "POST", body: JSON.stringify({ schoolId: school.id, month }) });
    setBusy(false);
    if (!r.ok) setError("초안을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    setVersion((v) => v + 1);
  }

  // 모든 학교: 한 줄 요약
  if (!school) {
    const m = thisMonth();
    const list = (reports ?? []).filter((r) => r.month === m);
    const drafts = list.filter((r) => r.status === "draft").length;
    const published = list.filter((r) => r.status !== "draft").length;
    return (
      <div className="bg-white border border-line rounded-xl px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <span className="flex items-center gap-2 shrink-0">
          <DocIcon />
          <span className="font-bold">{Number(m.slice(5))}월 리포트</span>
        </span>
        {reports ? (
          <span className="text-muted whitespace-nowrap">초안 <b className="text-priority-ink">{drafts}</b> · 공개 <b className="text-done-ink">{published}</b> · 미생성 <b className="text-ink">{Math.max(schools.length - drafts - published, 0)}</b></span>
        ) : (
          <span className="text-muted">불러오는 중…</span>
        )}
        <span className="basis-full sm:basis-auto sm:ml-auto text-xs text-faint leading-relaxed">학교를 고르면 그 학교 리포트를 만들고 공개할 수 있어요</span>
      </div>
    );
  }

  const editorHref = `/admin/reports/${school.id}/${month}`;
  const badge = !report ? { cls: "bg-review-soft text-muted", dot: "bg-faint", label: "아직 만들지 않음" } : report.status === "draft" ? { cls: "bg-priority-soft text-priority-ink", dot: "bg-priority", label: "초안 — 공개 전" } : { cls: "bg-done-soft text-done-ink", dot: "bg-done", label: "공개됨" };

  return (
    <div className="bg-white border border-line-strong rounded-xl px-4 sm:px-5 py-4 grid gap-4 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_300px] items-center">
      <div className="flex flex-col gap-2.5 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <DocIcon />
          <span className="text-[15px] font-bold">{school.name} 월간 리포트</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="h-[30px] rounded-lg border border-line bg-white px-2 text-[13px] font-medium" aria-label="리포트 월">
            {monthOptions().map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <span className={`h-6 px-2.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5 ${badge.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>
        <div className="flex gap-x-4 gap-y-1 flex-wrap text-[13px] text-muted">
          <span>리포트에 들어갈 신호 <b className="text-ink">{counts.total}건</b></span>
          <span>처리 중 <b className="text-progress-ink">{counts.inProgress}</b></span>
          <span>고쳐짐 <b className="text-done-ink">{counts.resolved}</b></span>
          <span>확인 중 <b className="text-ink">{counts.reviewing}</b></span>
          <span className="text-faint">· 직접 검토·해당 없음은 들어가지 않습니다</span>
        </div>
        <div className="text-xs text-muted flex gap-3.5 flex-wrap items-center">
          {report ? (
            <span>
              AI 초안 생성 <b className="text-ink">{fmt(report.generatedAt)}</b>
              {report.status === "published" ? <> · <b className="text-done-ink">공개됨{report.publishedAt ? ` ${fmt(report.publishedAt)}` : ""}</b></> : report.editCount ? <> · 담당자 수정 {report.editCount}곳</> : <> · 담당자 확인 전</>}
            </span>
          ) : (
            <span>신호가 쌓인 뒤 AI 초안을 만들고, 담당자가 읽고 고친 다음 공개합니다.</span>
          )}
          {prevReport ? (
            <Link href={`/admin/reports/${school.id}/${prev}`} className="font-medium text-brand-dark hover:underline">
              지난달 {Number(prev.slice(5))}월 리포트 ({prevReport.status === "draft" ? "초안" : `공개됨 ${new Date(prevReport.publishedAt ?? prevReport.generatedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}`})
            </Link>
          ) : (
            <span className="text-faint">지난달 {Number(prev.slice(5))}월 리포트 없음</span>
          )}
        </div>
        {error && <div className="text-xs text-danger">{error}</div>}
      </div>
      <div className="flex flex-col gap-2">
        {!report && (
          <button type="button" onClick={generate} disabled={busy || counts.total === 0} className="h-10 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-dark disabled:opacity-50">
            {busy ? "AI 초안 만드는 중…" : "AI 초안 생성"}
          </button>
        )}
        {report && (
          <Link href={editorHref} className="h-10 rounded-lg bg-brand text-white text-sm font-bold flex items-center justify-center hover:bg-brand-dark">
            {report.status === "draft" ? "초안 확인하고 공개" : "리포트 보기·수정"}
          </Link>
        )}
        {report && (
          <button type="button" onClick={generate} disabled={busy} className="h-9 rounded-lg border border-line bg-white text-[13px] font-medium hover:bg-ground disabled:opacity-50">
            {busy ? "AI 초안 만드는 중…" : "다시 생성"}
          </button>
        )}
        {!report && counts.total === 0 && <span className="text-[11px] text-faint text-center">이 달에 들어갈 신호가 없어요</span>}
      </div>
    </div>
  );
}

function DocIcon() {
  return (
    <svg className="text-brand-dark shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h9l5 5v13H6z" /><path d="M14 3v6h6" /><path d="M9 13h7M9 17h7" />
    </svg>
  );
}
