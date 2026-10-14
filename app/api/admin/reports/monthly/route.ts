import { isAdmin } from "@/lib/auth";
import { store } from "@/lib/db";

/** 모든 학교·달의 월간 리포트 목록(상태 요약용). 본문은 뺀다. */
export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const list = await store.listMonthlyReports();
  return Response.json(list.map((r) => ({ ...r, body: undefined, status: r.status ?? "published" })));
}
