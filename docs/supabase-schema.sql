-- KB FX Helper: transactions 테이블 + RLS 정책
-- Supabase 대시보드의 SQL Editor에서 1회 실행합니다.
-- 이 앱은 Supabase Auth의 익명 로그인(signInAnonymously)만 사용하며,
-- 각 사용자는 자신의 user_id로 저장한 행만 조회/추가/삭제할 수 있습니다.

create table if not exists public.transactions (
  id text primary key,
  created_at timestamptz not null default now(),
  currency_code text not null,
  transaction_type text not null,
  amount numeric not null,
  base_rate numeric not null,
  spread_rate numeric not null,
  preferential_rate numeric not null,
  applied_rate numeric not null,
  krw_amount numeric not null,
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

-- Supabase 대시보드 > Authentication > Providers에서 "Anonymous Sign-Ins"를 활성화해야
-- 클라이언트의 supabase.auth.signInAnonymously() 호출이 동작한다.
