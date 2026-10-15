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

## 화면 구조·디자인 (2026-10-10 개편, 시안: docs/design 캔버스)
- 학부모 화면은 모바일 폭(최대 430px) + 하단 탭 3개(홈 `/`, 지도 `/schools`→기억된 학교, 내 신고 `/my`). 공무원 `/admin`은 넓은 폭. 틀은 components/AppShell.tsx.
- 색은 의미로만(키 컬러는 센디 자료 톤, 10/10): 브랜드 파랑 #006EF4(주요 버튼·활성 탭·처리 중), 네이비 글자 #1F2D3A, 바탕 회청 #F6F8FB, 주황 #C2410C(점검 우선), 초록 #0F7B4F(고쳐짐, done 토큰), 회색(검토 중). 토큰은 app/globals.css `@theme`(bg-brand, text-muted, border-line, bg-done …). 서체 Noto Sans KR. 모서리 12~16px, 흰 카드는 1px 선, 버튼 그림자 없음.
- 신고는 3단계 한 컴포넌트(app/report/ReportForm.tsx): 사진 → 한 줄(표현 칩) → 위치·보내기. 종류 선택 없음. 신고 중에는 하단 탭 숨김.
- 기기 저장(lib/local.ts, localStorage): 고른 학교 `tm_school`, 내 신고 토큰 `tm_reports`. 로그인 없음. 진행 확인 페이지를 열면 그 신고도 기기에 기억.
- 캐릭터 "핀이"(components/Mascot.tsx)는 빈 상태·안내에만. 데이터 위에 올리지 않는다.
- 홈 우측 상단 지역 표시(동 · 양주시)를 누르면 동네 시트(components/RegionSheet.tsx): 현재 지역 양주시 + 학교가 있는 법정동·읍·면 칩(3열, 학교 수 표시) + "현재는 양주시에서만 서비스, 추후 확대" 문구. 칩을 누르면 SchoolPicker 가 그 동네 학교만 보여준다(`dong` prop). 동은 School.dong(지번주소에서 load-data 가 추출, 시연 학교는 옥정동).
- 지도 페이지는 화면 높이에 고정(지도 flex + 바텀시트 내부 스크롤). 범례 칩을 누르면 현재 지도 중심에서 가장 가까운 해당 항목으로 날아가 말풍선을 열고(SchoolMap `focus`/`onViewChange`), 목록 항목·지도 점을 누르면 그 위치로 이동.
- 스플래시(components/Splash.tsx)는 현재 꺼져 있음(`SPLASH_ENABLED=false`, 시연 영상에 따로 붙임). 켜면 주소 `/` 로 들어올 때마다 1.6초(`HOLD_UNTIL_TAP=true` 면 탭할 때까지). 깊은 주소(/reports/:token 등)로 진입하면 안 뜨고, 앱 안 탭 이동에서도 다시 안 뜸. 공무원 화면에는 없음.
- 공무원 /admin(데스크톱 기준, 최대 1152px): 지표 4개(확인 대기·처리 중·이달 고쳐짐·신고→첫 조치 중앙값) → 도구 줄(상태 탭+건수, 학교 필터, 검색) → 월간 리포트 패널(app/admin/ReportPanel.tsx, 시안 10: 학교를 고르면 펼침 — 월 선택·들어갈 신호 수·상태 미생성/초안/공개됨·버튼 하나; 모든 학교면 한 줄 요약) → 카드(사진 | 신고 글·AI 요약·이유·근거·좌표 보정 | 학교·종류·기관 선택 + 확정/고쳐짐/해당 없음). 쓰기는 PATCH /api/admin/signals/:id 하나(상태·종류·기관·좌표).
- 월간 리포트는 초안→공개 2단계(2026-10-14, 시안 11): POST /api/admin/reports/generate 가 draft 를 만들고, /admin/reports/:school/:month(ReportEditor.tsx)에서 담당자가 본문을 고쳐 PATCH /api/admin/reports/monthly/:school/:month `{body, action: save|publish|unpublish}`. 공개 전 자동 점검 3개(lib/report.ts checkReport: 첫 문장 숫자 일치·개인정보 흔적·점수/순위 표현)를 서버에서도 검사해 불통과면 422. 학부모 /schools/:id/reports/:month 는 published 만 보여 주고, 공무원 쿠키가 있으면 초안을 미리보기 배너와 함께 보여 줌. status 없는 옛 리포트는 공개로 취급(lib/db isPublished). Supabase 는 supabase/migrations/2026-10-14_monthly_report_status.sql 을 실행해야 상태가 저장됨(없으면 상태 열 없이 저장하고 경고). DELETE /api/admin/signals/:id 는 신호+신고+사진을 함께 지움(카드 오른쪽 아래 작은 "삭제" 글자 버튼, 확인창 1회).

