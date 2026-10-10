/**
 * 모의 신고를 /api/reports 로 일괄 투입한다. (서버가 떠 있어야 함)
 * 사용: BASE=http://localhost:3000 npx tsx scripts/seed-mock-reports.ts data/mock-reports.json
 * 파일 형식: [{ text, address?, schoolHint?, lat?, lng?, label: { category, agencyId } }]
 * label 은 정확도 검증용 정답. 결과는 data/seed-result.json 에 저장되고 정확도를 출력한다.
 */
import { readFileSync, writeFileSync } from "fs";

// localhost 는 Node fetch 가 ::1 을 먼저 시도해 느려질 수 있어 127.0.0.1 을 기본으로 둔다
const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const file = process.argv[2] ?? "data/mock-reports.json";
type Mock = { text: string; address?: string; lat?: number; lng?: number; label?: { category: string; agencyId: string; schoolId?: string } };
const mocks: Mock[] = JSON.parse(readFileSync(file, "utf8"));

(async () => {
  const results: unknown[] = [];
  let okCat = 0, okAgency = 0, okSchool = 0, labeled = 0;
  for (const m of mocks) {
    const r = await fetch(`${BASE}/api/reports`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: m.text, address: m.address, lat: m.lat, lng: m.lng, source: "mock" }),
    });
    const out = await r.json();
    // 정확도 측정을 위해 admin API 대신 저장된 signal 을 직접 읽는다 (파일 스토어 기준)
    results.push({ input: m, out });
    process.stdout.write(".");
    await new Promise((res) => setTimeout(res, 300));
  }
  console.log(`\n${mocks.length} reports posted`);
  // 정확도: data/db.json 을 읽어 label 과 비교 (파일 스토어일 때)
  try {
    const db = JSON.parse(readFileSync("data/db.json", "utf8"));
    for (const m of mocks) {
      if (!m.label) continue;
      labeled++;
      // 같은 글이 여러 번 투입됐으면 가장 최근 것(이번 실행)을 본다
      const rep = [...db.reports].reverse().find((x: { rawText: string }) => x.rawText === m.text);
      const sig = db.signals.find((x: { reportId: string }) => x.reportId === rep?.id);
      if (!sig) continue;
      if (sig.category === m.label.category) okCat++;
      if (sig.agencyId === m.label.agencyId) okAgency++;
      if (m.label.schoolId && sig.schoolId === m.label.schoolId) okSchool++;
    }
    if (labeled) {
      console.log(`정확도 (n=${labeled}): 종류 ${pct(okCat, labeled)}, 기관 ${pct(okAgency, labeled)}, 학교 ${pct(okSchool, mocks.filter((m) => m.label?.schoolId).length)}`);
    }
  } catch {}
  writeFileSync("data/seed-result.json", JSON.stringify(results, null, 2));
})();

function pct(a: number, b: number) {
  return b ? `${Math.round((a / b) * 100)}% (${a}/${b})` : "—";
}
