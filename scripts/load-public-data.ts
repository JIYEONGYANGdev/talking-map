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

const isYangju = (addr: string) => /양주시/.test(addr);
const district = (addr: string): School["district"] =>
  /옥정/.test(addr) ? "옥정" : /회천|덕정|고암|덕계|회암|봉양/.test(addr) ? "회천" : "기존시가지";

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
      district: district(addr),
    };
  })
  .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
writeFileSync("data/schools.json", JSON.stringify(schools, null, 2));
console.log(`schools: ${schools.length}`, schools.map((s) => `${s.name}(${s.district})`).join(", "));

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
