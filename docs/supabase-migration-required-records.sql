-- KB FX Helper: transactions 테이블을 Transaction union(환전/해외송금/상담) 전체를
-- 저장할 수 있도록 확장하는 migration.
-- 기존에 docs/supabase-schema.sql로 만든 exchange 전용 테이블에 대해 1회 실행합니다.
-- 반복 실행해도 안전하도록(idempotent) `if not exists`/`if exists`와 값이 있을 때만
-- 채우는 조건부 UPDATE를 사용합니다.
-- 전체를 하나의 트랜잭션으로 묶어, 중간에 오류가 발생하면 일부만 적용되지 않고
-- 전체가 롤백되도록 합니다.

begin;

-- 1) 공통 컬럼(record_type/customer_name/memo) 추가.
--    기존 행은 모두 환전 거래이므로 뒤에서 record_type = 'exchange', customer_name/memo = ''로 보정한다.
alter table public.transactions
  add column if not exists record_type text,
  add column if not exists customer_name text,
  add column if not exists memo text;

-- 2) 해외송금 전용 컬럼 추가.
alter table public.transactions
  add column if not exists principal_krw numeric,
  add column if not exists remittance_fee numeric,
  add column if not exists cable_fee numeric,
  add column if not exists total_withdrawal_krw numeric;

-- 3) 상담/해외송금 기록은 환전 전용 계산 컬럼을 쓰지 않으므로 nullable로 변경한다.
--    (신규 설치 시에는 docs/supabase-schema.sql이 처음부터 nullable로 만든다.)
alter table public.transactions alter column transaction_type drop not null;
alter table public.transactions alter column base_rate drop not null;
alter table public.transactions alter column spread_rate drop not null;
alter table public.transactions alter column preferential_rate drop not null;
alter table public.transactions alter column applied_rate drop not null;
alter table public.transactions alter column krw_amount drop not null;

-- 4) 기존 데이터를 안전하게 보정한다. record_type이 비어 있는(NULL 또는 공백뿐인) 행은 모두
--    "migration 이전에 저장된 환전 거래"이므로 exchange로, customer_name/memo는 빈 문자열로 채운다.
--    이미 값이 채워진 행(재실행 시)은 건드리지 않는다.
update public.transactions
  set record_type = 'exchange'
  where record_type is null
     or btrim(record_type) = '';

update public.transactions
  set customer_name = ''
  where customer_name is null;

update public.transactions
  set memo = ''
  where memo is null;

-- 5) 보정이 끝난 뒤에는 공통 컬럼을 not null로 강제한다.
alter table public.transactions alter column record_type set not null;
alter table public.transactions alter column customer_name set not null;
alter table public.transactions alter column memo set not null;

-- 6) record_type은 정해진 값(exchange/remittance/consultation)만 허용한다.
--    같은 이름의 제약이 이미 있으면 먼저 제거한 뒤 다시 만들어 재실행에도 안전하게 한다.
alter table public.transactions drop constraint if exists transactions_record_type_check;
alter table public.transactions
  add constraint transactions_record_type_check
  check (record_type in ('exchange', 'remittance', 'consultation'));

-- 6-1) recordType별로 어떤 계산 컬럼이 필수/금지인지를 DB 레벨에서도 강제한다.
--      (features/add-transaction/lib/transactionSupabaseMapper.ts의 toTransactionRow()가
--       만드는 조합과 정확히 일치해야 한다.) 이 migration 이전에 저장된 행은 전부
--       exchange이며, 원래 스키마에서 이 컬럼들이 이미 not null이었고 해외송금 전용
--       컬럼(principal_krw 등)은 방금 추가되어 전부 null이므로 아래 exchange 조건을
--       위반하지 않는다. 같은 이름의 제약이 이미 있으면 먼저 제거한다.
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

-- 7) 기존 RLS 정책은 그대로 유지한다(변경하지 않음). 아래 GRANT만 추가로 보장한다.
grant usage on schema public to authenticated;

grant select, insert, delete
  on table public.transactions
  to authenticated;

-- 참고: 이 앱에는 거래 수정(update) 기능이 없으므로 update 권한/정책은 추가하지 않는다.

commit;
