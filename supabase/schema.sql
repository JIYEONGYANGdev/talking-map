-- 말하는 지도 프로토타입 스키마 (Supabase SQL Editor 에 붙여넣기)
create table if not exists report (
  id text primary key,
  token text unique not null,
  source text not null,
  received_at timestamptz not null,
  raw_text text not null,
  masked_text text not null,
  photo_url text,
  raw_address text,
  lat double precision,
  lng double precision
);

create table if not exists signal (
  id text primary key,
  report_id text references report(id),
  school_id text,
  category text not null,
  lat double precision,
  lng double precision,
  location_confidence text not null,
  agency_id text,
  legal_basis text,
  ai_summary text not null,
  ai_reason text not null,
  status text not null,
  confirmed_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz not null
);

create index if not exists signal_status_idx on signal(status);
create index if not exists signal_school_idx on signal(school_id);

create table if not exists monthly_report (
  school_id text not null,
  month text not null, -- YYYY-MM
  total integer not null,
  resolved integer not null,
  body text not null,
  generated_at timestamptz not null,
  primary key (school_id, month)
);

-- 프로토타입은 서비스 키로만 접근하므로 RLS 는 켜 두되 정책 없이 둔다 (anon 차단)
alter table report enable row level security;
alter table signal enable row level security;
alter table monthly_report enable row level security;

-- 접수 사진 (공무원 전용 열람). 비공개 버킷 — 서버의 서비스 키로만 접근. 없으면 코드가 첫 업로드 때 만든다.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
