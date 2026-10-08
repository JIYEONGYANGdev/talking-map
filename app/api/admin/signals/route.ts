import { isAdmin } from "@/lib/auth";
import { getAgencies, getSchools, store } from "@/lib/db";
import type { Status } from "@/lib/types";

export async function GET(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as Status | null;
  const schoolId = url.searchParams.get("schoolId");
  const signals = await store.listSignals({
    status: status ?? undefined,
    schoolId: schoolId ?? undefined,
  });
  const [schools, agencies] = await Promise.all([getSchools(), getAgencies()]);
  const rows = await Promise.all(
    signals.map(async (s) => {
      const report = await store.getReport(s.reportId);
      return {
        ...s,
        schoolName: schools.find((x) => x.id === s.schoolId)?.name ?? null,
        agencyName: agencies.find((a) => a.id === s.agencyId)?.name ?? null,
        maskedText: report?.maskedText ?? "",
        hasPhoto: Boolean(report?.photoUrl),
        rawAddress: report?.rawAddress ?? null,
        receivedAt: report?.receivedAt ?? null,
      };
    }),
  );
  return Response.json(rows);
}
