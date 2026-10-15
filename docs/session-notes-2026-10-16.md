# 작업 맥락 요약 — Claude Code 세션 (2026-10-13 ~ 10-16)

다른 컴퓨터·다른 세션에서 이어 받을 때 읽는 압축 노트. 결정은 [decisions.md](decisions.md), 할 일은 [handoff.md](handoff.md), 배포는 [deploy.md](deploy.md), AI 활용 기록은 [ai-usage-log.md](ai-usage-log.md). 환경변수 값 등 민감정보는 적지 않는다.

## 0. 한눈에
- 배포본 https://talking-map-2026.vercel.app (Vercel icn1 + Supabase Seoul). main push → 자동 배포. `/api/health` 의 `commit` 으로 반영 확인.
- 10/16 현재 로컬·GitHub·배포본 동일 커밋. 작업 폴더 깨끗함.
- 공무원 화면 비밀번호는 배포본에서 기본값(코드 `lib/auth.ts`)이며 로그인 폼에 미리 채워져 있음. 로컬 `.env.local` 의 값은 다를 수 있음.
- UX 시안 캔버스: https://claude.ai/artifact/PXU2XCjBmBZKm54hxudjT6 (보드 0~11. 10·11 이 공무원 월간 리포트 개선안 A·B). 파일 사본은 세션 스크래치에만 있었으므로 수정은 캔버스를 다시 읽어서.

## 1. 이 기간에 만든 것 (시간순)
| 날짜 | 내용 | 주요 파일 |
|---|---|---|
| 10/13 | 지도: 범례 칩 → 현재 중심에서 가장 가까운 항목으로 이동·말풍선, 목록·마커 클릭 이동, 말풍선 하나만 | `components/SchoolMap.tsx`(focus/onViewChange), `app/schools/[id]/SchoolMapClient.tsx` |
| 10/13 | 스플래시 추가 → 녹화 방해로 끔(`SPLASH_ENABLED=false`) | `components/Splash.tsx` |
| 10/13 | 홈 우측 상단 지역 표시 → 동네 시트(양주시 + 법정동 칩 3열 + 확대 안내), 칩 → 그 동네 학교만 고르기 | `components/RegionSheet.tsx`, `SchoolPicker.tsx`(dong prop), `School.dong`(load-public-data 가 지번주소에서 추출) |
| 10/13 | 시연 학교 "연푸룬초등학교(시연)" → "연푸룬초등학교" | `data/schools.json`, `scripts/seed-demo.ts` |
| 10/13 | 홈 배너: 서버가 학교별 사고다발지역 수를 미리 세어 넘겨 첫 화면부터 정확. 마지막 요약은 localStorage `tm_sum_<school>` 에 캐시 | `app/page.tsx`, `app/Home.tsx`, `lib/local.ts`(readLocal/writeLocal) |
| 10/13 | 신고 사진 입력의 `capture` 제거 → iOS 에서 보관함·파일도 선택 가능 | `app/report/ReportForm.tsx` |
| 10/13 | 배포본 10/13 테스트 신고 8건 삭제. 공무원 삭제 API + 카드 "삭제" 버튼(확인창) | `DELETE /api/admin/signals/:id`, `lib/db.ts deleteSignal`, `AdminBoard.tsx` |
| 10/14 | 홈·지도의 리포트 버튼 "이번 달 AI 요약 리포트 ✦"(공용 `components/Sparkle.tsx`), 지도 버튼 2개 세로 배치 | `app/Home.tsx`, `SchoolMapClient.tsx` |
| 10/14 | **월간 리포트 초안→공개 2단계** (시안 10·11). 패널(학교 고르면 펼침) + 편집 화면 + 자동 점검 3개 + 학부모는 published 만 | `app/admin/ReportPanel.tsx`, `app/admin/reports/[schoolId]/[month]/*`, `lib/report.ts`, `lib/report-server.ts`, `app/api/admin/reports/monthly/**`, `supabase/migrations/2026-10-14_monthly_report_status.sql` |
| 10/14 | **버그 수정: 신고 폼이 고른 학교를 안 보내 "학교 미정"** → schoolId 전송, 서버가 AI 추정보다 우선 | `ReportForm.tsx`, `app/api/reports/route.ts`, `lib/ai.ts`(selectedSchool 힌트) |
| 10/14 | 화면 전환 시 맨 위로 스크롤 | `components/AppShell.tsx` |
| 10/16 | 시연 준비 스위치: 로그인 비번 자동 입력, 삭제 버튼 비활성, 하단 탭 "시청", 홈 클릭 영역 원복, 리포트 패널 모바일 줄바꿈 | `LoginForm.tsx` `DEMO_PASSWORD`, `AdminBoard.tsx` `DELETE_ENABLED`, `AppShell.tsx` `SHOW_ADMIN_TAB`, `Home.tsx` `NARROW_TAP` |
| 10/16 | **AI 크레딧 소진·장애 대비**: 신고 저장 + 안내창(확인), 키워드 임시 분류(직접 검토), 리포트 틀 초안 | `lib/fallback.ts`, `/api/reports` 응답 `aiFailed`, `/api/admin/reports/generate` 응답 `fallback` |
| 10/16 | 문서: decisions.md(결정 기록 규칙), handoff.md | CLAUDE.md "결정 기록 (항상)" |

