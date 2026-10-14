import type { Signal } from "@/lib/types";

/**
 * (클라이언트에서도 import 하므로 서버 전용 모듈을 끌어오지 않는다 — 신호 조회는 lib/report-server.ts)
 * 월간 리포트에 들어가는 신호: 그 달에 갱신된 것 중 AI 제안(확인 중)·처리 중·고쳐짐.
 * 직접 검토(AI 실패)와 해당 없음은 넣지 않는다. 공무원 패널(클라이언트)도 같은 규칙으로 센다 — app/admin/ReportPanel.tsx
 */
export const inReport = (s: Pick<Signal, "status" | "updatedAt">, month: string) =>
  s.updatedAt.startsWith(month) && s.status !== "dismissed" && s.status !== "received";

/** 리포트 본문 공개 전 자동 점검. prompts/v2 REPORT_SYSTEM 의 규칙을 화면에서 다시 확인한다. 클라이언트에서도 쓴다. */
export type ReportCheck = { key: string; label: string; ok: boolean; detail?: string };
export function checkReport(body: string, total: number, resolved: number): ReportCheck[] {
  const text = body.trim();
  const first = text.split(/(?<=[.!?])\s+|\n/)[0] ?? "";
  const totalOk = first.includes(`${total}건`);
  const resolvedOk = resolved === 0 ? /없|0건/.test(first) : first.includes(`${resolved}건`);
  const pii = text.match(/\[(이름|전화번호|차량번호|주소)\]|0\d{1,2}-?\d{3,4}-?\d{4}|\d{2,3}[가-힣]\s?\d{4}/);
  const rank = text.match(/순위|등급|평가|비교|다른 학교|\d+\s*점(?![검자포])|\d+\s*위(?![치험])/);
  return [
    { key: "numbers", label: "첫 문장의 숫자가 입력과 같음", ok: totalOk && resolvedOk, detail: `${total}건 · ${resolved}건` },
    { key: "pii", label: "이름·전화·차량번호 흔적 없음", ok: !pii, detail: pii ? `"${pii[0]}"` : undefined },
    { key: "rank", label: "점수·순위·다른 학교 비교 없음", ok: !rank, detail: rank ? `"${rank[0]}"` : undefined },
  ];
}

export const monthLabel = (month: string) => `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`;
export const prevMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
