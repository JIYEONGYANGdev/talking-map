/**
 * 공공데이터 CSV → data/schools.json, data/zones.json
 * 사용: npx tsx scripts/load-public-data.ts data/raw/schools.csv data/raw/zones.csv
 *  - schools.csv: 전국초중등학교위치표준데이터 (data.go.kr 15021148)
 *  - zones.csv:   전국어린이보호구역표준데이터 (data.go.kr 15012891)
 * 인코딩이 EUC-KR/CP949 면 먼저 `iconv -f cp949 -t utf-8 in.csv > out.csv`
 */
import { readFileSync, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";
import type { School, Zone } from "../lib/types";

const [schoolsCsv, zonesCsv] = process.argv.slice(2);
if (!schoolsCsv) {
  console.error("usage: tsx scripts/load-public-data.ts <schools.csv> [zones.csv]");
  process.exit(1);
}

const pick = (row: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) {
    const hit = Object.keys(row).find((c) => c.replace(/\s/g, "").includes(k));
    if (hit && row[hit] !== "") return row[hit];
  }
  return "";
};

// "남양주시"를 걸러내야 한다. 표준데이터 주소는 "경기도 양주시 …" 형태.
const isYangju = (addr: string) => /(?<!남)양주시/.test(addr);
/**
 * 권역은 지번주소의 법정동(읍·면·동)으로 나눈다. 도로명주소에는 동 이름이 없어 "옥정동로", "회천중앙로" 같은
 * 도로명에 의존하면 틀린다(예: 회암초 = 옥정서로, 율정초 = 옥정동로).
 * - 옥정: 옥정동 (행정동 옥정1·2동)
 * - 회천: 행정동 회천1~4동 관할 법정동 — 덕계동·덕정동·봉양동·회암동·율정동·고암동·회정동
 * - 기존시가지: 양주1·2동(양주동·유양동·어둔동·남방동·마전동·산북동·광사동·만송동·삼숭동·고읍동)과 읍·면
 */
const district = (jibun: string, road = ""): School["district"] => {
  // 주의: JS 의 \b 는 한글 뒤에서 경계로 잡히지 않으므로 공백/끝 lookahead 를 쓴다
  const dong = jibun.match(/양주시\s+(?:\S+[읍면]\s+)?(\S+?동)(?=\s|$)/)?.[1] ?? "";
  if (dong === "옥정동") return "옥정";
  if (/^(덕계|덕정|봉양|회암|율정|고암|회정)동$/.test(dong)) return "회천";
  if (dong) return "기존시가지";
  // 지번주소가 없을 때만 도로명으로 추정
  return /옥정/.test(road) ? "옥정" : /회천|덕정|고암/.test(road) ? "회천" : "기존시가지";
};

/** 지번주소의 첫 행정 단위(법정동·읍·면). 읍·면 아래 "리" 는 버린다. 예: "양주시 백석읍 방성리 …" → 백석읍 */
const dongOf = (jibun: string): string | undefined => jibun.match(/양주시\s+(\S+?[읍면동])(?=\s|$)/)?.[1];

// 학교
const srows = parse(readFileSync(schoolsCsv, "utf8"), { columns: true, bom: true, skip_empty_lines: true }) as Record<string, string>[];
const schools: School[] = srows
  .filter((r) => isYangju(pick(r, "소재지도로명주소", "소재지지번주소")) && /초등학교/.test(pick(r, "학교급구분", "학교명")) && pick(r, "운영상태") !== "폐교")
  .filter((r) => /초등학교$/.test(pick(r, "학교명")))
  .map((r) => {
    const addr = pick(r, "소재지도로명주소", "소재지지번주소");
    return {
      id: pick(r, "학교ID") || pick(r, "학교명"),
      name: pick(r, "학교명"),
      lat: Number(pick(r, "위도")),
      lng: Number(pick(r, "경도")),
      address: addr,
      district: district(pick(r, "소재지지번주소"), addr),
      dong: dongOf(pick(r, "소재지지번주소")),
    };
  })
  .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
// 시연용 가상 학교(id demo-*)는 유지한다 (scripts/seed-demo.ts 가 만든다)
try {
  const prev: School[] = JSON.parse(readFileSync("data/schools.json", "utf8"));
  schools.push(...prev.filter((s) => s.id.startsWith("demo-")));
} catch {}
writeFileSync("data/schools.json", JSON.stringify(schools, null, 2));
const byDistrict = schools.reduce<Record<string, string[]>>((m, s) => ((m[s.district] ??= []).push(s.name), m), {});
console.log(`schools: ${schools.length}`);
for (const [d, names] of Object.entries(byDistrict)) console.log(`  ${d} (${names.length}): ${names.join(", ")}`);

// 어린이보호구역
if (zonesCsv) {
  const zrows = parse(readFileSync(zonesCsv, "utf8"), { columns: true, bom: true, skip_empty_lines: true }) as Record<string, string>[];
  const zones: Zone[] = zrows
    .filter((r) => isYangju(pick(r, "소재지도로명주소", "소재지지번주소")))
    .map((r, i) => ({
      id: `z${i}`,
      name: pick(r, "대상시설명"),
      lat: Number(pick(r, "위도")),
      lng: Number(pick(r, "경도")),
      cctv: /Y|있|1/.test(pick(r, "CCTV설치여부")),
      roadWidth: pick(r, "보호구역도로폭") || undefined,
      police: pick(r, "관할경찰서명") || undefined,
    }))
    .filter((z) => Number.isFinite(z.lat) && Number.isFinite(z.lng));
  writeFileSync("data/zones.json", JSON.stringify(zones, null, 2));
  console.log(`zones: ${zones.length}`);
}
