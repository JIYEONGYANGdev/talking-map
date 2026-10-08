# 말하는 지도, 우리 아이 등굣길 — 프로토타입

양주시 미래인재 AI 공모전 · 팀 지제가. 학부모 신고를 AI가 학교별 "신호"로 정리하고, 공무원이 확정하면 학부모 지도에 반영되는 웹앱.

## 한 바퀴
신고 폼(사진+글+지도 탭) → `POST /api/reports` → 마스킹 → Claude(학교 연결·종류·담당 기관, 1회 호출) → `signal(ai_proposed)` → 공무원 `/admin`에서 확정 → 학부모 `/schools/:id` 지도 색 변경 → `/reports/:token`에서 진행 확인.

## 실행
```bash
cp .env.example .env.local   # ANTHROPIC_API_KEY 입력
npm install
npm run dev                  # http://localhost:3000
```
Supabase 없이도 돌아간다(`data/db.json` 파일 저장소). Vercel 배포 시에는 `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`를 넣고 `supabase/schema.sql`을 실행한다.

## 공공데이터 적재
1. [전국초중등학교위치표준데이터](https://www.data.go.kr/data/15021148/standard.do) CSV → `data/raw/schools.csv`
2. [전국어린이보호구역표준데이터](https://www.data.go.kr/data/15012891/standard.do) CSV → `data/raw/zones.csv`
3. CP949 인코딩이면 `iconv -f cp949 -t utf-8 파일 > 파일.utf8.csv`
4. `npm run load-data` → `data/schools.json`, `data/zones.json` 생성(양주시 초등학교만). 임시 좌표 3개는 이때 교체된다.

## 어린이 사고다발지역 적재 (선택)
도로교통공단 [어린이보호구역내 어린이 교통사고 다발지역](https://www.data.go.kr/data/15058311/openapi.do) API. 활용신청 후 `.env.local`의 `DATA_GO_KR_KEY`에 일반 인증키(Decoding)를 넣고
```bash
npm run load-accidents          # 최근 5개년, 경기도(41) 양주시(630)
npm run load-accidents 2023     # 연도 지정
```
`data/accidents.json`에 저장되고 학교 지도에 붉은 점선 원으로 표시된다. 양주시 결과가 0건이면 학교 페이지에 "아직 사고다발지역 지도에 없습니다 — 신고가 첫 신호입니다"가 뜬다. 그 빈 상태가 이 서비스의 문제정의다.

## 시연 데이터 한 번에 만들기
```bash
npm run dev            # 다른 터미널
npm run demo           # 가상 학교 + 신고 8건(사진 4장 포함) + 공무원 처리 + 이번 달 리포트
```
- 가상 학교 **연푸룬초등학교(시연)** (`/schools/demo-yeonpurun`)를 만든다. 지도 위치는 실제 연푸른초등학교 자리. `npm run load-data`를 다시 돌려도 유지된다.
- 신고 8건을 실제 Claude 분류로 접수한 뒤 공무원 API로 처리해 지도에 점검 우선(같은 횡단보도 2건)·처리 중·고쳐짐이 모두 보이고, 2건은 "검토 중"으로 남아 공무원 화면 "AI 제안 대기" 탭에서 확정 시연을 할 수 있다.
- 예시 사진은 `public/demo-photos/*-real.png` 실사 4장(횡단보도 위 차량, 깨진 보도블록, 꺼진 가로등, 공사장 트럭). 신고 폼 시연에서 그대로 올리면 된다. 같은 장면의 그림 버전은 `public/demo-photos/표현 이미지/`(발표 자료용), 원본 SVG는 `scripts/demo-photos/`, 다시 만들려면 `npm run demo-photos`(macOS).
- 다시 실행하면 이전 시연 신고를 지우고 새로 만든다. 시연 URL 목록이 끝에 출력된다.

## 모의 신고 투입 + 정확도
`data/mock-reports.json`에 `{ text, address?, label:{category, agencyId, schoolId} }` 로 추가한 뒤
```bash
npm run dev            # 다른 터미널
npm run seed           # 종류/기관/학교 일치율 출력
```
10/7 측정: v1 종류 11/12·기관 11/12·학교 11/11 → v2 12/12·12/12·11/11, 개인정보 누출 0건. 프롬프트를 바꾸면 `prompts/vN.ts`로 복사해 올리고 다시 측정한다.

## 화면
| URL | 사용자 |
| --- | --- |
| `/` 학교 고르기 | 학부모 |
| `/schools/:id` 우리 아이 길 살펴보기 | 학부모 |
| `/report` 신고 폼(문자 게이트웨이 대역) | 학부모 |
| `/reports/:token` 내 신고 진행 확인 | 학부모 |
| `/schools/:id/reports/YYYY-MM` 월간 리포트 | 학부모 |
| `/admin` 학교별 점검표 (비밀번호: `ADMIN_PASSWORD`, 기본 `yangju2026`; `.env.example`을 복사했다면 `change-me`) · 신호 카드에 접수 사진 썸네일(클릭 확대)과 작은 지도(클릭 좌표 보정) | 공무원 |

## 구조
`app/` 화면·API · `lib/ai.ts` Claude 호출 · `prompts/v2.ts` 프롬프트(v1 은 비교용) · `lib/mask.ts` 개인정보 마스킹 · `lib/db.ts` 파일/Supabase 저장소 · `lib/geo.ts` 마커 색 규칙 · `scripts/` 데이터 적재(학교·보호구역·사고다발지역)·모의 신고 · `data/agencies.json` 담당 기관 표

## 실행 환경 주의 (Mac)
시스템 Node가 14면 Next 16이 돌지 않고 npm 6이 `package-lock.json`을 v1으로 바꿔 버린다. `bash setup-mac.sh`로 nvm + Node 22를 잡고, 터미널마다 `node -v`가 v22인지 확인한다. API 키가 "워크스페이스에 묶이지 않은 키"면 `ANTHROPIC_WORKSPACE_ID`도 넣어야 한다(.env.example 참고).
