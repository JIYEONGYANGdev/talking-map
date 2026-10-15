"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Mascot from "@/components/Mascot";
import ReportPanel from "./ReportPanel";
import { CATEGORIES, type Agency, type School, type Signal, type Status } from "@/lib/types";

const SchoolMap = dynamic(() => import("@/components/SchoolMap"), { ssr: false });

/** 시연 중 실수 방지: false 면 카드의 "삭제"가 보이기만 하고 눌리지 않는다(API 는 그대로 열려 있어 curl 로는 가능). docs/decisions.md 2026-10-16 */
const DELETE_ENABLED = false;

/** 학교도 좌표도 없을 때 지도 중심(양주시청 부근) */
const YANGJU_CENTER = { lat: 37.7853, lng: 127.0459 };

type Row = Signal & { schoolName: string | null; agencyName: string | null; maskedText: string; rawAddress: string | null; receivedAt: string | null; hasPhoto?: boolean };

const TABS: { key: Status | "all"; label: string }[] = [
  { key: "ai_proposed", label: "AI 제안 대기" },
  { key: "received", label: "직접 검토" },
  { key: "confirmed", label: "처리 중" },
  { key: "resolved", label: "고쳐짐" },
  { key: "dismissed", label: "해당 없음" },
  { key: "all", label: "전체" },
];

const STATUS_PILL: Record<Status, { label: string; cls: string }> = {
  ai_proposed: { label: "AI 제안", cls: "bg-review-soft text-muted" },
  received: { label: "AI 실패 · 직접 검토", cls: "bg-priority-soft text-priority-ink" },
  confirmed: { label: "처리 중", cls: "bg-progress-soft text-progress-ink" },
  resolved: { label: "고쳐짐", cls: "bg-done-soft text-done-ink" },
  dismissed: { label: "해당 없음", cls: "bg-review-soft text-muted" },
};

/**
 * 공무원 점검표 (데스크톱 기준).
 * 위: 지표 4개 → 도구 줄(상태 탭·학교·검색) → 월간 리포트 패널(학교를 고르면 펼침) → 신호 카드(사진 | 내용·AI 정리 | 조치).
 * 신호 쓰기는 PATCH/DELETE /api/admin/signals/:id, 리포트는 app/admin/ReportPanel.tsx 와 /admin/reports/:school/:month.
 */
