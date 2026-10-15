"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MonthlyReport } from "@/lib/db";
import { checkReport, monthLabel } from "@/lib/report";
import type { Status } from "@/lib/types";

type Detail = {
  report: (MonthlyReport & { status: "draft" | "published" }) | null;
  signals: { id: string; status: Status; category: string; aiSummary: string }[];
};

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
const PILL: Partial<Record<Status, { label: string; cls: string }>> = {
  resolved: { label: "고쳐짐", cls: "bg-done-soft text-done-ink" },
  confirmed: { label: "처리 중", cls: "bg-progress-soft text-progress-ink" },
  ai_proposed: { label: "확인 중", cls: "bg-review-soft text-muted" },
};

/**
 * AI 초안을 담당자가 읽고 고친 뒤 "학부모에게 공개". 공개 전에는 학부모 화면에 보이지 않는다(신고 카드의 '확정' 원칙을 리포트에도).
 * 오른쪽: 공개 전 자동 점검 3개(lib/report checkReport) + 리포트에 들어간 신호. 점검을 통과하지 못하면 공개 버튼이 잠긴다.
 */
export default function ReportEditor({ schoolId, schoolName, month }: { schoolId: string; schoolName: string; month: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [body, setBody] = useState("");
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const api = `/api/admin/reports/monthly/${schoolId}/${month}`;
  useEffect(() => {
    let alive = true;
    fetch(api)
      .then((r) => r.json())
      .then((d: Detail) => {
        if (!alive) return;
        setData(d);
        setBody(d.report?.body ?? "");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [api, version]);

  const report = data?.report ?? null;
  const dirty = Boolean(report) && body.trim() !== (report?.body ?? "").trim();
  const checks = useMemo(() => (report ? checkReport(body, report.total, report.resolved) : []), [body, report]);
  const allOk = checks.every((c) => c.ok);
  const published = report?.status === "published";
  const [y, m] = month.split("-");

  async function send(payload: Record<string, unknown>, label: string, done: string) {
    setBusy(label);
    setMsg(null);
    const r = await fetch(api, { method: "PATCH", body: JSON.stringify(payload) });
    setBusy(null);
    if (r.ok) {
      setMsg(done);
      setVersion((v) => v + 1);
    } else {
      const e = await r.json().catch(() => ({}));
      setMsg(e.error === "checks" ? "자동 점검을 통과하지 못해 공개하지 않았어요. 오른쪽 항목을 확인해 주세요." : "저장하지 못했어요. 다시 시도해 주세요.");
    }
  }
  async function regenerate() {
    if (dirty && !window.confirm("고친 내용이 사라지고 AI 초안을 새로 받아요. 계속할까요?")) return;
    if (published && !window.confirm("공개된 리포트예요. 새 초안을 받으면 공개 전 상태로 돌아가요. 계속할까요?")) return;
    setBusy("regen");
    setMsg(null);
    const r = await fetch("/api/admin/reports/generate", { method: "POST", body: JSON.stringify({ schoolId, month }) });
    setBusy(null);
    const d = r.ok ? ((await r.json()) as { fallback?: string | null }) : null;
    setMsg(!r.ok ? "초안을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요." : d?.fallback ? (d.fallback === "credits" ? "AI 크레딧이 소진되어 틀 초안을 만들었어요. 고쳐서 공개해 주세요." : "AI 응답을 받지 못해 틀 초안을 만들었어요. 고쳐서 공개해 주세요.") : "AI 초안을 새로 받았어요.");
    setVersion((v) => v + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-muted flex items-center gap-1.5">
            <Link href="/admin" className="text-brand-dark hover:underline">학교별 점검표</Link>
            <span>›</span>
            <span>{schoolName}</span>
            <span>›</span>
            <span>월간 리포트</span>
          </div>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-3 flex-wrap">
            {y}년 {Number(m)}월 리포트{published ? "" : " 초안"}
            {report && (
              <span className={`h-6 px-2.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5 ${published ? "bg-done-soft text-done-ink" : "bg-priority-soft text-priority-ink"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${published ? "bg-done" : "bg-priority"}`} />
                {published ? "공개됨" : "공개 전"}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted mt-1">AI가 쓴 초안입니다. 읽고 고친 뒤 공개하면 학부모 화면에 나갑니다. 공개 전에는 학부모에게 보이지 않습니다.</p>
        </div>
        <Link href="/admin" className="h-9 px-3 rounded-lg border border-line bg-white text-sm text-muted hover:text-ink flex items-center">점검표로</Link>
      </div>

      {!data && <div className="h-80 rounded-xl bg-white border border-line animate-pulse" />}
      {data && !report && (
        <div className="bg-white border border-line rounded-xl p-10 flex flex-col items-center text-center gap-3">
          <div className="font-bold">아직 이 달 초안이 없어요</div>
          <p className="text-sm text-muted">점검표에서 학교를 고르고 &ldquo;AI 초안 생성&rdquo;을 눌러 주세요. 들어갈 신호 {data.signals.length}건.</p>
          <button type="button" onClick={regenerate} disabled={busy === "regen" || data.signals.length === 0} className="h-10 px-4 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-dark disabled:opacity-50">
            {busy === "regen" ? "AI 초안 만드는 중…" : "AI 초안 생성"}
          </button>
        </div>
      )}

      {report && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
          <section className="bg-white border border-line rounded-xl flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-line flex items-center gap-3 flex-wrap text-xs text-muted">
              <span className="font-bold text-ink text-[13px]">본문</span>
              <span>AI 초안 {fmt(report.generatedAt)}</span>
              {(report.editCount ?? 0) > 0 && <span className="h-5 px-2 rounded-md bg-progress-soft text-progress-ink font-bold inline-flex items-center">담당자 수정 {report.editCount}곳</span>}
              {dirty && <span className="h-5 px-2 rounded-md bg-priority-soft text-priority-ink font-bold inline-flex items-center">저장 안 됨</span>}
              <Link href={`/schools/${schoolId}/reports/${month}`} target="_blank" className="ml-auto text-brand-dark hover:underline">학부모 화면 미리보기 →</Link>
            </div>
            <div className="p-6 flex flex-col gap-3.5">
              <div className="text-xs text-faint">학부모에게 보이는 제목</div>
              <div className="text-lg font-bold">{monthLabel(month)} 우리 학교 길 리포트</div>
              <div className="grid grid-cols-2 gap-2.5 max-w-[320px]">
                <div className="bg-ground rounded-xl px-3.5 py-3"><div className="text-[22px] font-bold leading-none">{report.total}</div><div className="text-[11px] text-muted mt-1">이번 달 신호</div></div>
                <div className="bg-ground rounded-xl px-3.5 py-3"><div className="text-[22px] font-bold leading-none text-done-ink">{report.resolved}</div><div className="text-[11px] text-muted mt-1">고쳐짐</div></div>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-faint">본문 (그 자리에서 고칠 수 있습니다)</span>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="w-full rounded-xl border border-line px-4 py-3.5 text-sm leading-[1.8] outline-none focus:border-brand resize-y" />
              </label>
            </div>
            <div className="px-5 py-3.5 border-t border-line flex items-center gap-2 flex-wrap">
              {!published ? (
                <button type="button" onClick={() => send({ body, action: "publish" }, "publish", "학부모에게 공개했어요.")} disabled={!allOk || Boolean(busy)} className="h-10 px-4 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-dark disabled:opacity-50">
                  {busy === "publish" ? "공개 중…" : "학부모에게 공개"}
                </button>
              ) : (
                <button type="button" onClick={() => send({ body }, "save", "수정 내용을 저장했어요.")} disabled={!dirty || !allOk || Boolean(busy)} className="h-10 px-4 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-dark disabled:opacity-50">
                  {busy === "save" ? "저장 중…" : "수정 내용 저장"}
                </button>
              )}
              {!published && (
                <button type="button" onClick={() => send({ body }, "save", "초안으로 저장했어요.")} disabled={!dirty || Boolean(busy)} className="h-10 px-3.5 rounded-lg border border-line bg-white text-[13px] font-medium hover:bg-ground disabled:opacity-50">
                  초안으로 저장
                </button>
              )}
              {published && (
                <button type="button" onClick={() => send({ action: "unpublish" }, "unpublish", "공개를 취소했어요. 학부모에게 보이지 않아요.")} disabled={Boolean(busy)} className="h-10 px-3.5 rounded-lg border border-line bg-white text-[13px] font-medium hover:bg-ground disabled:opacity-50">
                  공개 취소
                </button>
              )}
              <button type="button" onClick={regenerate} disabled={Boolean(busy)} className="h-10 px-3.5 rounded-lg border border-line bg-white text-[13px] font-medium hover:bg-ground disabled:opacity-50">
                {busy === "regen" ? "AI 초안 만드는 중…" : "AI 초안 다시 받기"}
              </button>
              <span className="ml-auto text-xs text-faint">{msg ?? (published ? `${report.publishedAt ? `공개 ${fmt(report.publishedAt)}` : "공개됨"} · 공개 취소로 되돌릴 수 있어요` : "공개하면 학부모 화면에 보여요 · 되돌리기 가능")}</span>
            </div>
          </section>

          <aside className="flex flex-col gap-3.5">
            <div className="bg-white border border-line rounded-xl px-4 py-3.5 flex flex-col gap-2.5">
              <div className="text-[13px] font-bold">공개 전 자동 점검</div>
              {checks.map((c) => (
                <div key={c.key} className="flex items-start gap-2 text-[13px]">
                  {c.ok ? (
                    <svg className="shrink-0 text-done" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>
                  ) : (
                    <svg className="shrink-0 text-priority" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></svg>
                  )}
                  <div>
                    {c.label} {c.detail && <span className="text-muted">{c.detail}</span>}
                  </div>
                </div>
              ))}
              <div className="text-[11px] text-faint">규칙은 prompts/v2 REPORT_SYSTEM 과 같습니다. 통과하지 못하면 공개 버튼이 잠깁니다.</div>
            </div>
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-line text-[13px] font-bold flex justify-between items-center">
                리포트에 들어간 신호 <span className="font-normal text-muted text-xs">{data?.signals.length ?? 0}건 · 직접 검토·해당 없음 제외</span>
              </div>
              <ul>
                {data?.signals.map((s) => (
                  <li key={s.id} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-ground-deep last:border-b-0 text-[13px]">
                    <span className={`h-5 px-1.5 rounded-md text-[11px] font-bold inline-flex items-center shrink-0 ${PILL[s.status]?.cls ?? "bg-review-soft text-muted"}`}>{PILL[s.status]?.label ?? s.status}</span>
                    <span className="truncate">{s.category} · {s.aiSummary}</span>
                  </li>
                ))}
                {data && data.signals.length === 0 && <li className="px-4 py-3 text-xs text-muted">이 달에 들어갈 신호가 없어요.</li>}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
