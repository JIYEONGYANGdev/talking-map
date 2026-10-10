import { notFound } from "next/navigation";
import { getSchools } from "@/lib/db";
import SchoolMapClient from "./SchoolMapClient";

export const dynamic = "force-dynamic";

export default async function SchoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const schools = await getSchools();
  const school = schools.find((s) => s.id === id);
  if (!school) notFound();
  return <SchoolMapClient school={school} schools={schools.map((s) => ({ id: s.id, name: s.name }))} />;
}
