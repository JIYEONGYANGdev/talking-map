import { isAdmin } from "@/lib/auth";
import { store, storeKind } from "@/lib/db";

/**
 * 시연 데이터 초기화 (공무원 전용). body: { confirm: "RESET" }
 * 신고·신호·월간 리포트를 모두 지운다. 되돌릴 수 없으니 확인 문자열을 요구한다.
 * 예: curl -b cookie -X DELETE $BASE/api/admin/data -H 'content-type: application/json' -d '{"confirm":"RESET"}'
 */
export async function DELETE(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "RESET") return Response.json({ error: 'confirm 에 "RESET" 을 넣어 주세요' }, { status: 400 });
  const removed = await store.clearAll();
  return Response.json({ ok: true, store: storeKind, removed });
}
