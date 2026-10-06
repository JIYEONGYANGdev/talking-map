import { getAgencies, getSchools, store } from "@/lib/db";
import { PUBLIC_STATUS } from "@/lib/types";

export const dynamic = "force-dynamic";

const STEPS = ["접수", "검토 중", "처리 중", "고쳐짐"];
const STEP_OF: Record<string, number> = { received: 0, ai_proposed: 1, confirmed: 2, resolved: 3, dismissed: 3 };

export default async function ProgressPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await store.getReportByToken(token);
  if (!report) return <div className="text-sm text-zinc-500">신고를 찾을 수 없습니다.</div>;
  const signal = await store.getSignalByReport(report.id);
  const [schools, agencies] = await Promise.all([getSchools(), getAgencies()]);
  const status = signal?.status ?? "received";
  const confirmed = status === "confirmed" || status === "resolved" || status === "dismissed";
  const school = schools.find((s) => s.id === signal?.schoolId)?.name ?? null;
  const agency = confirmed ? agencies.find((a) => a.id === signal?.agencyId)?.name ?? null : null;
  const step = STEP_OF[status] ?? 0;
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">내 신고 진행 상황</h1>
      <ol className="grid grid-cols-4 gap-1 text-center text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className={`rounded-lg py-2 ${i <= step ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-400"}`}>
            {i === 3 && status === "dismissed" ? "이상 없음" : s}
          </li>
        ))}
      </ol>
      <dl className="bg-white rounded-xl border border-zinc-200 p-4 text-sm grid grid-cols-[6rem_1fr] gap-y-2">
        <dt className="text-zinc-500">현재 상태</dt>
        <dd className="font-medium">{PUBLIC_STATUS[status]}</dd>
        <dt className="text-zinc-500">접수</dt>
        <dd>{new Date(report.receivedAt).toLocaleString("ko-KR")}</dd>
        <dt className="text-zinc-500">학교</dt>
        <dd>{school ?? "확인 중"}</dd>
        <dt className="text-zinc-500">종류</dt>
        <dd>{confirmed ? signal?.category : "공무원 확인 후 표시"}</dd>
        <dt className="text-zinc-500">담당 기관</dt>
        <dd>{agency ?? "공무원 확인 후 표시"}</dd>
        <dt className="text-zinc-500">마지막 갱신</dt>
        <dd>{new Date(signal?.updatedAt ?? report.receivedAt).toLocaleString("ko-KR")}</dd>
      </dl>
      <p className="text-xs text-zinc-500">공무원이 확정하기 전에는 &quot;검토 중&quot;으로만 보입니다. 위험 여부는 현장 확인 후 사람이 판단합니다.</p>
    </div>
  );
}
