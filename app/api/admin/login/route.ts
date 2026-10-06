import { adminPassword, clearAdminCookie, setAdminCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json();
  if (password !== adminPassword()) return Response.json({ ok: false }, { status: 401 });
  await setAdminCookie();
  return Response.json({ ok: true });
}

export async function DELETE() {
  await clearAdminCookie();
  return Response.json({ ok: true });
}
