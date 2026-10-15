# 인수인계 — 다른 컴퓨터에서 이어 개발하기 (2026-10-16)

배포본: https://talking-map-2026.vercel.app (main push 시 자동 배포). 상태 확인 `/api/health` 의 `commit` 이 GitHub 최신 커밋과 같으면 반영된 것.
결정 사항은 [decisions.md](decisions.md), AI 활용 기록은 [ai-usage-log.md](ai-usage-log.md), 배포 절차는 [deploy.md](deploy.md).

## 1. git 에 없는 것 (직접 옮겨야 함)
`.gitignore` 로 제외된 파일이라 clone 해도 없다. **값은 이 문서에 적지 않는다.**

| 항목 | 내용 | 없으면 |
|---|---|---|
| `.env.local` | `ANTHROPIC_API_KEY`(워크스페이스 키), `ANTHROPIC_WORKSPACE_ID`(조직 키일 때만), `ANTHROPIC_MODEL`(선택), `ADMIN_PASSWORD`(선택, 없으면 기본값), `DATA_GO_KR_KEY`(사고다발지역 적재 때만), `SUPABASE_URL`·`SUPABASE_SERVICE_KEY`(로컬은 비워 두면 파일 저장소) | AI 호출 실패 → 신고가 "직접 검토"로 들어감 |
| `.claude/launch.json` | 개발 서버 설정: `{"name":"dev","runtimeExecutable":"zsh","runtimeArgs":["-c","npm run dev"],"port":3000}` | Claude Code 미리보기에서 서버를 못 띄움. 터미널 `npm run dev` 는 됨 |
| `data/db.json`, `data/photos/`, `data/reports/` | 로컬 시연 데이터 (신고·신호·사진·월간 리포트) | `npm run demo` 로 다시 생성 (Claude 호출 ~9회, 수 분) |
| `data/raw/` | 공공데이터 CSV(UTF-8 변환본) | 평소 불필요. 적재 결과 `data/schools.json` 등은 git 에 있음 |

비밀값 전달은 비밀번호 관리자나 AirDrop 등 본인 기기 간 채널로. 이메일·채팅에 붙여 넣지 않는다.

## 2. 새 컴퓨터 세팅 순서
1. nvm 으로 Node 22 (`.nvmrc`). 시스템 Node 14 로 `npm install` 하면 lockfile 이 망가진다.
2. `git clone` → `npm install` → `.env.local` 복사 → `npm run demo` (또는 `.env.local` 에 Supabase 를 넣어 배포본 데이터를 그대로 쓰기).
3. git 작성자 이메일을 GitHub 계정에 연결된 주소로: `git config user.email "<id>+<login>@users.noreply.github.com"`. 호스트명 이메일로 push 하면 Vercel 이 "Deployment was blocked" 로 배포를 막는다.
4. `npm run dev` → http://localhost:3000, 공무원 http://localhost:3000/admin.

## 3. 최종 시연 전 할 일
| # | 할 일 | 상태 (10/16) |
|---|---|---|
| 1 | 홈 카드 클릭 영역 다시 넓히기 (`app/Home.tsx` `NARROW_TAP=false`) | 완료 |
| 2 | 스플래시 — 앱에서는 끔, 영상에 따로 붙임 (`components/Splash.tsx`) | 결정대로 꺼 둠 |
| 3 | 공무원 로그인 비밀번호 자동 입력 (`app/admin/LoginForm.tsx`) | 완료 |
| 4 | 카드 "삭제" 버튼 비활성 (`app/admin/AdminBoard.tsx` `DELETE_ENABLED=false`) | 완료 |
| 5 | 하단 탭 "시청" 진입점 (`components/AppShell.tsx` `SHOW_ADMIN_TAB`) | 완료 |
| 6 | Supabase SQL Editor 에서 `supabase/migrations/2026-10-14_monthly_report_status.sql` 실행 | **사람이 할 일** — 안 하면 리포트 초안이 바로 공개로 보임 |
| 7 | 새 ANTHROPIC_API_KEY 가 Vercel 환경변수에도 들어갔는지 확인 (배포본에서 신고 1건 접수해 보면 바로 앎) | **사람이 할 일** |
| 8 | 배포본 테스트 신고 정리 (10/13 남긴 fae4d4fe 등). 전체 초기화는 `DELETE /api/admin/data` 후 `npm run demo` (deploy.md 3절) | 미정 — 지울 것을 정해서 요청 |
| 9 | 시연 대본대로 리허설 (학부모: 홈 → 신고 3단계 → 진행 확인 → 지도 / 공무원: 확정 → 고쳐짐 → 리포트 초안 → 공개) | 미정 |

## 4. 실서비스로 넘길 때 되돌릴 스위치
- `LoginForm.tsx` `DEMO_PASSWORD` → `""`, Vercel 에 `ADMIN_PASSWORD` 설정
- `AdminBoard.tsx` `DELETE_ENABLED` → 필요에 따라
- `AppShell.tsx` `SHOW_ADMIN_TAB` → `false`
- `Splash.tsx` `SPLASH_ENABLED` → `true`, `HOLD_UNTIL_TAP` → `false`
