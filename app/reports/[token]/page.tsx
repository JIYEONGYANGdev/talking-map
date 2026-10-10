import Link from "next/link";
import { getAgencies, getSchools, store } from "@/lib/db";
import { PUBLIC_STATUS } from "@/lib/types";
import Mascot from "@/components/Mascot";
import ProgressBar from "@/components/ProgressBar";
import Remember from "./Remember";

export const dynamic = "force-dynamic";

export default async function ProgressPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> }) {
  const { token } = await params;
  const { new: isNew } = await searchParams;
  const report = await store.getReportByToken(token);
  if (!report) {
    return (
      <div className="px-5 pt-10 flex flex-col items-center gap-3 text-center">
        <Mascot size={64} mood="progress" />
        <div className="font-bold">신고를 찾을 수 없어요</div>
        <Link href="/my" className="text-sm text-brand-dark font-medium">내 신고 목록으로</Link>
      </div>
    );
  }
  const signal = await store.getSignalByReport(report.id);
  const [schools, agencies] = await Promise.all([getSchools(), getAgencies()]);
  const status = signal?.status ?? "received";
  const confirmed = status === "confirmed" || status === "resolved" || status === "dismissed";
  const school = schools.find((s) => s.id === signal?.schoolId)?.name ?? null;
  const agency = confirmed ? agencies.find((a) => a.id === signal?.agencyId)?.name ?? null : null;
  const mood = status === "resolved" ? "default" : status === "confirmed" ? "progress" : "default";

  return (
    <div className="flex flex-col gap-4 px-5 pt-4">
      <Remember token={token} at={report.receivedAt} text={report.maskedText.slice(0, 60)} schoolId={signal?.schoolId ?? undefined} />
      <div className="flex items-center justify-between">
        <Link href="/my" aria-label="내 신고 목록" className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
        </Link>
        <div className="font-bold">내 신고 진행 상황</div>
        <div className="w-10" />
      </div>

      {isNew && (
        <div className="bg-white rounded-[24px] p-5 flex items-center gap-3.5">
          <Mascot size={56} />
          <div>
            <div className="font-bold text-[17px]">접수됐어요, 고마워요!</div>
            <p className="text-[13px] text-muted leading-relaxed mt-1">AI가 종류와 담당 기관을 정리했고, 공무원이 확인하면 지도에 표시돼요. 이 페이지에서 고쳐질 때까지 따라갈 수 있어요.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[20px] px-[18px] py-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2.5">
          <div>
            <div className="text-xs text-muted">{new Date(report.receivedAt).toLocaleString("ko-KR")} 접수</div>
            <div className="text-[15px] font-bold leading-snug mt-1">{report.maskedText}</div>
          </div>
          <span className={`shrink-0 h-[26px] px-2.5 rounded-full text-xs font-bold inline-flex items-center ${status === "resolved" ? "bg-brand-soft text-brand-dark" : status === "confirmed" ? "bg-progress-soft text-progress-ink" : "bg-review-soft text-muted"}`}>
            {PUBLIC_STATUS[status]}
          </span>
        </div>
        <ProgressBar status={status} />
        <dl className="grid grid-cols-[5rem_1fr] gap-x-2.5 gap-y-2 text-[13px]">
          <dt className="text-muted">학교</dt>
          <dd className="font-medium">{school ?? "확인 중"}</dd>
          <dt className="text-muted">종류</dt>
          <dd className="font-medium">{confirmed ? signal?.category : "공무원 확인 후 표시"}</dd>
          <dt className="text-muted">담당 기관</dt>
          <dd className="font-medium">{agency ?? "공무원 확인 후 표시"}</dd>
          {signal?.resolvedAt && (
            <>
              <dt className="text-muted">고쳐진 날</dt>
              <dd className="font-medium">{new Date(signal.resolvedAt).toLocaleDateString("ko-KR")}</dd>
            </>
          )}
        </dl>
        {!confirmed && (
          <div className="text-[13px] text-muted leading-relaxed bg-mint rounded-[14px] px-3 py-2.5 flex gap-2.5 items-start">
            <Mascot size={22} mood={mood} />
            <span>지금은 공무원이 확인하는 중이에요. 확인되면 종류·담당 기관이 보이고 학교 지도에 점으로 표시됩니다.</span>
          </div>
        )}
        {status === "dismissed" && <div className="text-[13px] text-muted">현장 확인 결과 조치가 필요하지 않은 것으로 판단됐어요. 알려주셔서 고맙습니다.</div>}
      </div>

      <p className="text-xs text-muted px-1">이 주소는 신고하신 분만 알고 있어요. 실제 서비스에서는 문자로 받게 됩니다. 사진과 연락처는 시민 화면에 나오지 않아요.</p>

      <div className="flex gap-2">
        {signal?.schoolId && (
          <Link href={`/schools/${signal.schoolId}`} className="flex-1 h-12 rounded-2xl bg-white border border-line font-bold flex items-center justify-center">학교 지도 보기</Link>
        )}
        <Link href="/report" className="flex-1 h-12 rounded-2xl bg-brand text-white font-bold flex items-center justify-center">하나 더 신고하기</Link>
      </div>
    </div>
  );
}
