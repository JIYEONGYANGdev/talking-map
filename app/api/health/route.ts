import { storeKind } from "@/lib/db";

/**
 * 배포 점검용. 비밀값은 절대 내보내지 않고 "설정됐는지"만 알려준다.
 * 예: curl https://talking-map-2026.vercel.app/api/health
 */
export async function GET() {
  return Response.json({
    ok: true,
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
