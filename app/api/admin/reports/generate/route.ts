import { isAdmin } from "@/lib/auth";
import { getSchools, store } from "@/lib/db";
import { writeMonthlyReport } from "@/lib/ai";
import { promises as fs } from "fs";
import path from "path";

/** 월간 리포트 수동 생성(시연용). body: { schoolId, month: "2026-10" } */
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { schoolId, month } = await req.json();
  const school = (await getSchools()).find((s) => s.id === schoolId);
  if (!school || !/^\d{4}-\d{2}$/.test(month ?? "")) {
    return Response.json({ error: "schoolId and month (YYYY-MM) required" }, { status: 400 });
  }
  const signals = (await store.listSignals({ schoolId })).filter(
    (s) => s.updatedAt.startsWith(month) && s.status !== "dismissed" && s.status !== "received",
  );
  const body = await writeMonthlyReport(school, month, signals);
  const report = {
    schoolId,
    month,
    total: signals.length,
    resolved: signals.filter((s) => s.status === "resolved").length,
    body,
    generatedAt: new Date().toISOString(),
  };
  // 프로토타입: data/reports/<school>_<month>.json 에 저장
  const dir = path.join(process.cwd(), "data", "reports");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${schoolId}_${month}.json`), JSON.stringify(report, null, 2));
  return Response.json(report);
}
