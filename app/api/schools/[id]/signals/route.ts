import { getSchools, getZones, store } from "@/lib/db";
import { distanceM, markerKind, roundCoord } from "@/lib/geo";

const RADIUS_M = 500;

/** 학부모 공개용: confirmed 이상만, 좌표는 10m 단위, 요약은 공무원 확정 문장만 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const school = (await getSchools()).find((s) => s.id === id);
  if (!school) return Response.json({ error: "school not found" }, { status: 404 });

  const all = await store.listSignals({ schoolId: id });
  const visible = all.filter((s) => s.status === "confirmed" || s.status === "resolved");
  const reviewing = all.filter((s) => s.status === "ai_proposed" || s.status === "received").length;

  const signals = visible.map((s) => ({
    id: s.id,
    category: s.category,
    lat: s.lat != null ? roundCoord(s.lat) : null,
    lng: s.lng != null ? roundCoord(s.lng) : null,
    status: s.status,
    kind: markerKind(s, visible),
    summary: s.aiSummary,
    confirmedAt: s.confirmedAt ?? null,
    resolvedAt: s.resolvedAt ?? null,
  }));

  const zones = (await getZones()).filter(
    (z) => distanceM(school.lat, school.lng, z.lat, z.lng) <= RADIUS_M * 1.5,
  );

  return Response.json({ school, radiusM: RADIUS_M, signals, reviewing, zones });
}
