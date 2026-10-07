"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CATEGORIES, type Agency, type School, type Signal, type Status } from "@/lib/types";

const SchoolMap = dynamic(() => import("@/components/SchoolMap"), { ssr: false });

/** 학교도 좌표도 없을 때 지도 중심(양주시청 부근) */
const YANGJU_CENTER = { lat: 37.7853, lng: 127.0459 };

type Row = Signal & { schoolName: string | null; agencyName: string | null; maskedText: string; rawAddress: string | null; receivedAt: string | null };

const TABS: { key: Status | "all"; label: string }[] = [
  { key: "ai_proposed", label: "AI 제안 대기" },
  { key: "received", label: "AI 실패·직접 검토" },
  { key: "confirmed", label: "처리 중" },
  { key: "resolved", label: "고쳐짐" },
  { key: "all", label: "전체" },
];

export default function AdminBoard({ schools, agencies }: { schools: School[]; agencies: Agency[] }) {
  const [tab, setTab] = useState<Status | "all">("ai_proposed");
  const [all, setAll] = useState<Row[]>([]);
  const [version, setVersion] = useState(0); // 올리면 다시 불러온다
  const [busy, setBusy] = useState<string | null>(null);
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  // 목록은 서버에서 한 번 받아 두고, 탭 필터는 렌더 시 계산한다
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/signals")
      .then((r) => r.json())
      .then((data: Row[]) => {
        if (alive) setAll(data);
      });
    return () => {
      alive = false;
    };
  }, [version]);
  const rows = tab === "all" ? all : all.filter((s) => s.status === tab);
  const reload = () => setVersion((v) => v + 1);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    await fetch(`/api/admin/signals/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setBusy(null);
    reload();
  }

  async function generateReport(schoolId: string) {
    setReportMsg("리포트 생성 중…");
    const month = new Date().toISOString().slice(0, 7);
    const r = await fetch("/api/admin/reports/generate", { method: "POST", body: JSON.stringify({ schoolId, month }) });
    setReportMsg(r.ok ? `생성됨 → /schools/${schoolId}/reports/${month}` : "실패");
  }

  // 상단 지표 3개
  const confirmedAll = all.filter((s) => s.status === "confirmed" || s.status === "resolved");
  const resolvedRate = confirmedAll.length ? Math.round((all.filter((s) => s.status === "resolved").length / confirmedAll.length) * 100) : 0;
  const leadTimes = confirmedAll.filter((s) => s.confirmedAt && s.receivedAt).map((s) => (Date.parse(s.confirmedAt!) - Date.parse(s.receivedAt!)) / 3600000);
  const medianLead = leadTimes.length ? leadTimes.sort((a, b) => a - b)[Math.floor(leadTimes.length / 2)] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">학교별 점검표</h1>
        <button onClick={async () => { await fetch("/api/admin/login", { method: "DELETE" }); location.reload(); }} className="text-xs text-zinc-500">
          나가기
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <Kpi n={medianLead == null ? "—" : `${medianLead < 1 ? "<1" : Math.round(medianLead)}h`} label="신고→첫 조치 중앙값" />
        <Kpi n={`${resolvedRate}%`} label="처리 완료율" />
        <Kpi n={String(all.filter((s) => s.status === "ai_proposed").length)} label="대기 중" />
      </div>

      <div className="flex gap-1 flex-wrap text-xs">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-full border ${tab === t.key ? "bg-zinc-900 text-white border-zinc-900" : "bg-white"}`}>
            {t.label}
            <span className="ml-1 opacity-60">{t.key === "all" ? all.length : all.filter((s) => s.status === t.key).length}</span>
          </button>
        ))}
      </div>

      <div className="text-xs text-zinc-500 flex gap-2 items-center flex-wrap">
        월간 리포트 생성(시연):
        {schools.map((s) => (
          <button key={s.id} onClick={() => generateReport(s.id)} className="underline">
            {s.name}
          </button>
        ))}
        {reportMsg && <span className="text-blue-700">{reportMsg}</span>}
      </div>

      <ul className="space-y-3">
        {rows.length === 0 && <li className="text-sm text-zinc-500">해당 상태의 신호가 없습니다.</li>}
        {rows.map((s) => (
          <li key={s.id} className="bg-white rounded-xl border border-zinc-200 p-4 text-sm space-y-2">
            <div className="flex justify-between text-xs text-zinc-500 gap-2">
              <span className="flex items-center gap-2 flex-wrap">
                {s.receivedAt ? new Date(s.receivedAt).toLocaleString("ko-KR") : ""} · 위치 확신 {s.locationConfidence}
                {s.locationConfidence === "low" && (
                  <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 font-medium">위치 확인 필요</span>
                )}
              </span>
              <span className="rounded px-1.5 bg-zinc-100 self-start">{s.status}</span>
            </div>
            <blockquote className="border-l-2 pl-3 text-zinc-700 whitespace-pre-wrap">{s.maskedText}</blockquote>
            {s.rawAddress && <div className="text-xs text-zinc-500">주소: {s.rawAddress}</div>}
            <div className="text-zinc-800">
              <span className="font-medium">AI 요약</span> {s.aiSummary}
              <div className="text-xs text-zinc-500 mt-0.5">{s.aiReason}</div>
              {s.legalBasis && <div className="text-xs text-zinc-500">근거: {s.legalBasis}</div>}
            </div>
            <LocationFix signal={s} schools={schools} busy={busy === s.id} onSave={(p) => patch(s.id, p)} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select defaultValue={s.schoolId ?? ""} onChange={(e) => patch(s.id, { schoolId: e.target.value || null })} className="border rounded-lg px-2 py-1 text-xs">
                <option value="">학교 미정</option>
                {schools.map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
              <select defaultValue={s.category} onChange={(e) => patch(s.id, { category: e.target.value })} className="border rounded-lg px-2 py-1 text-xs">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select defaultValue={s.agencyId ?? ""} onChange={(e) => patch(s.id, { agencyId: e.target.value || null })} className="border rounded-lg px-2 py-1 text-xs">
                <option value="">기관 미정</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(s.status === "ai_proposed" || s.status === "received") && (
                <Btn onClick={() => patch(s.id, { action: "confirm" })} busy={busy === s.id} primary>확정 (지도에 표시)</Btn>
              )}
              {s.status === "confirmed" && <Btn onClick={() => patch(s.id, { action: "resolve" })} busy={busy === s.id} primary>고쳐짐 처리</Btn>}
              {s.status !== "dismissed" && s.status !== "resolved" && (
                <Btn onClick={() => patch(s.id, { action: "dismiss" })} busy={busy === s.id}>해당 없음</Btn>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 좌표 보정: 작은 지도를 펼쳐 클릭으로 위치를 찍고 PATCH { lat, lng } 로 저장한다.
 * 저장되면 서버가 locationConfidence 를 high 로 올린다.
 * 지도는 펼쳤을 때만 그린다(카드가 많을 때 Leaflet 인스턴스 폭증 방지).
 */
function LocationFix({ signal: s, schools, busy, onSave }: { signal: Row; schools: School[]; busy: boolean; onSave: (p: { lat: number; lng: number }) => void }) {
  const [open, setOpen] = useState(s.locationConfidence === "low");
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null);
  const school = schools.find((x) => x.id === s.schoolId);
  const center = s.lat != null && s.lng != null
    ? { lat: s.lat, lng: s.lng, name: school?.name ?? "신고 위치" }
    : school
      ? { lat: school.lat, lng: school.lng, name: school.name }
      : { ...YANGJU_CENTER, name: "양주시" };
  const moved = picked && (picked.lat !== s.lat || picked.lng !== s.lng);
  return (
    <div className="text-xs space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => setOpen((v) => !v)} className="underline text-zinc-600">
          {open ? "지도 접기" : "지도에서 위치 보정"}
        </button>
        <span className="text-zinc-500">
          {s.lat != null && s.lng != null ? `현재 ${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}` : "좌표 없음 — 지도에서 찍어 주세요"}
        </span>
        {moved && (
          <>
            <button type="button" disabled={busy} onClick={() => onSave(picked!)} className="rounded-lg px-2 py-1 border bg-amber-500 text-white border-amber-500 disabled:opacity-50">
              이 위치로 저장
            </button>
            <button type="button" onClick={() => setPicked(s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null)} className="text-zinc-500 underline">
              되돌리기
            </button>
          </>
        )}
      </div>
      {open && (
        <>
          <SchoolMap center={center} radiusM={300} onPick={setPicked} picked={picked} height={220} />
          <div className="text-zinc-500">지도를 클릭하면 빨간 점이 옮겨집니다. 저장하면 학부모 지도에 그 위치로 표시됩니다.</div>
        </>
      )}
    </div>
  );
}

function Kpi({ n, label }: { n: string; label: string }) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 py-2">
      <div className="text-xl font-semibold">{n}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
function Btn({ children, onClick, busy, primary }: { children: React.ReactNode; onClick: () => void; busy?: boolean; primary?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} className={`rounded-lg px-3 py-1.5 text-xs border ${primary ? "bg-blue-600 text-white border-blue-600" : "bg-white"} disabled:opacity-50`}>
      {children}
    </button>
  );
}
