-- KB FX Helper: transactions 테이블 + RLS 정책
-- Supabase 대시보드의 SQL Editor에서 1회 실행합니다.
-- 이 앱은 Supabase Auth의 익명 로그인(signInAnonymously)만 사용하며,
-- 각 사용자는 자신의 user_id로 저장한 행만 조회/추가/삭제할 수 있습니다.
--
-- 거래기록은 환전(exchange) / 해외송금(remittance) / 상담(consultation) 세 종류를
-- 하나의 테이블에 저장하며, record_type으로 구분합니다. 각 종류에 해당하지 않는
-- 계산 컬럼은 null입니다(예: 상담 기록은 base_rate 등이 모두 null).
--
-- 기존에 이 스크립트로 만든 exchange 전용 테이블이 이미 있다면, 이 파일을 다시 실행하지 말고
-- docs/supabase-migration-required-records.sql을 실행해 스키마를 확장하세요.

create table if not exists public.transactions (
  id text primary key,
  created_at timestamptz not null default now(),

  -- 공통 필드(환전/해외송금/상담 모두 사용)
  record_type text not null check (record_type in ('exchange', 'remittance', 'consultation')),
  customer_name text not null,
  memo text not null,
  currency_code text not null,
  amount numeric not null,

  -- 환전(exchange) 전용 필드. 해외송금/상담 행에서는 null이다.
  transaction_type text,
  krw_amount numeric,

  -- 환전(exchange)·해외송금(remittance) 공통 계산 필드. 상담 행에서는 null이다.
  base_rate numeric,
  spread_rate numeric,
  preferential_rate numeric,
  applied_rate numeric,

  -- 해외송금(remittance) 전용 필드. 환전/상담 행에서는 null이다.
  principal_krw numeric,
  remittance_fee numeric,
  cable_fee numeric,
  total_withdrawal_krw numeric,

  user_id uuid not null references auth.users (id) on delete cascade
);

-- 목록 조회는 항상 "특정 사용자 + 최신순"이므로 복합 인덱스로 커버한다.
create index if not exists transactions_user_created_idx
  on public.transactions (user_id, created_at desc);

alter table public.transactions enable row level security;

-- authenticated 역할(익명 로그인 세션 포함)만 허용한다.
-- anon 역할에 using(true)/with check(true) 형태의 공개 정책은 만들지 않는다.

create policy "transactions_select_own"
  on public.transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "transactions_insert_own"
  on public.transactions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "transactions_delete_own"
  on public.transactions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 이 앱에는 거래 수정 기능이 없으므로 update 정책은 만들지 않는다.
-- 필요해지면 select/insert/delete와 동일한 auth.uid() = user_id 조건으로 추가한다.

grant usage on schema public to authenticated;

grant select, insert, delete
  on table public.transactions
  to authenticated;

-- Supabase 대시보드 > Authentication > Providers에서 "Anonymous Sign-Ins"를 활성화해야
-- 클라이언트의 supabase.auth.signInAnonymously() 호출이 동작한다.
