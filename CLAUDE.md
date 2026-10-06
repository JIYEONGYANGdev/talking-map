@AGENTS.md

# 프로젝트 컨텍스트 — 말하는 지도, 우리 아이 등굣길

양주시 미래인재 AI 공모전 프로토타입(팀 지제가). 제출 10/16. 완성도보다 "한 바퀴가 도는 시연"이 목표.

## 한 바퀴 (절대 깨지면 안 됨)
신고 폼(/report: 사진+글+지도 탭) → POST /api/reports → lib/mask.ts 마스킹 → lib/ai.ts Claude 1회 호출(학교 연결·종류·담당기관, tool use JSON) → signal(ai_proposed) 저장 → 공무원 /admin 확정(PATCH /api/admin/signals/:id) → 학부모 /schools/:id 지도 마커 색 변경 → /reports/:token 진행 확인.

## 설계 원칙 (기획안에서 온 것, 바꾸지 말 것)
- 학교에 점수·순위를 매기지 않는다. 변화(점검 우선/처리 중/고쳐짐)만 보여준다.
- AI 결과는 공무원 확정 전에는 학부모에게 "검토 중"으로만 보인다. 지도에는 confirmed 이후만 표시.
- AI는 위험 여부를 판단하지 않는다. 종류·위치·담당기관 정리만.
- 학교는 data/schools.json 목록 밖, 기관은 data/agencies.json 표 밖의 값을 쓰면 서버가 거부한다(lib/ai.ts 하단).
- 이름·전화·차량번호는 AI 전송 전 마스킹. 사진·신고자·학원·가게 이름은 시민 화면 비노출.

## 저장소
- SUPABASE_URL 없으면 data/db.json 파일 저장소(로컬 시연용). Vercel 배포 시 Supabase 필수(supabase/schema.sql).
- data/schools.json 의 3개 학교는 임시 좌표(sample:true). `npm run load-data` 로 공공데이터 CSV(data/raw/)에서 교체.

## 명령
npm run dev / npm run load-data / npm run seed (모의 신고 투입 + 정확도 출력) / npm run build

## 10일 일정의 남은 일 (10/7~)
1. 공공데이터 CSV 적재로 임시 학교 교체 → 모의 신고 12건의 학교명을 실제 이름으로 수정
2. Claude 호출 실제 테스트, 프롬프트(prompts/v1.ts) 다듬기, npm run seed 정확도 확인
3. /admin 에서 좌표 보정(지도 클릭) UI — 현재는 PATCH 에 lat/lng 만 받음
4. 어린이 사고다발지역 API(data.go.kr 15058311) 레이어 — 양주시 결과 0건이면 "사고 지도에 없음" 문구로 대체
5. 모바일 화면 다듬기(디자이너 와이어프레임 반영), 시연 대본대로 리허설
