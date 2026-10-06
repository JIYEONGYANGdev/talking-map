import { isAdmin } from "@/lib/auth";
import { getAgencies, getSchools } from "@/lib/db";
import AdminBoard from "./AdminBoard";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) return <LoginForm />;
  const [schools, agencies] = await Promise.all([getSchools(), getAgencies()]);
  return <AdminBoard schools={schools} agencies={agencies} />;
}
