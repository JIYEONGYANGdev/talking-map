@AGENTS.md

# 프로젝트 컨텍스트 — 말하는 지도, 우리 아이 등굣길

양주시 미래인재 AI 공모전 프로토타입(팀 지제가). 제출 10/16. 완성도보다 "한 바퀴가 도는 시연"이 목표.

## 한 바퀴 (절대 깨지면 안 됨)
신고 폼(/report: 사진+글+지도 탭) → POST /api/reports → lib/mask.ts 마스킹 → lib/ai.ts Claude 1회 호출(prompts/v2.ts)(학교 연결·종류·담당기관, tool use JSON) → signal(ai_proposed) 저장 → 공무원 /admin 확정(PATCH /api/admin/signals/:id) → 학부모 /schools/:id 지도 마커 색 변경 → /reports/:token 진행 확인.

## 설계 원칙 (기획안에서 온 것, 바꾸지 말 것)
- 학교에 점수·순위를 매기지 않는다. 변화(점검 우선/처리 중/고쳐짐)만 보여준다.
- AI 결과는 공무원 확정 전에는 학부모에게 "검토 중"으로만 보인다. 지도에는 confirmed 이후만 표시.
- AI는 위험 여부를 판단하지 않는다. 종류·위치·담당기관 정리만.
- 학교는 data/schools.json 목록 밖, 기관은 data/agencies.json 표 밖의 값을 쓰면 서버가 거부한다(lib/ai.ts 하단).
- 이름·전화·차량번호는 AI 전송 전 마스킹. 사진·신고자·학원·가게 이름은 시민 화면 비노출. 사진은 공무원 전용 API(/api/admin/reports/:id/photo)로만 열람(로컬 data/photos, Supabase 비공개 버킷 photos).

