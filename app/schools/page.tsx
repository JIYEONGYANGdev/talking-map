import { getSchools } from "@/lib/db";
import SchoolsIndex from "./SchoolsIndex";

export const dynamic = "force-dynamic";

/** 하단 탭 "지도": 기억된 학교가 있으면 그 학교 지도로, 없으면 학교 고르기 */
export default async function SchoolsPage() {
  const schools = await getSchools();
  return <SchoolsIndex schools={schools} />;
}
