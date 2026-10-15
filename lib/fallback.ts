import type { Agency, Category, School, Signal } from "@/lib/types";

/**
 * Claude 를 못 쓸 때(크레딧 소진·장애)의 대체 경로. 시연 중 심사위원이 신고하다 막히지 않게 한다.
 * - 신고: 키워드 규칙으로 종류·기관을 임시 분류하고 status 는 received(직접 검토)로 둔다. 공무원이 카드에서 고친다.
 * - 월간 리포트: 숫자와 종류만으로 쓴 틀 문장. 공개 전 자동 점검(lib/report checkReport)을 통과하도록 첫 문장에 숫자를 그대로 쓴다.
 */
export type AiFailureKind = "credits" | "busy" | "error";

export function aiFailureKind(e: unknown): AiFailureKind {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  const status = (e as { status?: number })?.status;
  if (/credit|billing|insufficient|quota|balance/.test(msg) || status === 402) return "credits";
  if (status === 429 || status === 529 || /rate limit|overloaded/.test(msg)) return "busy";
  return "error";
}

/** 학부모 화면에 보여 주는 안내. 사진은 이미 저장돼 공무원에게 전달된다. */
export const AI_FAILURE_NOTICE: Record<AiFailureKind, string> = {
  credits: "현재 AI 크레딧이 소진되어 글 내용만 제출합니다. 사진은 공무원에게 전달되고, 초기화 후 알려드리겠습니다.",
  busy: "AI 가 잠시 바빠 글 내용만 제출합니다. 사진은 공무원에게 전달되고, 담당자가 직접 확인합니다.",
  error: "AI 정리가 잠시 안 되어 글 내용만 제출합니다. 사진은 공무원에게 전달되고, 담당자가 직접 확인합니다.",
};

/** 순서가 중요하다: 구체적인 단서(파손·버스·주정차·공사)를 먼저, 장소 단어(횡단보도·정문)는 뒤에. 모의 신고 12건 기준 12/12 (lib/fallback 테스트, 10/16) */
const RULES: [RegExp, Category][] = [
  [/인도|보도블|블럭|블록|맨홀|파손|깨|움푹|패여|킥보드|적치|방치/, "인도·도로 파손"],
  [/통학버스|스쿨버스|승하차|학교 안으로|출입구/, "통학버스·학교 출입구"],
  [/주정차|주차|세워|정차|서 ?있|차가 서|차 사이|차량이 서/, "불법주정차"],
  [/공사|덤프|포클레인|가림막|안전요원|자재/, "공사 구간"],
  [/횡단보도|신호등|초록불|빨간불|보행 신호|신호가/, "횡단보도·신호등"],
  [/가로등|조명|어두|깜깜/, "가로등·조명"],
  [/과속|속도|쌩쌩|빨리 달|달려|km|킬로|표지판|교통량|차가 많|방지턱/, "속도·교통량"],
];

export function fallbackClassify(maskedText: string, agencies: Agency[]) {
  const text = maskedText.replace(/\s+/g, " ").trim();
  const category: Category = RULES.find(([re]) => re.test(text))?.[1] ?? "기타";
  const agency = agencies.find((a) => a.handles.includes(category)) ?? null;
  const first = text.split(/(?<=[.!?다요])\s+/)[0] ?? text;
  const summary = (first.length > 70 ? `${first.slice(0, 70)}…` : first) || "(내용 없음)";
  return {
    category,
    agencyId: agency?.id ?? null,
    legalBasis: agency?.legalBasis ?? null,
    summary: `${summary} (AI 미처리 — 임시 분류)`,
    reason: `AI 응답을 받지 못해 키워드 규칙으로 '${category}' 로 임시 분류했습니다. 종류·기관·위치는 담당자가 확인해 주세요.`,
  };
}

const KIND_LABEL: Record<string, string> = {
  불법주정차: "학교 주변 불법 주정차",
  "횡단보도·신호등": "횡단보도와 신호등",
  "인도·도로 파손": "인도와 도로 파손",
  "가로등·조명": "가로등과 조명",
  "공사 구간": "공사 구간",
  "통학버스·학교 출입구": "통학버스와 학교 출입구",
  "속도·교통량": "차량 속도와 교통량",
  기타: "그 밖의 불편",
};

export function fallbackReportBody(school: School, month: string, signals: Pick<Signal, "status" | "category">[]) {
  const total = signals.length;
  const resolved = signals.filter((s) => s.status === "resolved").length;
  const inProgress = signals.filter((s) => s.status === "confirmed").length;
  const reviewing = signals.filter((s) => s.status === "ai_proposed").length;
  const m = Number(month.slice(5));
  const kinds = [...new Set(signals.map((s) => KIND_LABEL[s.category] ?? s.category))];
  const kindText = kinds.length ? `${kinds.slice(0, 3).join(", ")}${kinds.length > 3 ? " 등" : ""}에 관한 내용이었습니다.` : "";
  const p1 = `${school.name} 통학로에 ${m}월 한 달 동안 ${total}건의 신고가 접수되었고, 그중 ${resolved}건이 고쳐졌습니다. ${kindText}`.trim();
  const p2 =
    resolved === 0
      ? `아직 고쳐진 것은 없지만 ${inProgress}건이 담당 기관에 전달되어 처리 중이고, ${reviewing}건은 담당자가 확인하고 있습니다.`
      : `${inProgress}건은 담당 기관에 전달되어 처리 중이고, ${reviewing}건은 담당자가 확인하고 있습니다. 처리 결과는 학교 지도에서 색으로 확인할 수 있습니다.`;
  const p3 = "우리 아이가 매일 다니는 길에서 불편하거나 위험한 곳을 보셨다면 사진 한 장이면 신고할 수 있습니다.";
  return [p1, p2, p3].join("\n\n");
}