## 저장소
- SUPABASE_URL 없으면 data/db.json 파일 저장소(로컬 시연용). Vercel 배포 시 Supabase 필수(supabase/schema.sql: report, signal, monthly_report). 월간 리포트도 store 를 통해 저장(파일 or 테이블). 배포 절차는 docs/deploy.md.
- **배포본(10/7)**: https://talking-map-2026.vercel.app — Vercel icn1 + Supabase(Seoul), main push 시 자동 배포. 시연 데이터 투입 완료. 상태 확인은 `/api/health`. 커스텀 도메인은 미연결.
- 서버리스 대비: next.config.ts 가 data/*.json 을 함수 번들에 포함, /api/reports 와 리포트 생성은 maxDuration 60.
- data/schools.json(40교)·zones.json(88곳)은 공공데이터 표준데이터 스냅샷(학교 기준일 2026-10-01, 보호구역 2026-07-31). 갱신은 CSV 다시 받아 `iconv -f cp949 -t utf-8` 후 `npm run load-data`. 권역은 지번주소 법정동으로 나눈다(옥정동=옥정, 회천1~4동 관할 7개 동=회천, 나머지=기존시가지).

## 명령
npm run dev / npm run load-data / npm run load-accidents / npm run seed (모의 신고 12건 + 정확도) / npm run demo (시연 데이터: 가상 학교 demo-yeonpurun + 신고 8건 + 처리 + 월간 리포트) / npm run build
- 시연용 가상 학교 "연푸룬초등학교(시연)" id demo-yeonpurun 은 data/schools.json 에 sample:true 로 들어 있고 load-data 가 유지한다. 예시 사진 public/demo-photos/*-real.png (실사), 그림 버전은 public/demo-photos/표현 이미지/.

## 10일 일정의 남은 일 (10/7~)
1. ~~공공데이터 CSV 적재~~ 완료 10/7: 양주시 초등학교 40(옥정 8·회천 11·기존시가지 21, 법정동 기준), 보호구역 88. 모의 신고는 옥정초(B000027081)·회천새봄초(B000027107)·유양초(B000004741)로 교체. 원본 CSV(CP949)는 ~/Downloads/양주AI미래인재공모전2026/talking-map/, UTF-8 변환본은 data/raw/(git 제외)
2. ~~Claude 호출 실제 테스트~~ 완료 10/7: 모의 12건 v1 = 종류 11/12·기관 11/12·학교 11/11 → prompts/v2.ts(규칙 3-1 보행 장애물→인도·도로 파손) = 12/12·12/12·11/11, PII 누출 0. lib/ai.ts 는 v2 사용. 종류 정의·기관 표는 안 바꿈
3. ~~/admin 좌표 보정 UI~~ 완료 10/6: 카드의 "지도에서 위치 보정" → 클릭 → "이 위치로 저장"(PATCH lat/lng → confidence high). low 는 "위치 확인 필요" 배지 + 지도 자동 펼침
4. ~~사고다발지역 레이어~~ 완료 10/6: scripts/load-accidents.ts(DATA_GO_KR_KEY) → data/accidents.json → /api/schools/:id/signals.accidents → 지도 붉은 점선 원. 0건이면 "아직 사고 지도에 없습니다 — 신고가 첫 신호입니다". 10/7 실제 적재: 2020~2024 양주시 1건(2023 옥정동 옥빛초 부근, 사고 2·사상자 2). 스크립트는 .env.local 을 직접 읽음
5. 모바일 화면 다듬기(디자이너 와이어프레임 반영), 시연 대본대로 리허설

## 환경 (Mac) — 어기면 전부 막힘
- 시스템 Node 14 금지. nvm Node 22 (`.nvmrc`). `~/.zshenv` 가 nvm 을 로드하므로 zsh 라면 어디서나 v22. bash -lc 는 아직 v14.
- `.claude/launch.json` 의 dev 는 `zsh -c "npm run dev"` 로 띄운다(Turbopack 자식 node 도 22 여야 함). `next dev` 와 `next build` 를 동시에 돌리지 말 것(.next 공유). Turbopack 패닉에 `internal/modules/cjs/loader.js` 가 보이면 Node 14 워커 → PATH 고친 뒤 `rm -rf .next`.
- `lib/ai.ts`: Sonnet 5.5 는 강제 tool_choice 를 거부 → auto + strict. 조직 범위 키는 ANTHROPIC_WORKSPACE_ID 헤더 필요.

## AI 활용 기록 (공모전 평가용)
docs/ai-usage-log.md 를 계속 갱신한다. **1부 기획 아이템 관점**(서비스 안의 AI: 시민 접점·공무원 업무·신뢰 장치·학부모 소통·측정과 개선·확장 아이디어)과 **2부 개발 과정 관점**(유형 A~G) 둘 다. 기능을 만들거나 바꿀 때 "이 서비스에서 AI 가 하는 일·안 하는 일·안전장치"가 달라지면 1부에, 개발 중 AI 가 사람 대신 해 준 일은 2부에 날짜와 함께 적는다.

## 작업 분담 규칙 (Code 탭 ↔ Cowork)
이 폴더에서 열린 Claude Code는 **코드·환경·데이터 적재·테스트**만 담당한다.
아래 종류의 요청이 들어오면 직접 하지 말고, 한 줄로 "이건 코드 밖 작업이라 Cowork 세션(양주AI미래인재 프로젝트)에서 진행하는 게 맞습니다"라고 안내한 뒤, 코드 쪽에서 준비할 수 있는 것(예: 화면 캡처, 수치 집계)만 해준다.
- 기획안·발표자료·시연 대본·보고서 작성 또는 수정
- 공공데이터 포털 조사, 데이터셋 가용성 확인, 정책·법 근거 조사
- 비용 산정, 일정 재조정, 역할 분담, 팀 커뮤니케이션 문구
- Word/PPT/PDF 파일 생성, 다이어그램·슬라이드 비주얼
- API 키 발급, 결제, 계정 생성 같은 사람이 해야 하는 절차 안내
반대로 Cowork에서 코드 수정 요청이 오면 "코드는 Code 탭에서" 라고 안내한다.
판단이 애매하면(예: README 수정, 시연용 데이터 문구) 코드 쪽에서 처리한다.
