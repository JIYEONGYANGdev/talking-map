import { getSchools } from "@/lib/db";
import ReportForm from "./ReportForm";

export const dynamic = "force-dynamic";

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const { school } = await searchParams;
  const schools = await getSchools();
  return <ReportForm schools={schools} defaultSchoolId={school ?? schools[0]?.id ?? ""} />;
}
