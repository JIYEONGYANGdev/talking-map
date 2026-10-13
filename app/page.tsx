import { Suspense } from "react";
import { getAccidents, getSchools } from "@/lib/db";
import { distanceM } from "@/lib/geo";
import Home from "./Home";

/** /api/schools/:id/signals 와 같은 기준(반경 750m). 정적 데이터라 서버에서 미리 세어 첫 화면부터 맞는 배너를 보여준다 */
const ACCIDENT_RADIUS_M = 750;

export const dynamic = "force-dynamic";

export default async function Page() {
  const [schools, accidents] = await Promise.all([getSchools(), getAccidents()]);
  const accidentCounts: Record<string, number> = {};
  for (const s of schools) {
    const n = accidents.filter((a) => distanceM(s.lat, s.lng, a.lat, a.lng) <= ACCIDENT_RADIUS_M).length;
    if (n > 0) accidentCounts[s.id] = n;
  }
  return (
    <Suspense fallback={<div className="px-5 pt-5"><div className="h-40 rounded-2xl bg-white/60 animate-pulse" /></div>}>
      <Home schools={schools} accidentCounts={accidentCounts} />
    </Suspense>
  );
}
