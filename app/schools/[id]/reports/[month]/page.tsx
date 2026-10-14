import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { getSchools, isPublished, store } from "@/lib/db";
import Mascot from "@/components/Mascot";

export const dynamic = "force-dynamic";

export default async function MonthlyReportPage({ params }: { params: Promise<{ id: string; month: string }> }) {
  const { id, month } = await params;
  const school = (await getSchools()).find((s) => s.id === id);
  const stored = await store.getMonthlyReport(id, month);
  // 초안은 학부모에게 보이지 않는다. 공무원(쿠키)은 미리보기로 볼 수 있다.
  const preview = Boolean(stored) && !isPublished(stored) && (await isAdmin());
  const report = isPublished(stored) || preview ? stored : null;
  const [y, m] = month.split("-");
  return (
    <div className="flex flex-col gap-4 px-5 pt-4">
      <div className="flex items-center justify-between">
        <Link href={`/schools/${id}`} aria-label="학교 지도로" className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
        </Link>
        <div className="font-bold">{school?.name}</div>
        <div className="w-10" />
      </div>
      <h1 className="text-[22px] font-bold leading-snug">{y}년 {Number(m)}월<br />우리 학교 길 리포트</h1>
      {!report ? (
        <div className="bg-white border border-line rounded-2xl p-6 flex flex-col items-center text-center gap-3">
          <Mascot size={64} mood="progress" />
          <div className="font-bold">아직 이 달 리포트가 없어요</div>
          <p className="text-sm text-muted leading-relaxed">매달 1일에 만들어져요. 그동안 쌓인 신호는 학교 지도에서 볼 수 있어요.</p>
        </div>
      ) : (
        <>
        {preview && <div className="rounded-xl bg-priority-soft text-priority-ink text-[13px] px-4 py-3 leading-relaxed">초안 미리보기입니다. 공개하기 전에는 학부모에게 보이지 않아요.</div>}
        <article className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-ground rounded-xl py-3.5 flex flex-col items-center gap-1">
              <div className="text-[26px] font-bold leading-none">{report.total}</div>
              <div className="text-xs text-muted">이번 달 신호</div>
            </div>
            <div className="bg-ground rounded-xl py-3.5 flex flex-col items-center gap-1">
              <div className="text-[26px] font-bold leading-none text-done-ink">{report.resolved}</div>
              <div className="text-xs text-muted">고쳐짐</div>
            </div>
          </div>
          {report.body.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="text-[15px] leading-relaxed">{p}</p>
          ))}
          <div className="text-xs text-muted">
            {preview ? `AI 초안 ${new Date(report.generatedAt).toLocaleDateString("ko-KR")} · 담당자 확인 전` : `${report.publishedAt ? "공개" : "생성"} ${new Date(report.publishedAt ?? report.generatedAt).toLocaleDateString("ko-KR")} · 담당자가 확인한 글이에요`} · 점수나 순위는 매기지 않아요
          </div>
        </article>
        </>
      )}
    </div>
  );
}