export default function AdminBoard({ schools, agencies }: { schools: School[]; agencies: Agency[] }) {
  const [tab, setTab] = useState<Status | "all">("ai_proposed");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [q, setQ] = useState("");
  const [all, setAll] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/signals")
      .then((r) => r.json())
      .then((data: Row[]) => {
        if (alive) {
          setAll(data);
          setLoaded(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [version]);
  const reload = () => setVersion((v) => v + 1);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    await fetch(`/api/admin/signals/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setBusy(null);
    reload();
  }

  /** 신호 삭제: 신고 글·사진까지 지우고 되돌릴 수 없어 확인창을 한 번 거친다 (시연 데이터·오접수 정리용) */
  async function remove(s: Row) {
    const head = (s.maskedText || s.aiSummary || "").slice(0, 40);
    if (!window.confirm(`이 신고를 삭제할까요?\n"${head}"\n\n신고 글·사진이 함께 지워지고 되돌릴 수 없습니다.`)) return;
    setBusy(s.id);
    const r = await fetch(`/api/admin/signals/${s.id}`, { method: "DELETE" });
    setBusy(null);
    if (!r.ok) window.alert("삭제하지 못했어요. 다시 시도해 주세요.");
    reload();
  }

  const rows = useMemo(() => {
    const kw = q.trim();
    return all
      .filter((s) => (tab === "all" || s.status === tab) && (!schoolFilter || s.schoolId === schoolFilter) && (!kw || `${s.maskedText} ${s.aiSummary} ${s.schoolName ?? ""} ${s.category}`.includes(kw)))
      // 사진이 있는 신고를 맨 위에. 같은 그룹 안에서는 서버 정렬(최신순) 유지 (sort 는 안정 정렬)
      .sort((a, b) => Number(Boolean(b.hasPhoto)) - Number(Boolean(a.hasPhoto)));
  }, [all, tab, schoolFilter, q]);

  // 지표
  const waiting = all.filter((s) => s.status === "ai_proposed" || s.status === "received").length;
  const inProgress = all.filter((s) => s.status === "confirmed").length;
  const month = new Date().toISOString().slice(0, 7);
  const resolvedThisMonth = all.filter((s) => s.status === "resolved" && (s.resolvedAt ?? "").startsWith(month)).length;
  const confirmedAll = all.filter((s) => s.status === "confirmed" || s.status === "resolved");
  const leadTimes = confirmedAll.filter((s) => s.confirmedAt && s.receivedAt).map((s) => (Date.parse(s.confirmedAt!) - Date.parse(s.receivedAt!)) / 3600000).sort((a, b) => a - b);
  const medianLead = leadTimes.length ? leadTimes[Math.floor(leadTimes.length / 2)] : null;
  const leadLabel = medianLead == null ? "—" : medianLead < 1 ? "1시간 이내" : medianLead < 48 ? `${Math.round(medianLead)}시간` : `${Math.round(medianLead / 24)}일`;
  const count = (k: Status | "all") => (k === "all" ? all.length : all.filter((s) => s.status === k).length);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">학교별 점검표</h1>
          <p className="text-sm text-muted mt-1">AI가 정리한 신고를 확인해 확정하면 학부모 지도에 표시됩니다. 위험 여부 판단과 현장 확인은 담당자가 합니다.</p>
        </div>
        <button type="button" onClick={async () => { await fetch("/api/admin/login", { method: "DELETE" }); location.reload(); }} className="h-9 px-3 rounded-lg border border-line bg-white text-sm text-muted hover:text-ink">
          나가기
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi n={String(waiting)} label="확인 대기" hint="AI 제안 + 직접 검토" accent={waiting > 0 ? "text-priority-ink" : ""} />
        <Kpi n={String(inProgress)} label="처리 중" hint="기관에 전달됨" accent="text-progress-ink" />
        <Kpi n={String(resolvedThisMonth)} label="이달 고쳐짐" hint={`${Number(month.slice(5))}월`} accent="text-done-ink" />
        <Kpi n={leadLabel} label="신고 → 첫 조치" hint="중앙값" />
      </div>

      <div className="bg-white border border-line rounded-xl p-3 flex flex-col gap-3">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`h-9 px-3 rounded-lg text-sm font-medium flex items-center gap-1.5 ${tab === t.key ? "bg-ink text-white" : "bg-ground text-ink hover:bg-ground-deep"}`}>
              {t.label}
              <span className={`text-xs ${tab === t.key ? "text-white/70" : "text-muted"}`}>{count(t.key)}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} className={`h-9 rounded-lg border bg-white px-2.5 text-sm min-w-[180px] ${schoolFilter ? "border-brand font-medium" : "border-line"}`}>
            <option value="">모든 학교</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <label className="relative flex-1 min-w-[200px]">
            <span className="sr-only">신고 내용 검색</span>
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="내용·요약·학교·종류 검색" className="h-9 w-full rounded-lg border border-line bg-white pl-8 pr-3 text-sm outline-none focus:border-brand" />
          </label>
          {schoolFilter && <span className="text-xs text-faint">이 학교 신고 {all.filter((s) => s.schoolId === schoolFilter).length}건</span>}
        </div>
      </div>

      <ReportPanel schools={schools} schoolId={schoolFilter} rows={all} />

      {!loaded && <div className="h-40 rounded-xl bg-white border border-line animate-pulse" />}
      {loaded && rows.length === 0 && (
        <div className="bg-white border border-line rounded-xl p-10 flex flex-col items-center text-center gap-2">
          <Mascot size={56} mood="progress" />
          <div className="font-bold">이 조건의 신고가 없어요</div>
          <p className="text-sm text-muted">탭이나 학교 필터를 바꿔 보세요.</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map((s) => (
          <li key={s.id} className="bg-white border border-line rounded-xl">
            <div className="px-5 py-3 border-b border-line flex items-center gap-3 flex-wrap text-xs text-muted">
              <span className={`h-6 px-2 rounded-md text-xs font-bold inline-flex items-center ${STATUS_PILL[s.status].cls}`}>{STATUS_PILL[s.status].label}</span>
              <span>{s.receivedAt ? new Date(s.receivedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</span>
              <span className="font-medium text-ink">{s.schoolName ?? "학교 미정"}</span>
              <span>위치 확신 <b className={s.locationConfidence === "high" ? "text-done-ink" : s.locationConfidence === "mid" ? "text-ink" : "text-priority-ink"}>{s.locationConfidence}</b></span>
              {s.locationConfidence === "low" && <span className="h-6 px-2 rounded-md bg-priority-soft text-priority-ink font-bold inline-flex items-center">위치 확인 필요</span>}
              <span className="ml-auto font-mono text-[11px] text-faint">{s.id.slice(0, 8)}</span>
            </div>

            <div className="p-5 grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)_280px]">
              <div className="w-28 shrink-0">
                {s.hasPhoto ? <Photo reportId={s.reportId} /> : <div className="w-28 h-28 rounded-lg bg-ground border border-line flex items-center justify-center text-faint text-xs">사진 없음</div>}
              </div>

              <div className="flex flex-col gap-3 min-w-0">
                <blockquote className="text-[15px] leading-relaxed border-l-2 border-line-strong pl-3 whitespace-pre-wrap">{s.maskedText}</blockquote>
                {s.rawAddress && <div className="text-xs text-muted">신고자 주소: {s.rawAddress}</div>}
                <div className="rounded-lg bg-ground px-3.5 py-3 text-sm flex flex-col gap-1.5">
                  <div><span className="text-xs font-bold text-brand-dark mr-2">AI 요약</span>{s.aiSummary}</div>
                  <div className="text-xs text-muted leading-relaxed">{s.aiReason}</div>
                  {s.legalBasis && <div className="text-xs text-muted">근거 · {s.legalBasis}</div>}
                </div>
                <LocationFix signal={s} schools={schools} busy={busy === s.id} onSave={(p) => patch(s.id, p)} />
              </div>

              <div className="flex flex-col gap-2">
                <Field label="학교">
                  <select defaultValue={s.schoolId ?? ""} onChange={(e) => patch(s.id, { schoolId: e.target.value || null })} className="h-9 w-full rounded-lg border border-line bg-white px-2 text-sm">
                    <option value="">학교 미정</option>
                    {schools.map((x) => (
                      <option key={x.id} value={x.id}>{x.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="종류">
                  <select defaultValue={s.category} onChange={(e) => patch(s.id, { category: e.target.value })} className="h-9 w-full rounded-lg border border-line bg-white px-2 text-sm">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="담당 기관">
                  <select defaultValue={s.agencyId ?? ""} onChange={(e) => patch(s.id, { agencyId: e.target.value || null })} className="h-9 w-full rounded-lg border border-line bg-white px-2 text-sm">
                    <option value="">기관 미정</option>
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </Field>
                <div className="flex flex-col gap-2 pt-1">
                  {(s.status === "ai_proposed" || s.status === "received") && (
                    <Btn onClick={() => patch(s.id, { action: "confirm" })} busy={busy === s.id} primary>확정 — 지도에 표시</Btn>
                  )}
                  {s.status === "confirmed" && <Btn onClick={() => patch(s.id, { action: "resolve" })} busy={busy === s.id} primary tone="done">고쳐짐 처리</Btn>}
                  {s.status !== "dismissed" && s.status !== "resolved" && <Btn onClick={() => patch(s.id, { action: "dismiss" })} busy={busy === s.id}>해당 없음</Btn>}
                  {(s.status === "dismissed" || s.status === "resolved") && <Btn onClick={() => patch(s.id, { action: "confirm" })} busy={busy === s.id}>다시 처리 중으로</Btn>}
                  <button type="button" onClick={() => remove(s)} disabled={!DELETE_ENABLED || busy === s.id} title={DELETE_ENABLED ? undefined : "시연 중에는 꺼 두었어요"} className="mt-1 self-end text-xs text-muted underline underline-offset-2 hover:text-danger disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed">
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 좌표 보정: 작은 지도를 펼쳐 클릭으로 위치를 찍고 PATCH { lat, lng } 로 저장한다. low 는 자동으로 펼친다. */
function LocationFix({ signal: s, schools, busy, onSave }: { signal: Row; schools: School[]; busy: boolean; onSave: (p: { lat: number; lng: number }) => void }) {
  const [open, setOpen] = useState(s.locationConfidence === "low");
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null);
  const school = schools.find((x) => x.id === s.schoolId);
  const center = s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng, name: school?.name ?? "신고 위치" } : school ? { lat: school.lat, lng: school.lng, name: school.name } : { ...YANGJU_CENTER, name: "양주시" };
  const moved = picked && (picked.lat !== s.lat || picked.lng !== s.lng);
  return (
    <div className="text-xs flex flex-col gap-1.5">
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-brand-dark font-medium underline-offset-2 hover:underline">
          {open ? "지도 접기" : "지도에서 위치 보정"}
        </button>
        <span className="text-muted">{s.lat != null && s.lng != null ? `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}` : "좌표 없음 — 지도에서 찍어 주세요"}</span>
        {moved && (
          <>
            <button type="button" disabled={busy} onClick={() => onSave(picked!)} className="h-7 px-2.5 rounded-md bg-priority text-white font-bold disabled:opacity-50">이 위치로 저장</button>
            <button type="button" onClick={() => setPicked(s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null)} className="text-muted underline">되돌리기</button>
          </>
        )}
      </div>
      {open && (
        <div className="rounded-lg overflow-hidden border border-line">
          <SchoolMap center={center} radiusM={300} onPick={setPicked} picked={picked} height={240} />
        </div>
      )}
    </div>
  );
}

/** 접수 사진 썸네일. 클릭하면 크게. 공무원 전용 API 라 시민 화면엔 없다. */
function Photo({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  const src = `/api/admin/reports/${reportId}/photo`;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-28 h-28 rounded-lg overflow-hidden border border-line bg-ground block" title="사진 크게 보기">
        {/* eslint-disable-next-line @next/next/no-img-element -- 인증 쿠키가 필요한 내부 API 이미지 */}
        <img src={src} alt="접수 사진" className="w-full h-full object-cover" loading="lazy" />
      </button>
      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-6 cursor-zoom-out">
          {/* eslint-disable-next-line @next/next/no-img-element -- 인증 쿠키가 필요한 내부 API 이미지 */}
          <img src={src} alt="접수 사진 크게 보기" className="max-h-full max-w-full rounded-lg shadow-xl" />
        </div>
      )}
    </>
  );
}

function Kpi({ n, label, hint, accent }: { n: string; label: string; hint?: string; accent?: string }) {
  return (
    <div className="bg-white border border-line rounded-xl px-4 py-3.5">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-2xl font-bold mt-0.5 ${accent ?? ""}`}>{n}</div>
      {hint && <div className="text-[11px] text-faint mt-0.5">{hint}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-muted">{label}</span>
      {children}
    </label>
  );
}

function Btn({ children, onClick, busy, primary, tone }: { children: React.ReactNode; onClick: () => void; busy?: boolean; primary?: boolean; tone?: "done" }) {
  const cls = primary ? (tone === "done" ? "bg-done text-white hover:opacity-90" : "bg-brand text-white hover:bg-brand-dark") : "bg-white border border-line text-ink hover:bg-ground";
  return (
    <button type="button" onClick={onClick} disabled={busy} className={`h-10 rounded-lg px-3 text-sm font-bold disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  );
}
