export type PublicStatus = "received" | "ai_proposed" | "confirmed" | "resolved" | "dismissed";

const STEPS = ["접수", "검토 중", "처리 중", "고쳐짐"];
const STEP_OF: Record<PublicStatus, number> = { received: 0, ai_proposed: 1, confirmed: 2, resolved: 3, dismissed: 3 };

/** 신고 진행 4칸. 색: 접수·검토 중은 브랜드 파랑, 처리 중은 파랑, 고쳐짐은 초록. 기각은 회색. */
export default function ProgressBar({ status }: { status: PublicStatus }) {
  const step = STEP_OF[status];
  const fill = status === "dismissed" ? "bg-faint" : status === "confirmed" ? "bg-progress" : status === "resolved" ? "bg-done" : "bg-brand";
  const ink = status === "dismissed" ? "text-muted" : status === "confirmed" ? "text-progress-ink" : status === "resolved" ? "text-done-ink" : "text-brand-dark";
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="진행 단계">
      {STEPS.map((s, i) => {
        const on = i <= step;
        const label = i === 3 && status === "dismissed" ? "이상 없음" : s;
        return (
          <li key={s} className="flex flex-col items-center gap-1.5" aria-current={i === step ? "step" : undefined}>
            <div className={`h-1.5 w-full rounded-full ${on ? fill : "bg-line"}`} />
            <div className={`text-[11px] ${on ? `font-bold ${ink}` : "text-muted"}`}>{label}</div>
          </li>
        );
      })}
    </ol>
  );
}
