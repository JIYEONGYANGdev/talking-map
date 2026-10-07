# 배포 가이드 (Vercel + Supabase + 커스텀 도메인)

로컬은 `data/db.json` 파일 저장소로 돌지만, Vercel 같은 서버리스에서는 파일 쓰기가 유지되지 않는다.
그래서 배포본은 **Supabase(Postgres)** 에 신고·신호·월간 리포트를 저장한다. 코드는 환경변수만 보고 자동으로 전환한다(`lib/db.ts`).

## 0. 준비물 (사람이 만들어야 하는 것)
| 항목 | 어디서 | 무료 범위 |
| --- | --- | --- |
| GitHub 저장소 | 이미 있음 https://github.com/JIYEONGYANGdev/talking-map | — |
| Vercel 계정 | https://vercel.com → "Continue with GitHub" | Hobby 플랜 무료(비상업 용도) |
| Supabase 프로젝트 | https://supabase.com → New project (리전 Northeast Asia (Seoul)) | Free 플랜(500MB) |
| 도메인 | 이미 가진 것, 또는 Vercel 에서 바로 구매(연 $15 안팎) / 가비아·호스팅케이알 등 | 없으면 `*.vercel.app` 주소로 먼저 배포 |

## 1. Supabase
1. 프로젝트 생성 후 **SQL Editor** → `supabase/schema.sql` 내용 전체를 붙여넣고 Run. 테이블 3개(report, signal, monthly_report)가 생긴다.
2. **Project Settings → API** 에서
   - `Project URL` → `SUPABASE_URL`
   - `service_role` 키(secret) → `SUPABASE_SERVICE_KEY` ← 서버에서만 쓴다. 브라우저·깃에 절대 넣지 않는다.

## 2. Vercel 에 저장소 연결
1. Vercel 대시보드 → **Add New → Project** → GitHub 의 `talking-map` Import.
2. Framework Preset: Next.js (자동 감지). Root Directory 그대로.
3. **Environment Variables** 에 아래를 넣는다(Production + Preview 둘 다):

| 이름 | 값 |
| --- | --- |
| `ANTHROPIC_API_KEY` | 콘솔에서 발급한 워크스페이스 범위 키 |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` |
| `ADMIN_PASSWORD` | 공무원 화면 비밀번호 (로컬 `.env.local` 과 달라도 됨) |
| `SUPABASE_URL` | 1-2 의 Project URL |
| `SUPABASE_SERVICE_KEY` | 1-2 의 service_role 키 |
| `DATA_GO_KR_KEY` | (선택) 사고다발지역 재적재 스크립트용. 배포 런타임에는 안 쓴다 |

4. **Deploy**. 2~3분 뒤 `https://talking-map-xxxx.vercel.app` 가 생긴다. 이후 `main` 에 push 할 때마다 자동 배포, PR 은 Preview 배포.

## 3. 배포 직후 점검
```bash
BASE=https://talking-map-xxxx.vercel.app
curl -s $BASE/api/schools | head -c 200            # 학교 목록(=data/*.json 번들 포함 확인)
curl -s -X POST $BASE/api/reports -H 'content-type: application/json' \
  -d '{"text":"옥정초 정문 앞 횡단보도 신호등이 꺼져 있어요","address":"옥정초등학교 정문"}'   # ai_proposed 면 Claude + Supabase 정상
```
- `/admin` 로그인 → 방금 신고가 "AI 제안 대기"에 보이면 끝.
- 시연 데이터를 배포본에도 넣으려면: `BASE=https://... ADMIN_PASSWORD=배포비번 npm run demo` (로컬에서 실행, 배포 서버의 API 를 호출한다).
  단, 가상 학교 `demo-yeonpurun` 은 `data/schools.json` 에 이미 커밋돼 있어 배포본에도 존재한다.

## 4. 커스텀 도메인
1. Vercel 프로젝트 → **Settings → Domains** → 도메인 입력(예: `talkingmap.kr`, `map.example.kr`).
2. Vercel 이 알려주는 DNS 레코드를 도메인 등록업체에 넣는다.
   - 루트 도메인: `A` 레코드 → `76.76.21.21`
   - 서브도메인(`www`, `map` 등): `CNAME` → `cname.vercel-dns.com`
   - 네임서버를 Vercel 로 통째로 옮기는 방법도 있다(Vercel 이 안내).
3. 전파(수 분~수 시간) 후 Vercel 이 HTTPS 인증서를 자동 발급한다. 추가 설정 없음.
4. 도메인을 Vercel 에서 바로 사면 1~3 이 자동이다.

## 5. 서버리스에서 바뀌는 것 (코드에 이미 반영)
- `next.config.ts` `outputFileTracingIncludes`: `data/*.json` 을 함수 번들에 포함(학교·보호구역·기관·사고다발).
- 월간 리포트: 파일 대신 `monthly_report` 테이블(`store.saveMonthlyReport`).
- `/api/reports`, `/api/admin/reports/generate`: `maxDuration = 60` (사진 포함 Claude 호출이 기본 10초를 넘길 수 있음).
- Supabase 변수 없이 Vercel 에서 뜨면 서버 로그에 경고가 찍히고 신고 접수가 실패한다.

## 6. 운영 메모
- 공공데이터 갱신: 로컬에서 `npm run load-data` / `npm run load-accidents` → JSON 커밋·push → 자동 재배포.
- 비밀번호·키를 바꾸면 Vercel 환경변수 수정 후 **Redeploy**.
- 무료 플랜 제한: Vercel Hobby 는 상업적 이용 불가·함수 실행 시간 제한, Supabase Free 는 1주일 미사용 시 일시정지(대시보드에서 재개). 공모전 시연에는 충분하다.
