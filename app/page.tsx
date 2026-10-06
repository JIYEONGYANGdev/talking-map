import Link from "next/link";
import { getSchools } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const schools = await getSchools();
  const groups = ["옥정", "회천", "기존시가지"] as const;
  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl border border-zinc-200 p-5">
        <h1 className="text-xl font-semibold">우리 아이 학교는 아직 사고 지도에 없습니다.</h1>
        <p className="mt-2 text-zinc-600 text-sm leading-relaxed">
          옥정·회천의 새 학교 주변은 사고 기록이 쌓일 시간이 짧았습니다. 이 지도는 학부모 신고·사고 기록·공사
          구간을 학교별로 모아, 먼저 살펴봐야 할 곳을 보여주고 고쳐질 때까지 알려드립니다.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/report" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium">
            사진 한 장으로 신고하기
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 mb-2">학교를 고르세요</h2>
        {schools.length === 0 && (
          <p className="text-sm text-zinc-500">
            학교 데이터가 없습니다. <code>npm run load-data</code> 로 공공데이터를 적재하세요.
          </p>
        )}
        {groups.map((g) => {
          const list = schools.filter((s) => s.district === g);
          if (!list.length) return null;
          return (
            <div key={g} className="mb-4">
              <div className="text-xs text-zinc-500 mb-1">{g}</div>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {list.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/schools/${s.id}`}
                      className="block rounded-lg bg-white border border-zinc-200 px-3 py-2 text-sm hover:border-blue-400"
                    >
                      {s.name}
                      {s.sample && <span className="ml-1 text-[10px] text-amber-600">임시좌표</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
