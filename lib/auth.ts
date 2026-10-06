import { cookies } from "next/headers";

const COOKIE = "tm_admin";

export function adminPassword() {
  return process.env.ADMIN_PASSWORD ?? "yangju2026";
}

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get(COOKIE)?.value === adminPassword();
}

export async function setAdminCookie() {
  const c = await cookies();
  c.set(COOKIE, adminPassword(), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function clearAdminCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}
