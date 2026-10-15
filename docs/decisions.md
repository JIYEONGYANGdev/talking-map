# 결정 기록 (Decision log)

제품·운영에 영향을 주는 결정을 날짜순으로 남긴다. 코드에 스위치가 있으면 그 위치를 적는다. 환경변수 값 같은 민감정보는 적지 않는다.
새 결정이 생기면 이 파일에 한 줄 추가하고, 되돌리면 "되돌림" 으로 표시한다. (규칙: CLAUDE.md "결정 기록")

| 날짜 | 결정 | 이유 | 코드 위치 / 되돌리는 법 |
|---|---|---|---|
| 2026-10-07 | Claude 프롬프트 v2 채택 (보행 장애물 → 인도·도로 파손 규칙 추가). 종류 정의·기관 표는 안 바꿈 | 모의 12건 정확도 11/12 → 12/12 | `prompts/v2.ts`, `lib/ai.ts` |
| 2026-10-10 | 담당 기관 표를 양주시 실제 과·팀 기준으로 교체 (교통시설팀 추가, 차량관리과·민원여권과 의미 변경) | 조직도 분석 결과 시민안전과는 통학로 업무가 없음 | `data/agencies.json` (백업 `data/agencies.backup-2026-10-10.json`) |
| 2026-10-10 | 학부모 화면 모바일 전면 개편 + 새 팔레트(센디 자료 톤) | 시안 캔버스 v2 | `app/globals.css @theme`, 시안 https://claude.ai/artifact/PXU2XCjBmBZKm54hxudjT6 |
| 2026-10-13 | 시연 학교 이름에서 "(시연)" 제거 → "연푸룬초등학교" | 시연 영상 녹화 | `data/schools.json`, `scripts/seed-demo.ts` |
| 2026-10-13 | 스플래시는 앱에서 끄고 영상에 따로 붙인다 | 화면 사이사이 떠서 녹화 방해 | `components/Splash.tsx` `SPLASH_ENABLED=false` (켜려면 true, `HOLD_UNTIL_TAP=false` 면 1.6초 자동) |
| 2026-10-13 | 홈 카드 클릭 영역을 글자·아이콘만으로 좁힘 (녹화용) | 녹화 중 오터치 방지 | `app/Home.tsx` `NARROW_TAP` — **2026-10-16 되돌림(false)** |
| 2026-10-13 | 공무원 API 에 신호 삭제 추가 (신고·사진 함께 삭제) | 테스트 신고 정리 | `DELETE /api/admin/signals/:id`, 카드 "삭제" 버튼 |
| 2026-10-14 | 월간 리포트는 "AI 초안 → 담당자 공개" 2단계. 공개 전 자동 점검 3개 불통과면 공개 불가 | 신고 카드의 확정 원칙을 리포트에도 적용 (시안 10·11) | `app/admin/ReportPanel.tsx`, `app/admin/reports/[schoolId]/[month]/`, `lib/report.ts`. Supabase 는 `supabase/migrations/2026-10-14_monthly_report_status.sql` 필요 |
| 2026-10-14 | 리포트에 들어가는 신호 = AI 제안(확인 중)·처리 중·고쳐짐. 직접 검토·해당 없음 제외 | 기존 generate 규칙 유지. 시안의 "확인 대기 제외" 문구는 데이터 기준에 맞춰 "직접 검토·해당 없음 제외"로 | `lib/report.ts inReport` |
| 2026-10-14 | 신고 폼에서 고른 학교를 서버가 AI 추정보다 우선 연결 | "학교 미정" 버그 (폼이 학교를 안 보내고 있었음) | `app/api/reports/route.ts` |
| 2026-10-16 | 공무원 로그인 비밀번호를 시연용으로 미리 채워 둠 | 시연 흐름 끊김 방지 | `app/admin/LoginForm.tsx` `DEMO_PASSWORD` — 실서비스 전환 때 "" 로 |
| 2026-10-16 | 카드 "삭제" 버튼은 보이되 눌리지 않게 | 시연 중 실수 방지 (API 는 열려 있음) | `app/admin/AdminBoard.tsx` `DELETE_ENABLED=false` |
| 2026-10-16 | 학부모 하단 탭에 공무원 진입점 "시청" 추가 (시연용) | 심사 시연에서 공무원 화면으로 바로 이동. 이름은 "기관·지자체"보다 처리 주체가 바로 읽히는 "시청" | `components/AppShell.tsx` `SHOW_ADMIN_TAB` — 실서비스에는 false |
| 2026-10-16 | 배포본 ADMIN_PASSWORD 는 환경변수 없이 기본값 사용 (시연 기간) | 비밀번호 자동 입력과 맞춤 | 실서비스 전환 때 Vercel 환경변수 설정 + `DEMO_PASSWORD` 비움 |