## 2. 코드만 봐서는 모르는 사실
- **Vercel 은 git 작성자 이메일이 GitHub 계정과 연결돼 있지 않으면 배포를 막는다**("Deployment was blocked"). 10/13 에 겪음. 저장소 로컬 config 에 GitHub noreply 주소를 넣어 두었고, 새 컴퓨터에서는 다시 설정해야 한다. 확인: `gh api repos/JIYEONGYANGdev/talking-map/commits/<sha>/status`.
- 배포본 Supabase 의 `monthly_report` 테이블에 상태 열 마이그레이션이 **아직 실행되지 않았을 수 있다**(사용자 확인 필요). 미실행이면 `lib/db.ts saveMonthlyReport` 가 경고를 남기고 상태 없이 저장 → 초안이 바로 공개로 보임.
- 배포본 데이터(10/16): 시연 학교 신고 8건(사진 6) + 10/13 남긴 `fae4d4fe` 1건(AI 제안) + "(키 점검)" 1건(해당 없음). 월간 리포트 2026-10 은 10/10 생성본(상태 없음 → 공개로 취급).
- 로컬 개발은 파일 저장소(`data/db.json`)이고 데이터 42건(모의+시연). 배포본은 Supabase. 둘은 서로 다른 데이터.
- `/api/health` 는 키 존재 여부만 알려 주고 크레딧 잔액은 모른다. 크레딧 0 이면 모든 Claude 호출 거절 → fallback 경로.
- Claude 호출은 `lib/ai.ts` 의 두 함수뿐(신고 분류 1회/건, 리포트 초안 1회/생성). Sonnet 5.5 는 강제 tool_choice 거부 → auto + strict.
- 모의 신고 정확도(10/7, v2 프롬프트): 종류 12/12·기관 12/12·학교 11/11. 키워드 fallback 도 모의 12건 기준 12/12 이나 정답 보고 맞춘 규칙.
- 리포트에 들어가는 신호 = `updatedAt` 이 그 달 + 상태가 AI 제안·처리 중·고쳐짐. 직접 검토·해당 없음 제외(`lib/report.ts inReport`).

## 3. Claude Code 와 일할 때의 관례 (이 프로젝트)
- 작업 단위마다 커밋·push 하고, `/api/health` commit 이 바뀔 때까지 20초 간격으로 확인한 뒤 보고한다.
- 기능이 바뀌면 CLAUDE.md 해당 절을 같이 고친다. 결정은 `docs/decisions.md`, AI 가 하는 일이 바뀌면 `docs/ai-usage-log.md` 1부.
- 시연용 임시 조치는 반드시 파일 맨 위 상수 스위치로 두고 되돌리는 법을 적는다.
- 공무원 API 테스트는 curl 로 로그인 쿠키를 받아 쓴다(`POST /api/admin/login` → cookie → 이후 요청에 `-b`).
- 코드 밖 작업(기획안·발표자료·대본·조사)은 Cowork 세션으로 넘긴다(CLAUDE.md 작업 분담 규칙).

## 4. 열려 있는 것
handoff.md 3절 표 참고. 사람이 할 일: Supabase 마이그레이션 실행, Vercel 의 ANTHROPIC_API_KEY 확인, 크레딧 잔액 확인·충전, 배포본 테스트 신고 정리 여부 결정, 시연 리허설.
