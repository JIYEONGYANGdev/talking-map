import { store, storeKind } from "@/lib/db";

/**
 * 배포 점검용. 비밀값은 절대 내보내지 않고 "설정됐는지"만 알려준다.
 * 예: curl https://talking-map-2026.vercel.app/api/health
 */
export async function GET() {
  // 저장소 읽기 한 번으로 테이블 존재·키 권한을 확인한다 (Supabase 면 "relation does not exist" 같은 메시지가 그대로 보인다)
  let db: { ok: boolean; error?: string } = { ok: true };
  try {
    await store.listSignals({ status: "resolved" });
  } catch (e) {
    db = { ok: false, error: e instanceof Error ? e.message : JSON.stringify(e) };
  }
  return Response.json({
    ok: db.ok,
    db,
    store: storeKind, // "supabase" 여야 서버리스에서 신고 접수가 저장된다
    env: {
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_KEY: Boolean(process.env.SUPABASE_SERVICE_KEY),
      ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
      ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? "(기본값 claude-sonnet-5-5)",
      ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    },
    vercel: Boolean(process.env.VERCEL),
    region: process.env.VERCEL_REGION ?? null,
  });
}
