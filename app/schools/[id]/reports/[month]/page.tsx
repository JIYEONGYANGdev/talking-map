import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import { getSchools } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MonthlyReportPage({ params }: { params: Promise<{ id: string; month: string }> }) {
  const { id, month } = await params;
  const school = (await getSchools()).find((s) => s.id === id);
  let report: { total: number; resolved: number; body: string; generatedAt: string } | null = null;
  try {
    report = JSON.parse(await fs.readFile(path.join(process.cwd(), "data", "reports", `${id}_${month}.json`), "utf8"));
  } catch {}
  return (
    <div className="space-y-4">
      <div className="text-xs text-zinc-500">
        <Link href={`/schools/${id}`}>← {school?.name}</Link>
      </div>
      <h1 className="text-lg font-semibold">
        {month.replace("-", "년 ")}월 우리 학교 길 리포트
      </h1>
      {!report ? (
        <p className="text-sm text-zinc-500">아직 이 달 리포트가 없습니다. 매달 1일에 만들어집니다. (시연: 공무원 화면에서 생성)</p>
      ) : (
        <article className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-semibold">{report.total}</div>
              <div className="text-xs text-zinc-500">이번 달 신호</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-green-700">{report.resolved}</div>
              <div className="text-xs text-zinc-500">고쳐짐</div>
            </div>
          </div>
          {report.body.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="text-sm leading-relaxed">
              {p}
            </p>
          ))}
          <div className="text-xs text-zinc-400">생성 {new Date(report.generatedAt).toLocaleString("ko-KR")}</div>
        </article>
      )}
    </div>
  );
}