## 저장소
- SUPABASE_URL 없으면 data/db.json 파일 저장소(로컬 시연용). Vercel 배포 시 Supabase 필수(supabase/schema.sql: report, signal, monthly_report). 월간 리포트도 store 를 통해 저장(파일 or 테이블). 배포 절차는 docs/deploy.md.
- **배포본(10/7)**: https://talking-map-2026.vercel.app — Vercel icn1 + Supabase(Seoul), main push 시 자동 배포. 시연 데이터 투입 완료. 상태 확인은 `/api/health`. 커스텀 도메인은 미연결.
- 서버리스 대비: next.config.ts 가 data/*.json 을 함수 번들에 포함, /api/reports 와 리포트 생성은 maxDuration 60.
- data/schools.json(40교)·zones.json(88곳)은 공공데이터 표준데이터 스냅샷(학교 기준일 2026-10-01, 보호구역 2026-07-31). 갱신은 CSV 다시 받아 `iconv -f cp949 -t utf-8` 후 `npm run load-data`. 권역은 지번주소 법정동으로 나눈다(옥정동=옥정, 회천1~4동 관할 7개 동=회천, 나머지=기존시가지).

## 명령
npm run dev / npm run load-data / npm run load-accidents / npm run seed (모의 신고 12건 + 정확도) / npm run demo (시연 데이터: 가상 학교 demo-yeonpurun + 신고 8건(사진 6장) + 처리 + 월간 리포트) / npm run build
- 시연 데이터 초기화: 공무원 로그인 후 `DELETE /api/admin/data` body `{"confirm":"RESET"}` (신고·신호·월간 리포트 전부 삭제, 되돌릴 수 없음). 배포본 재투입은 docs/deploy.md 3절.
- 시연용 가상 학교 "연푸룬초등학교" id demo-yeonpurun 은 data/schools.json 에 sample:true 로 들어 있고 load-data 가 유지한다. 예시 사진 public/demo-photos/*-real.png (실사), 그림 버전은 public/demo-photos/표현 이미지/.

## 10일 일정의 남은 일 (10/7~)
1. ~~공공데이터 CSV 적재~~ 완료 10/7: 양주시 초등학교 40(옥정 8·회천 11·기존시가지 21, 법정동 기준), 보호구역 88. 모의 신고는 옥정초(B000027081)·회천새봄초(B000027107)·유양초(B000004741)로 교체. 원본 CSV(CP949)는 ~/Downloads/양주AI미래인재공모전2026/talking-map/, UTF-8 변환본은 data/raw/(git 제외)
2. ~~Claude 호출 실제 테스트~~ 완료 10/7: 모의 12건 v1 = 종류 11/12·기관 11/12·학교 11/11 → prompts/v2.ts(규칙 3-1 보행 장애물→인도·도로 파손) = 12/12·12/12·11/11, PII 누출 0. lib/ai.ts 는 v2 사용. 종류 정의·기관 표는 안 바꿈
3. ~~/admin 좌표 보정 UI~~ 완료 10/6: 카드의 "지도에서 위치 보정" → 클릭 → "이 위치로 저장"(PATCH lat/lng → confidence high). low 는 "위치 확인 필요" 배지 + 지도 자동 펼침
4. ~~사고다발지역 레이어~~ 완료 10/6: scripts/load-accidents.ts(DATA_GO_KR_KEY) → data/accidents.json → /api/schools/:id/signals.accidents → 지도 붉은 점선 원. 0건이면 "아직 사고 지도에 없습니다 — 신고가 첫 신호입니다". 10/7 실제 적재: 2020~2024 양주시 1건(2023 옥정동 옥빛초 부근, 사고 2·사상자 2). 스크립트는 .env.local 을 직접 읽음
5. ~~모바일 화면 다듬기~~ 10/10 시안대로 학부모 화면 전면 개편 완료(홈·신고 3단계·지도 탭·내 신고·진행 확인·월간 리포트). 남은 것: 시연 대본대로 리허설 (공무원 데스크톱 화면도 10/10 개편 완료)

## 환경 (Mac) — 어기면 전부 막힘
- 시스템 Node 14 금지. nvm Node 22 (`.nvmrc`). `~/.zshenv` 가 nvm 을 로드하므로 zsh 라면 어디서나 v22. bash -lc 는 아직 v14.
- `.claude/launch.json` 의 dev 는 `zsh -c "npm run dev"` 로 띄운다(Turbopack 자식 node 도 22 여야 함). `next dev` 와 `next build` 를 동시에 돌리지 말 것(.next 공유). Turbopack 패닉에 `internal/modules/cjs/loader.js` 가 보이면 Node 14 워커 → PATH 고친 뒤 `rm -rf .next`.
- git 커밋 작성자는 GitHub 계정에 연결된 이메일이어야 한다(저장소 로컬 config 에 `82949221+JIYEONGYANGdev@users.noreply.github.com` 설정, 10/13). 호스트명 이메일(`@…MacBookAir.local`)로 커밋하면 Vercel 이 "Deployment was blocked" 로 배포를 막는다. 배포 여부는 `gh api repos/JIYEONGYANGdev/talking-map/commits/<sha>/status` 로 확인.
- `lib/ai.ts`: Sonnet 5.5 는 강제 tool_choice 를 거부 → auto + strict. 조직 범위 키는 ANTHROPIC_WORKSPACE_ID 헤더 필요.
- `lib/ai.ts` 신고 분류는 프롬프트 캐싱(10/16): 학교 목록·기관 표를 system 두 번째 블록에 두고 `cache_control: {ephemeral, ttl: "1h"}`. 신고마다 바뀌는 글·주소·위치·고른 학교만 user 메시지. 서버 로그 `[ai-usage] … cache_write/cache_read` 로 확인. 학교·기관 JSON 을 바꾸면 캐시가 다시 써진다(정상).

## 결정 기록 (항상)
제품·운영에 영향을 주는 결정(스위치 켜고 끄기, 데이터 규칙, 시연용 임시 조치 포함)을 하면 docs/decisions.md 표에 한 줄 추가한다. 되돌리면 "되돌림"으로 표시. 환경변수 값 등 민감정보는 적지 않는다. 인수인계 현황은 docs/handoff.md.

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

## 담당 기관 표 갱신 (2026-10-10, Cowork에서 양주시 조직도 분석 후 수정)
- data/agencies.json 을 실제 과·팀 기준으로 교체(백업: data/agencies.backup-2026-10-10.json). id 는 유지하고 이름·근거를 고쳤으며, `yangju-traffic-facility`(교통과 교통시설팀, 속도·교통량) 1개를 추가. 기존 `yangju-traffic` 은 차량관리과(불법주정차), `yangju-safety` 는 민원여권과 민원행정팀(기타 배분)으로 의미가 바뀜. `note` 필드는 내부 메모(프롬프트에는 안 들어감, Agency 타입에 없음 — 타입에 optional 로 추가해도 됨).
- data/mock-reports.json 의 속도·교통량 1건 라벨을 `yangju-traffic-facility` 로 변경. **Code 탭에서 할 일**: `npm run seed` 로 정확도 재측정(기관 12/12 유지 확인) → 커밋·push(배포본 반영). /admin 카드와 /reports/:token 의 담당 기관 이름이 "양주시 교통 부서" → "양주시 차량관리과 (차량관리팀)" 식으로 바뀌므로 발표자료 시연 캡처는 재배포 후 다시 찍는다.
- 근거: 양주시청 행정조직도(contents.do?key=377)·부서별 업무내용(selectEmployeeList.do). 시민안전과는 교통·통학로 업무가 없고(어린이놀이시설·재난), 통학로 민원은 도로교통국의 교통과·차량관리과·도로관리과에 걸쳐 있음.

## 월간 리포트 UI 개선 (2026-10-14, Cowork 결정)
UX 시안: Claude Design 캔버스 「말하는 지도 학부모 앱 UX 시안」 아트보드 10(개선안 A)·11(개선안 B).
- A(필수, 녹화 전): /admin 도구 줄의 "월간 리포트 · 학교 ▼ · 생성" 제거. 학교 필터를 고르면 카드 목록 위에 그 학교 리포트 패널: 월 선택(YYYY-MM), 상태 칩(미생성/초안/공개됨), 들어갈 신호 수(처리 중·고쳐짐·확인 중, 확인 대기·해당 없음 제외), AI 초안 생성 시각, 지난달 링크, 버튼 "초안 확인하고 공개" / "다시 생성". 모든 학교 상태면 한 줄 요약만.
- B(다음 단계): /admin/reports/[school]/[month] 초안 확인 화면 — 본문 textarea 수정, 자동 점검 3개(첫 문장 숫자=입력, 이름·상호 없음, 점수·순위 없음), 들어간 신호 목록, "학부모에게 공개" / "초안으로 저장" / "AI 초안 다시 받기".
- 데이터: monthly_report에 status('draft'|'published'), publishedAt, editedBy 추가. /schools/[id]/reports/[month]는 published만 조회. generate 라우트는 draft로 저장.
- 법령 표: data/agencies.json 10/11 law.go.kr 대조 완료(제목 3곳·규칙 7조 추가) — 커밋 필요.
