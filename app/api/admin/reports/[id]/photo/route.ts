import { isAdmin } from "@/lib/auth";
import { store } from "@/lib/db";

/** 접수 사진 (공무원 전용). 시민 화면에는 링크를 내지 않는다. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const report = await store.getReport(id);
  if (!report?.photoUrl) return new Response("not found", { status: 404 });
  const photo = await store.getPhoto(report.photoUrl);
  if (!photo) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "content-type": photo.mediaType,
      "cache-control": "private, max-age=300",
      "content-disposition": "inline",
    },
  });
}
