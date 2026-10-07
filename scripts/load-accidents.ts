/**
 * 도로교통공단 "어린이보호구역내 어린이 교통사고 다발지역" (data.go.kr 15058311) → data/accidents.json
 *
 * 사용: npx tsx scripts/load-accidents.ts [연도 ...]   (.env.local 의 DATA_GO_KR_KEY 를 읽는다)
 *   예) npm run load-accidents            # 최근 5개년(올해-6 ~ 올해-2) 전부 조회
 *       npm run load-accidents 2022 2023  # 지정 연도만
 *
 * 엔드포인트: https://apis.data.go.kr/B552061/schoolzoneChild/getRestSchoolzoneChild
 * 요청 변수: serviceKey, searchYearCd(연도), siDo(법정동 시도 2자리), guGun(법정동 시군구 3자리), type=json, numOfRows, pageNo
 *   경기도 = 41, 양주시 = 630 (법정동코드 41630*). 다른 시군구는 SIDO/GUGUN 환경변수로 바꾼다.
 * 응답 항목: spot_nm, sido_sgg_nm, occrrnc_cnt(사고), caslt_cnt(사상자), dth_dnv_cnt(사망), se_dnv_cnt(중상), sl_dnv_cnt(경상), la_crd/lo_crd(위경도)
 * 정의: 보호구역 내 반경 300m 에서 12세 이하 어린이 사고 2건 이상 또는 사망 1건 이상 지점.
 *
 * 양주시 결과가 0건이면 그것이 곧 이 서비스의 문제정의다(사고가 쌓이기 전 학교). 빈 배열도 그대로 저장한다.
 */
import { existsSync, writeFileSync } from "fs";
import type { Accident } from "../lib/types";

// tsx 로 직접 실행하면 Next 와 달리 .env.local 을 읽지 않는다. 있으면 로드한다(이미 있는 환경변수가 우선).
for (const f of [".env.local", ".env"]) {
  if (existsSync(f)) {
    try {
      process.loadEnvFile(f);
    } catch {}
  }
}

const KEY_RAW = process.env.DATA_GO_KR_KEY ?? "";
if (!KEY_RAW) {
  console.error("DATA_GO_KR_KEY 환경변수가 없습니다. data.go.kr 에서 15058311 활용신청 후 발급된 '일반 인증키(Decoding)'를 넣어 주세요.");
  process.exit(1);
}
// data.go.kr 키는 Encoding/Decoding 두 가지로 제공된다. 이미 %로 인코딩된 키가 들어오면 한 번 풀어서 이중 인코딩을 막는다.
const KEY = /%[0-9A-Fa-f]{2}/.test(KEY_RAW) ? decodeURIComponent(KEY_RAW) : KEY_RAW;
const SIDO = process.env.SIDO ?? "41";
const GUGUN = process.env.GUGUN ?? "630";
const BASE = "https://apis.data.go.kr/B552061/schoolzoneChild/getRestSchoolzoneChild";

const thisYear = new Date().getFullYear();
const years = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number)
  : Array.from({ length: 5 }, (_, i) => thisYear - 6 + i); // 공개 데이터는 보통 2년 전까지

type Item = Record<string, string | number | undefined>;
const num = (v: string | number | undefined) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

async function fetchYear(year: number): Promise<Item[]> {
  const out: Item[] = [];
  for (let page = 1; page <= 20; page++) {
    const qs = new URLSearchParams({
      serviceKey: KEY,
      searchYearCd: String(year),
      siDo: SIDO,
      guGun: GUGUN,
      type: "json",
      numOfRows: "100",
      pageNo: String(page),
    });
    const res = await fetch(`${BASE}?${qs}`);
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`JSON 이 아닌 응답(${res.status}): ${text.slice(0, 200)}`);
    }
    const b = body as {
      OpenAPI_ServiceResponse?: { cmmMsgHeader?: { errMsg?: string; returnAuthMsg?: string; returnReasonCode?: string } };
      resultCode?: string;
      resultMsg?: string;
      totalCount?: number | string;
      items?: { item?: Item | Item[] } | Item[];
    };
    if (b.OpenAPI_ServiceResponse?.cmmMsgHeader) {
      const h = b.OpenAPI_ServiceResponse.cmmMsgHeader;
      throw new Error(`공공데이터포털 오류 ${h.returnReasonCode}: ${h.errMsg} (${h.returnAuthMsg}) — 키가 이 API(15058311)에 활용신청되어 있는지, 승인(보통 1~2시간)됐는지 확인`);
    }
    if (b.resultCode && b.resultCode !== "00") {
      // 03 NODATA_ERROR 등: 그 해 자료 없음
      if (/NODATA|03/.test(`${b.resultCode} ${b.resultMsg}`)) return out;
      throw new Error(`API 오류 ${b.resultCode}: ${b.resultMsg}`);
    }
    const raw = Array.isArray(b.items) ? b.items : b.items?.item;
    const items: Item[] = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
    out.push(...items);
    const total = num(b.totalCount);
    if (items.length === 0 || out.length >= total) break;
  }
  return out;
}

(async () => {
  const all: Accident[] = [];
  for (const y of years) {
    try {
      const items = await fetchYear(y);
      console.log(`${y}: ${items.length}건`);
      items.forEach((it, i) => {
        const lat = num(it.la_crd);
        const lng = num(it.lo_crd);
        if (!lat || !lng) return;
        all.push({
          id: String(it.afos_fid ?? it.afos_id ?? `${y}-${i}`),
          name: String(it.spot_nm ?? ""),
          sggName: it.sido_sgg_nm ? String(it.sido_sgg_nm) : undefined,
          lat,
          lng,
          year: y,
          accidents: num(it.occrrnc_cnt),
          casualties: num(it.caslt_cnt),
          deaths: num(it.dth_dnv_cnt),
          serious: num(it.se_dnv_cnt),
          minor: num(it.sl_dnv_cnt),
        });
      });
    } catch (e) {
      console.error(`${y}: 실패 — ${e instanceof Error ? e.message : e}`);
      process.exitCode = 1;
    }
  }
  writeFileSync("data/accidents.json", JSON.stringify(all, null, 2));
  console.log(`\ndata/accidents.json 저장: ${all.length}건 (시도 ${SIDO}, 시군구 ${GUGUN}, 연도 ${years.join(",")})`);
  if (all.length === 0) {
    console.log("→ 0건. 학교 페이지에는 \"이 학교 주변은 아직 사고다발지역 지도에 없습니다 — 신고가 첫 신호입니다\" 가 표시됩니다.");
  } else {
    for (const a of all) console.log(`- [${a.year}] ${a.name} 사고 ${a.accidents} 사상자 ${a.casualties} (${a.lat}, ${a.lng})`);
  }
})();
