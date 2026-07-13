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
--
-- 전체를 하나의 트랜잭션으로 묶어 중간에 오류가 나면 일부만 적용되지 않도록 하고,
-- 정책/제약조건은 drop ... if exists 후 재생성해 여러 번 실행해도 안전(idempotent)하게 합니다.

begin;

create table if not exists public.transactions (
  id text primary key,
  created_at timestamptz not null default now(),

  -- 공통 필드(환전/해외송금/상담 모두 사용)
  record_type text not null,
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

-- record_type은 정해진 값만 허용한다. 이름을 지정한 named constraint로 만들어
-- 재실행 시 drop ... if exists 후 다시 만들 수 있게 한다(idempotent).
alter table public.transactions drop constraint if exists transactions_record_type_check;
alter table public.transactions
  add constraint transactions_record_type_check
  check (record_type in ('exchange', 'remittance', 'consultation'));

-- recordType별로 어떤 계산 컬럼이 필수/금지인지를 DB 레벨에서도 강제한다.
-- (features/add-transaction/lib/transactionSupabaseMapper.ts의 toTransactionRow()가
--  만드는 조합과 정확히 일치해야 한다.)
--   - exchange: transaction_type/base_rate/spread_rate/preferential_rate/applied_rate/krw_amount 필수,
--               해외송금 전용 필드(principal_krw 등)는 금지
--   - remittance: base_rate/spread_rate/preferential_rate/applied_rate/principal_krw/remittance_fee/
--                 cable_fee/total_withdrawal_krw 필수, transaction_type과 krw_amount는 금지
--   - consultation: 위 계산/환율/거래구분 필드 전부 금지
alter table public.transactions drop constraint if exists transactions_record_type_fields_check;
alter table public.transactions
  add constraint transactions_record_type_fields_check
  check (
    (
      record_type = 'exchange'
      and transaction_type is not null
      and base_rate is not null
      and spread_rate is not null
      and preferential_rate is not null
      and applied_rate is not null
      and krw_amount is not null
      and principal_krw is null
      and remittance_fee is null
      and cable_fee is null
      and total_withdrawal_krw is null
    )
    or (
      record_type = 'remittance'
      and transaction_type is null
      and krw_amount is null
      and base_rate is not null
      and spread_rate is not null
      and preferential_rate is not null
      and applied_rate is not null
      and principal_krw is not null
      and remittance_fee is not null
      and cable_fee is not null
      and total_withdrawal_krw is not null
    )
    or (
      record_type = 'consultation'
      and transaction_type is null
      and base_rate is null
      and spread_rate is null
      and preferential_rate is null
      and applied_rate is null
      and krw_amount is null
      and principal_krw is null
      and remittance_fee is null
      and cable_fee is null
      and total_withdrawal_krw is null
    )
  );

-- authenticated 역할(익명 로그인 세션 포함)만 허용한다.
-- anon 역할에 using(true)/with check(true) 형태의 공개 정책은 만들지 않는다.
-- 정책 이름이 이미 있으면 먼저 제거한 뒤 다시 만들어 여러 번 실행해도 안전하게 한다.

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
  on public.transactions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
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

commit;

-- Supabase 대시보드 > Authentication > Providers에서 "Anonymous Sign-Ins"를 활성화해야
-- 클라이언트의 supabase.auth.signInAnonymously() 호출이 동작한다.
