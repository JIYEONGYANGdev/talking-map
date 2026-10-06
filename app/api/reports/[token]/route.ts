import { getAgencies, getSchools, store } from "@/lib/db";
import { PUBLIC_STATUS } from "@/lib/types";

/** 학부모 진행 확인: 토큰 소지자에게 그 신고 하나의 상태만 */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const report = await store.getReportByToken(token);
  if (!report) return Response.json({ error: "not found" }, { status: 404 });
  const signal = await store.getSignalByReport(report.id);
  const [schools, agencies] = await Promise.all([getSchools(), getAgencies()]);
  const school = schools.find((s) => s.id === signal?.schoolId);
  const agency = agencies.find((a) => a.id === signal?.agencyId);
  const status = signal?.status ?? "received";
  const confirmed = status === "confirmed" || status === "resolved" || status === "dismissed";
  return Response.json({
    receivedAt: report.receivedAt,
    status,
    statusLabel: PUBLIC_STATUS[status],
    school: school ? school.name : null,
    category: confirmed ? signal?.category : null, // 확정 전엔 종류도 숨김
    agency: confirmed ? agency?.name ?? null : null,
    updatedAt: signal?.updatedAt ?? report.receivedAt,
    resolvedAt: signal?.resolvedAt ?? null,
  });
}
