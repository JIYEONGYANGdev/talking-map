import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchools } from "@/lib/db";
import SchoolMapClient from "./SchoolMapClient";
import SchoolSelect from "./SchoolSelect";

export const dynamic = "force-dynamic";

export default async function SchoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const schools = await getSchools();
  const school = schools.find((s) => s.id === id);
  if (!school) notFound();
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-zinc-500">{school.district}</div>
          <h1 className="text-lg font-semibold">{school.name} 주변 살펴보기</h1>
        </div>
        <SchoolSelect schools={schools} current={school.id} />
      </div>
      <SchoolMapClient schoolId={school.id} />
      <div className="text-xs text-zinc-500">
        색 의미: <Dot c="#e8731a" /> 점검 우선(같은 곳에 신호 2건 이상) <Dot c="#2f6fe4" /> 처리 중 <Dot c="#2a9d5c" /> 고쳐짐{" "}
        <Dot c="#c4b5fd" /> 어린이보호구역. 점수는 매기지 않고 변화만 보여줍니다.
      </div>
      <div className="flex gap-3">
        <Link href={`/report?school=${school.id}`} className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm">
          이 학교 주변 신고하기
        </Link>
        <Link href={`/schools/${school.id}/reports/${new Date().toISOString().slice(0, 7)}`} className="rounded-lg border px-4 py-2 text-sm bg-white">
          이번 달 리포트
        </Link>
      </div>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ background: c }} />;
}

