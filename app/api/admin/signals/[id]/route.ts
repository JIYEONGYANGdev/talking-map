import { isAdmin } from "@/lib/auth";
import { getAgencies, store } from "@/lib/db";
import { CATEGORIES, type Signal, type Status } from "@/lib/types";

/**
 * 공무원 확정·수정·완료·기각.
 * body: { action: "confirm"|"resolve"|"dismiss"|"edit", category?, agencyId?, schoolId?, lat?, lng?, aiSummary? }
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const current = await store.getSignal(id);
  if (!current) return Response.json({ error: "not found" }, { status: 404 });

  const patch: Partial<Signal> = {};
  if (body.category && CATEGORIES.includes(body.category)) patch.category = body.category;
  if (body.schoolId !== undefined) patch.schoolId = body.schoolId;
  if (body.lat != null && body.lng != null) {
    patch.lat = Number(body.lat);
    patch.lng = Number(body.lng);
    patch.locationConfidence = "high";
  }
  if (typeof body.aiSummary === "string" && body.aiSummary.trim()) patch.aiSummary = body.aiSummary.trim();
  if (body.agencyId !== undefined) {
    const agency = (await getAgencies()).find((a) => a.id === body.agencyId);
    patch.agencyId = agency?.id ?? null;
    patch.legalBasis = agency?.legalBasis ?? null;
  }

  const now = new Date().toISOString();
  const next: Record<string, Status> = { confirm: "confirmed", resolve: "resolved", dismiss: "dismissed" };
  if (body.action in next) {
    patch.status = next[body.action];
    if (patch.status === "confirmed" && !current.confirmedAt) patch.confirmedAt = now;
    if (patch.status === "resolved") {
      patch.resolvedAt = now;
      if (!current.confirmedAt) patch.confirmedAt = now;
    }
  }

  const updated = await store.updateSignal(id, patch);
  return Response.json(updated);
}
