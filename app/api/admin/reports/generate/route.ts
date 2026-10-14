import { isAdmin } from "@/lib/auth";
import { getSchools, store } from "@/lib/db";
import { reportSignals } from "@/lib/report-server";
import { writeMonthlyReport } from "@/lib/ai";

// Claude 호출 포함 — 서버리스 기본 제한(10초)보다 길 수 있다
export const maxDuration = 60;

/** 월간 리포트 AI 초안 생성. body: { schoolId, month: "2026-10" }. 결과는 draft — PATCH /api/admin/reports/monthly/:schoolId/:month 로 공개한다 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { schoolId, month } = await req.json();
  const school = (await getSchools()).find((s) => s.id === schoolId);
  if (!school || !/^\d{4}-\d{2}$/.test(month ?? "")) {
    return Response.json({ error: "schoolId and month (YYYY-MM) required" }, { status: 400 });
  }
  const signals = await reportSignals(schoolId, month);
  const body = await writeMonthlyReport(school, month, signals);
  // 새로 받은 초안은 공개 전 상태로 돌아간다(이미 공개된 달을 다시 생성해도). 담당자가 읽고 공개해야 학부모에게 보인다.
  const report = {
    schoolId,
    month,
    total: signals.length,
    resolved: signals.filter((s) => s.status === "resolved").length,
    body,
    generatedAt: new Date().toISOString(),
    status: "draft" as const,
    publishedAt: null,
    editedAt: null,
    editCount: 0,
  };
  // 파일 저장소면 data/reports/<school>_<month>.json, Supabase 면 monthly_report 테이블
  await store.saveMonthlyReport(report);
  return Response.json(report);
}
