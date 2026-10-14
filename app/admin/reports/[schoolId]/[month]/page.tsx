import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getSchools } from "@/lib/db";
import ReportEditor from "./ReportEditor";

export const dynamic = "force-dynamic";

/** 월간 리포트 초안 확인 → 학부모에게 공개 (시안 11 개선안 B). 공무원 쿠키가 없으면 로그인 화면으로. */
export default async function AdminReportPage({ params }: { params: Promise<{ schoolId: string; month: string }> }) {
  if (!(await isAdmin())) redirect("/admin");
  const { schoolId, month } = await params;
  const school = (await getSchools()).find((s) => s.id === schoolId);
  if (!school || !/^\d{4}-\d{2}$/.test(month)) redirect("/admin");
  return <ReportEditor schoolId={school.id} schoolName={school.name} month={month} />;
}
