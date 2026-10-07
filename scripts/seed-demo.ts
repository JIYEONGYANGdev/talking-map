/**
 * 시연용 데이터 한 번에 만들기. (dev 서버가 떠 있어야 함: npm run dev)
 *   npm run demo
 *
 * 하는 일
 *  1) 가상 학교 "연푸룬초등학교(시연)" 를 data/schools.json 에 추가 (좌표는 실제 연푸른초등학교 위치, id demo-yeonpurun)
 *     - load-data 를 다시 돌려도 demo-* 학교는 유지된다.
 *  2) 신고 8건을 POST /api/reports 로 접수 (4건은 public/demo-photos 의 예시 사진 포함, Claude 가 실제로 분류)
 *  3) 공무원 API 로 학교·종류·기관을 시나리오대로 맞춘 뒤
 *     - 2건은 같은 횡단보도(50m 안) → 확정 → 지도에 "점검 우선"(주황)
 *     - 2건 확정 → "처리 중"(파랑)
 *     - 2건 고쳐짐 → "고쳐짐"(초록)
 *     - 2건은 AI 제안 상태로 둠 → 학부모에겐 "검토 중", 공무원 화면 "AI 제안 대기" 탭에서 시연
 *  4) 이번 달 월간 리포트 생성 (Claude)
 *  다시 실행하면 이전 시연 신고를 지우고 새로 만든다 (파일 저장소 기준).
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import type { School } from "../lib/types";

for (const f of [".env.local", ".env"]) if (existsSync(f)) { try { process.loadEnvFile(f); } catch {} }

const BASE = process.env.BASE ?? "http://localhost:3000";
const PW = process.env.ADMIN_PASSWORD ?? "yangju2026";
const DEMO_ID = "demo-yeonpurun";
const DEMO_NAME = "연푸룬초등학교(시연)";
const BASE_SCHOOL = "연푸른초등학교"; // 좌표를 빌려올 실제 학교

type Demo = {
  text: string; address?: string; dLat?: number; dLng?: number; photo?: string;
  category: string; agencyId: string; action: "confirm" | "resolve" | "keep";
};
// 위도 0.0001 ≈ 11m, 경도 0.0001 ≈ 8.8m
const DEMOS: Demo[] = [
  { text: "연푸룬초 정문 앞 횡단보도에 아침마다 학원차가 서있어서 애들이 차 사이로 건너요. 어제도 하마터면 사고날뻔", address: "연푸룬초등학교 정문 횡단보도", dLat: 0.0008, dLng: 0.0003, photo: "crosswalk-car.png", category: "불법주정차", agencyId: "yangju-traffic", action: "confirm" },
  { text: "12가3456 흰색 SUV 매일 연푸룬초 정문 횡단보도 위에 주차함. 김철수 아빠가 봤다고 함", dLat: 0.00083, dLng: 0.00036, category: "불법주정차", agencyId: "yangju-traffic", action: "confirm" },
  { text: "연푸룬초등학교 후문쪽 인도 블럭이 깨져서 튀어나와있음. 애들 발 걸려 넘어짐. 빨리 좀 고쳐주세요", dLat: -0.0006, dLng: -0.0005, photo: "sidewalk.png", category: "인도·도로 파손", agencyId: "yangju-road", action: "resolve" },
  { text: "저녁에 학원 끝나고 오는 길인데 연푸룬초 옆 공원길 가로등이 두개나 꺼져있어요 너무 어두움. 제 번호 010-1234-5678", dLat: 0.0002, dLng: -0.0012, photo: "streetlight.png", category: "가로등·조명", agencyId: "yangju-road", action: "confirm" },
  { text: "연푸룬초 앞 사거리 신호등 초록불이 너무 짧아요 저학년은 다 못건넘", address: "연푸룬초등학교 앞 사거리", dLat: -0.001, dLng: 0.0009, category: "횡단보도·신호등", agencyId: "yangju-police", action: "confirm" },
  { text: "연푸룬초 가는길 아파트 공사장 덤프트럭이 등교시간에 계속 다녀요 안전요원도 없고", dLat: 0.0015, dLng: -0.0004, photo: "dump-truck.png", category: "공사 구간", agencyId: "construction-owner", action: "resolve" },
  { text: "연푸룬초 애들 등굣길에 맨홀 뚜껑이 덜컹거림 위치는 정문에서 편의점 쪽으로 50m", dLat: -0.0003, dLng: 0.0014, category: "인도·도로 파손", agencyId: "yangju-road", action: "keep" },
  { text: "통학버스가 학교 안으로 못들어가고 큰길에 세워서 애들 내려줘요. 연푸룬초요", address: "연푸룬초등학교 앞 큰길", category: "통학버스·학교 출입구", agencyId: "edu-office", action: "keep" },
];

(async () => {
  // 1) 가상 학교
  const schools: School[] = JSON.parse(readFileSync("data/schools.json", "utf8"));
  const base = schools.find((s) => s.name === BASE_SCHOOL);
  if (!base) throw new Error(`${BASE_SCHOOL} 가 data/schools.json 에 없습니다. npm run load-data 먼저.`);
  const demo: School = { id: DEMO_ID, name: DEMO_NAME, lat: base.lat, lng: base.lng, address: `(시연용 가상 학교 — 지도 위치는 ${BASE_SCHOOL} 기준)`, district: base.district, sample: true };
  const idx = schools.findIndex((s) => s.id === DEMO_ID);
  if (idx >= 0) schools[idx] = demo; else schools.push(demo);
  writeFileSync("data/schools.json", JSON.stringify(schools, null, 2));
  console.log(`학교: ${DEMO_NAME} (${demo.lat}, ${demo.lng}) → /schools/${DEMO_ID}`);

  // 이전 시연 신고 제거 (파일 저장소)
  if (existsSync("data/db.json")) {
    const db = JSON.parse(readFileSync("data/db.json", "utf8"));
    const texts = new Set(DEMOS.map((d) => d.text));
    const gone = new Set(db.reports.filter((r: { rawText: string }) => texts.has(r.rawText)).map((r: { id: string }) => r.id));
    db.reports = db.reports.filter((r: { id: string }) => !gone.has(r.id));
    db.signals = db.signals.filter((s: { reportId: string }) => !gone.has(s.reportId));
    writeFileSync("data/db.json", JSON.stringify(db, null, 2));
    if (gone.size) console.log(`이전 시연 신고 ${gone.size}건 제거`);
  }

  // 2) 접수
  const posted: { d: Demo; token: string; signalId: string; status: string }[] = [];
  for (const d of DEMOS) {
    const lat = d.dLat != null ? base.lat + d.dLat : undefined;
    const lng = d.dLng != null ? base.lng + d.dLng : undefined;
    let r: Response;
    if (d.photo) {
      const fd = new FormData();
      fd.set("text", d.text);
      if (d.address) fd.set("address", d.address);
      if (lat != null && lng != null) { fd.set("lat", String(lat)); fd.set("lng", String(lng)); }
      const buf = readFileSync(`public/demo-photos/${d.photo}`);
      fd.set("photo", new Blob([buf], { type: "image/png" }), d.photo);
      r = await fetch(`${BASE}/api/reports`, { method: "POST", body: fd });
    } else {
      r = await fetch(`${BASE}/api/reports`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: d.text, address: d.address, lat, lng }) });
    }
    const out = (await r.json()) as { token: string; signalId: string; status: string };
    posted.push({ d, ...out });
    process.stdout.write(out.status === "ai_proposed" ? "." : "x");
  }
  console.log(`\n신고 ${posted.length}건 접수 (x = AI 실패 폴백)`);

  // 3) 공무원 처리
  const login = await fetch(`${BASE}/api/admin/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: PW }) });
  if (!login.ok) throw new Error("관리자 로그인 실패 — .env.local 의 ADMIN_PASSWORD 확인");
  const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
  const patch = (id: string, body: Record<string, unknown>) =>
    fetch(`${BASE}/api/admin/signals/${id}`, { method: "PATCH", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body) }).then((r) => r.json());

  let aiMatch = 0;
  for (const p of posted) {
    const before = (await fetch(`${BASE}/api/admin/signals`, { headers: { cookie } }).then((r) => r.json()) as { id: string; schoolId: string | null; category: string; agencyId: string | null }[]).find((s) => s.id === p.signalId);
    if (before && before.schoolId === DEMO_ID && before.category === p.d.category && before.agencyId === p.d.agencyId) aiMatch++;
    // 시나리오대로 맞춘다(AI 가 이미 맞췄으면 그대로). keep 은 학교만 맞추고 AI 제안 상태 유지.
    const fix: Record<string, unknown> = { schoolId: DEMO_ID };
    if (p.d.action !== "keep") { fix.category = p.d.category; fix.agencyId = p.d.agencyId; fix.action = p.d.action; }
    await patch(p.signalId, fix);
  }
  console.log(`AI 가 학교·종류·기관을 모두 맞춘 건: ${aiMatch}/${posted.length} (나머지는 공무원 보정으로 처리)`);

  // 4) 월간 리포트
  const month = new Date().toISOString().slice(0, 7);
  const rep = await fetch(`${BASE}/api/admin/reports/generate`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ schoolId: DEMO_ID, month }) }).then((r) => r.json());
  console.log(`월간 리포트 ${month}: 신호 ${rep.total}건, 고쳐짐 ${rep.resolved}건`);

  console.log("\n시연 URL");
  console.log(`  학부모 지도      ${BASE}/schools/${DEMO_ID}`);
  console.log(`  이번 달 리포트   ${BASE}/schools/${DEMO_ID}/reports/${month}`);
  console.log(`  공무원 점검표    ${BASE}/admin  (비밀번호: .env.local ADMIN_PASSWORD)`);
  console.log(`  신고 폼          ${BASE}/report?school=${DEMO_ID}  (사진: public/demo-photos/)`);
  for (const p of posted) if (p.d.action !== "confirm") console.log(`  진행 확인(${p.d.action === "resolve" ? "고쳐짐" : "검토 중"})  ${BASE}/reports/${p.token}`);
})();
