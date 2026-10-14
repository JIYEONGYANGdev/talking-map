-- 월간 리포트 초안→공개 상태 (2026-10-14). 이미 schema.sql 로 만든 프로젝트는 이 파일을 SQL Editor 에서 한 번 실행한다.
-- 기존 리포트는 이미 학부모에게 보이고 있었으므로 published 로 둔다.
alter table monthly_report
  add column if not exists status text not null default 'published',
  add column if not exists published_at timestamptz,
  add column if not exists edited_at timestamptz,
  add column if not exists edit_count integer not null default 0;
alter table monthly_report alter column status set default 'draft';
