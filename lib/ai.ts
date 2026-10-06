/**
 * Claude API 호출. 신고 1건당 1회(작업 1·2·3 통합), 학교당 월 1회(작업 4).
 * 출력은 tool use 로 JSON 스키마를 강제한다.
 */
import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES, type Agency, type Category, type School, type Signal } from "./types";
import { CLASSIFY_SYSTEM, REPORT_SYSTEM } from "../prompts/v1";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

export type ClassifyInput = {
  maskedText: string;
  rawAddress?: string;
  photoBase64?: string; // data URL 아님, 순수 base64
  photoMediaType?: "image/jpeg" | "image/png" | "image/webp";
  tappedLatLng?: { lat: number; lng: number } | null;
  schools: School[];
  agencies: Agency[];
};

export type ClassifyOutput = {
  schoolId: string | null;
  anchorAddress: string | null;
  relativeDesc: string | null;
  locationConfidence: "high" | "mid" | "low";
  category: Category;
  summary: string;
  evidence: string;
  agencyId: string | null;
  reason: string;
};

export async function classifyReport(input: ClassifyInput): Promise<ClassifyOutput> {
  const client = new Anthropic();
  const schoolList = input.schools.map((s) => `- ${s.id}: ${s.name} (${s.address})`).join("\n");
  const agencyList = input.agencies
    .map((a) => `- ${a.id}: ${a.name} / 담당: ${a.handles.join(", ")} / 근거: ${a.legalBasis}`)
    .join("\n");

  const content: Anthropic.MessageParam["content"] = [];
  if (input.photoBase64 && input.photoMediaType) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.photoMediaType, data: input.photoBase64 },
    });
  }
  content.push({
    type: "text",
    text: [
      `## 신고 글\n${input.maskedText}`,
      `## 신고자가 적은 주소\n${input.rawAddress ?? "(없음)"}`,
      `## 신고자가 지도에서 찍은 위치\n${
        input.tappedLatLng ? `${input.tappedLatLng.lat}, ${input.tappedLatLng.lng}` : "(없음)"
      }`,
      `## 양주시 초등학교 목록 (이 목록 밖의 학교는 쓰지 말 것)\n${schoolList}`,
      `## 담당 기관 표 (이 표 밖의 기관·법 근거는 쓰지 말 것)\n${agencyList}`,
    ].join("\n\n"),
  });

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: CLASSIFY_SYSTEM,
    tools: [
      {
        name: "submit_classification",
        description: "신고 1건의 정리 결과를 제출한다.",
        input_schema: {
          type: "object",
          properties: {
            schoolId: { type: ["string", "null"], description: "목록의 학교 id. 모르면 null" },
            anchorAddress: { type: ["string", "null"], description: "기준 지점(학교명 또는 도로명 주소)" },
            relativeDesc: { type: ["string", "null"], description: "기준 지점 대비 상대 위치 (예: 정문 앞 횡단보도)" },
            locationConfidence: { type: "string", enum: ["high", "mid", "low"] },
            category: { type: "string", enum: [...CATEGORIES] },
            summary: { type: "string", description: "한 문장 요약, 사람 이름·가게 이름 없이" },
            evidence: { type: "string", description: "사진에서 본 것. 사진 없으면 빈 문자열" },
            agencyId: { type: ["string", "null"], description: "담당 기관 표의 id" },
            reason: { type: "string", description: "그 기관을 고른 한 문장 이유" },
          },
          required: ["schoolId", "anchorAddress", "relativeDesc", "locationConfidence", "category", "summary", "evidence", "agencyId", "reason"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_classification" },
    messages: [{ role: "user", content }],
  });

  const tool = res.content.find((c) => c.type === "tool_use");
  if (!tool || tool.type !== "tool_use") throw new Error("no tool_use in response");
  const out = tool.input as ClassifyOutput;

  // 서버 측 검증: 표 밖의 값은 거부 (AI 가 만들어낸 기관·학교 차단)
  if (out.schoolId && !input.schools.some((s) => s.id === out.schoolId)) out.schoolId = null;
  if (out.agencyId && !input.agencies.some((a) => a.id === out.agencyId)) out.agencyId = null;
  if (!CATEGORIES.includes(out.category)) out.category = "기타";
  return out;
}

export async function writeMonthlyReport(school: School, month: string, signals: Signal[]) {
  const client = new Anthropic();
  const lines = signals
    .map((s) => `- [${s.status}] ${s.category}: ${s.aiSummary}`)
    .join("\n");
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: REPORT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `학교: ${school.name}\n월: ${month}\n이번 달 신호 ${signals.length}건 (고쳐짐 ${
          signals.filter((s) => s.status === "resolved").length
        }건)\n\n${lines || "(신호 없음)"}`,
      },
    ],
  });
  const text = res.content.find((c) => c.type === "text");
  return text && text.type === "text" ? text.text : "";
}
