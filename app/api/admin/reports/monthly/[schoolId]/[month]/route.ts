import { isAdmin } from "@/lib/auth";
import { getSchools, store } from "@/lib/db";
import { checkReport } from "@/lib/report";
import { reportSignals } from "@/lib/report-server";

type Ctx = { params: Promise<{ schoolId: string; month: string }> };

/** 리포트 한 건 + 들어간 신호 목록 (초안 확인 화면용) */
export async function GET(_req: Request, ctx: Ctx) {
  if (!(await isAdmin())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { schoolId, month } = await ctx.params;
  const school = (await getSchools()).find((s) => s.id === schoolId);
  if (!school) return Response.json({ error: "school not found" }, { status: 404 });
  const [report, signals] = await Promise.all([store.getMonthlyReport(schoolId, month), reportSignals(schoolId, month)]);
  return Response.json({
    school: { id: school.id, name: school.name },
    report: report ? { ...report, status: report.status ?? "published" } : null,
    signals: signals.map((s) => ({ id: s.id, status: s.status, category: s.category, aiSummary: s.aiSummary })),
  });
}

/**
 * 담당자 편집·공개. body: { body?: string, action?: "save" | "publish" | "unpublish" }
 * publish 는 자동 점검(lib/report checkReport)을 서버에서도 한 번 더 돌려 통과한 것만 받는다.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await isAdmin())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { schoolId, month } = await ctx.params;
  const current = await store.getMonthlyReport(schoolId, month);
  if (!current) return Response.json({ error: "not found" }, { status: 404 });
  const input = (await req.json()) as { body?: unknown; action?: unknown };
  const now = new Date().toISOString();
  const next = { ...current, status: current.status ?? ("published" as const) };

  if (typeof input.body === "string" && input.body.trim() && input.body.trim() !== current.body.trim()) {
    next.body = input.body.trim();
    next.editedAt = now;
    next.editCount = (current.editCount ?? 0) + 1;
  }
  if (input.action === "publish") {
    const failed = checkReport(next.body, next.total, next.resolved).filter((c) => !c.ok);
    if (failed.length) return Response.json({ error: "checks", failed }, { status: 422 });
    next.status = "published";
    next.publishedAt = now;
  } else if (input.action === "unpublish") {
    next.status = "draft";
  }
  await store.saveMonthlyReport(next);
  return Response.json(next);
}
