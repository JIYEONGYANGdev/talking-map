import { store, storeKind } from "@/lib/db";

/**
 * 배포 점검용. 비밀값은 절대 내보내지 않고 "설정됐는지"만 알려준다.
 * 예: curl https://talking-map-2026.vercel.app/api/health
 */
/** 키 값은 노출하지 않고 종류만 판별한다. anon/publishable 키면 RLS 때문에 insert 가 42501 로 실패한다. */
function supabaseKeyKind(key: string | undefined): string {
  if (!key) return "missing";
  if (key.startsWith("sb_secret_")) return "secret (OK)";
  if (key.startsWith("sb_publishable_")) return "publishable — 공개용 키! Secret key 로 바꿔야 함";
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
      if (payload.role === "service_role") return "service_role (OK)";
      if (payload.role === "anon") return "anon — 공개용 키! service_role 또는 Secret key 로 바꿔야 함";
      return `jwt role=${payload.role}`;
    } catch {}
  }
  return "unknown";
}

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
      SUPABASE_SERVICE_KEY_KIND: supabaseKeyKind(process.env.SUPABASE_SERVICE_KEY),
      ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
      ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? "(기본값 claude-sonnet-5-5)",
      ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    },
    vercel: Boolean(process.env.VERCEL),
    region: process.env.VERCEL_REGION ?? null,
    // 어느 커밋이 배포돼 있는지 (Vercel 이 빌드 때 넣어 줌). 환경변수 변경 후 재배포 확인용
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    deployedAt: process.env.VERCEL_DEPLOYMENT_ID ? new Date().toISOString() : null,
  });
}
