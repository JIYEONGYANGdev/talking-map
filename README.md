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

## 모의 신고 투입 + 정확도
`data/mock-reports.json`에 `{ text, address?, label:{category, agencyId, schoolId} }` 로 추가한 뒤
```bash
npm run dev            # 다른 터미널
npm run seed           # 종류/기관/학교 일치율 출력
```

## 화면
| URL | 사용자 |
| --- | --- |
| `/` 학교 고르기 | 학부모 |
| `/schools/:id` 우리 아이 길 살펴보기 | 학부모 |
| `/report` 신고 폼(문자 게이트웨이 대역) | 학부모 |
| `/reports/:token` 내 신고 진행 확인 | 학부모 |
| `/schools/:id/reports/YYYY-MM` 월간 리포트 | 학부모 |
| `/admin` 학교별 점검표 (비밀번호: `ADMIN_PASSWORD`, 기본 `yangju2026`) | 공무원 |

## 구조
`app/` 화면·API · `lib/ai.ts` Claude 호출 · `prompts/v1.ts` 프롬프트 · `lib/mask.ts` 개인정보 마스킹 · `lib/db.ts` 파일/Supabase 저장소 · `lib/geo.ts` 마커 색 규칙 · `scripts/` 데이터 적재·모의 신고 · `data/agencies.json` 담당 기관 표
