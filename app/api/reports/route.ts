import { randomBytes, randomUUID } from "crypto";
import { getAgencies, getSchools, store, storeKind } from "@/lib/db";
import { maskText } from "@/lib/mask";
import { classifyReport } from "@/lib/ai";
import type { Report, Signal } from "@/lib/types";

// 사진 포함 Claude 호출이 10초를 넘길 수 있다 (서버리스 함수 제한 상향)
export const maxDuration = 60;
const MAX_TEXT_CHARS = 2000;

/**
 * 신고 접수. 프로토타입에서는 폼이 직접 호출한다(실서비스는 문자 게이트웨이 대역).
 * multipart/form-data: text, address?, lat?, lng?, photo?(file)
 * 또는 JSON: { text, address?, lat?, lng?, source? }
 */
export async function POST(req: Request) {
  let text = "";
  let address: string | undefined;
  let lat: number | undefined;
  let lng: number | undefined;
  let source: Report["source"] = "form";
  let photoBase64: string | undefined;
  let photoMediaType: "image/jpeg" | "image/png" | "image/webp" | undefined;

  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    text = String(fd.get("text") ?? "");
    address = fd.get("address") ? String(fd.get("address")) : undefined;
    lat = fd.get("lat") ? Number(fd.get("lat")) : undefined;
    lng = fd.get("lng") ? Number(fd.get("lng")) : undefined;
    const photo = fd.get("photo");
    if (photo instanceof File && photo.size > 0) {
      const mt = photo.type as typeof photoMediaType;
      if (mt === "image/jpeg" || mt === "image/png" || mt === "image/webp") {
        photoMediaType = mt;
        photoBase64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
      }
    }
  } else {
    const body = await req.json();
    text = String(body.text ?? "");
    address = body.address;
    lat = body.lat;
    lng = body.lng;
    if (body.source) source = body.source;
  }
  if (!text.trim()) return Response.json({ error: "text required" }, { status: 400 });
  // 신고 글은 문자 메시지 수준. 잘못 파싱된 바이너리나 과도한 입력이 그대로 AI 호출 비용이 되지 않도록 상한을 둔다.
  if (text.length > MAX_TEXT_CHARS) return Response.json({ error: `text too long (max ${MAX_TEXT_CHARS} chars)` }, { status: 400 });

  const report: Report = {
    id: randomUUID(),
    token: randomBytes(16).toString("base64url"),
    source,
    receivedAt: new Date().toISOString(),
    rawText: text,
    maskedText: maskText(text),
    rawAddress: address,
    lat,
    lng,
    // 사진 자체는 프로토타입에서 저장하지 않는다(학부모 화면 비노출 원칙). AI 분류에만 쓴다.
  };
  try {
    await store.insertReport(report);
  } catch (e) {
    // 서버리스에서 Supabase 미설정·테이블 없음·키 권한 오류가 여기로 온다. 원인을 응답에 남긴다(비밀값 없음).
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    console.error("[reports] insertReport failed:", msg);
    return Response.json({ error: "storage", detail: msg, store: storeKind }, { status: 500 });
  }

  const [schools, agencies] = await Promise.all([getSchools(), getAgencies()]);
  let signal: Signal;
  try {
    const out = await classifyReport({
      maskedText: report.maskedText,
      rawAddress: address,
      photoBase64,
      photoMediaType,
      tappedLatLng: lat != null && lng != null ? { lat, lng } : null,
      schools,
      agencies,
    });
    const school = schools.find((s) => s.id === out.schoolId);
    const agency = agencies.find((a) => a.id === out.agencyId);
    signal = {
      id: randomUUID(),
      reportId: report.id,
      schoolId: out.schoolId,
      category: out.category,
      // 좌표: 신고자가 찍은 위치 > (없으면) 학교 중심점(low 로 표시)
      lat: lat ?? school?.lat ?? null,
      lng: lng ?? school?.lng ?? null,
      locationConfidence: lat != null ? "high" : out.locationConfidence,
      agencyId: out.agencyId,
      legalBasis: agency?.legalBasis ?? null,
      aiSummary: out.summary,
      aiReason: [out.reason, out.evidence && `사진: ${out.evidence}`, out.relativeDesc && `위치: ${out.anchorAddress ?? ""} ${out.relativeDesc}`]
        .filter(Boolean)
        .join(" / "),
      status: "ai_proposed",
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    // AI 실패 시에도 신고는 남기고 공무원 검토로 보낸다
    signal = {
      id: randomUUID(),
      reportId: report.id,
      schoolId: null,
      category: "기타",
      lat: lat ?? null,
      lng: lng ?? null,
      locationConfidence: lat != null ? "high" : "low",
      agencyId: null,
      legalBasis: null,
      aiSummary: "(AI 분류 실패 — 공무원 직접 검토)",
      aiReason: String(e instanceof Error ? e.message : e),
      status: "received",
      updatedAt: new Date().toISOString(),
    };
  }
  try {
    await store.insertSignal(signal);
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    console.error("[reports] insertSignal failed:", msg);
    return Response.json({ error: "storage", detail: msg, store: storeKind }, { status: 500 });
  }

  return Response.json({ token: report.token, signalId: signal.id, status: signal.status });
}
