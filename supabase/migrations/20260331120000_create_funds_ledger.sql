-- 这份 migration 是资金账单功能的数据库基础设施。
-- 因为远端之前有过“部分执行成功”的情况，
-- 所以这里尽量写成可重复执行（idempotent）的形式。

-- 1) 创建账单类型枚举：借出 / 还款
do $$
begin
  create type public.ledger_entry_type as enum ('loan', 'repayment');
exception
  when duplicate_object then null;
end
$$;

alter type public.ledger_entry_type add value if not exists 'loan';
alter type public.ledger_entry_type add value if not exists 'repayment';

-- 2) 创建支付方式枚举
do $$
begin
  create type public.payment_method as enum (
    'wechat',
    'alipay',
    'bank_transfer',
    'cash',
    'other'
  );
exception
  when duplicate_object then null;
end
$$;

alter type public.payment_method add value if not exists 'wechat';
alter type public.payment_method add value if not exists 'alipay';
alter type public.payment_method add value if not exists 'bank_transfer';
alter type public.payment_method add value if not exists 'cash';
alter type public.payment_method add value if not exists 'other';

-- 3) 自动维护 updated_at：
-- 以后只要 update 行数据，这个 trigger function 就会把 updated_at 改成 now()
create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 4) 债务人表：
-- 一个人（user_id）可以维护很多“债务人档案”
create table if not exists public.counterparty (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 常见查询会按 user_id 和 name 查，所以这里提前建索引
create index if not exists counterparty_user_id_idx on public.counterparty (user_id);
create index if not exists counterparty_user_id_lower_name_idx on public.counterparty (user_id, lower(name));

-- 5) 流水表：
-- 每一笔“借出”或“还款”都是一条流水
create table if not exists public.money_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  counterparty_id uuid not null references public.counterparty (id) on delete restrict,
  entry_type public.ledger_entry_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  occurred_at timestamptz not null,
  payment_method public.payment_method not null,
  screenshot_url text,
  screenshot_key text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 这些索引分别服务于：
-- 1. 最近流水列表
-- 2. 按债务人聚合
-- 3. 按账单类型过滤/统计
create index if not exists money_ledger_user_occurred_at_idx
  on public.money_ledger (user_id, occurred_at desc);
create index if not exists money_ledger_user_counterparty_idx
  on public.money_ledger (user_id, counterparty_id);
create index if not exists money_ledger_user_entry_type_idx
  on public.money_ledger (user_id, entry_type);

-- 6) 给两张表挂上 updated_at 自动更新时间的 trigger
drop trigger if exists counterparty_set_updated_at on public.counterparty;
create trigger counterparty_set_updated_at
before update on public.counterparty
for each row
execute function public.set_row_updated_at();

drop trigger if exists money_ledger_set_updated_at on public.money_ledger;
create trigger money_ledger_set_updated_at
before update on public.money_ledger
for each row
execute function public.set_row_updated_at();

-- 7) 开启 RLS（行级权限）
-- 开启后，默认所有数据都不允许访问，除非单独写 policy。
alter table public.counterparty enable row level security;
alter table public.money_ledger enable row level security;

-- 8) counterparty 的 RLS policy：
-- 只允许用户读写自己的债务人
drop policy if exists "counterparty_select_own" on public.counterparty;
create policy "counterparty_select_own"
on public.counterparty
for select
using (auth.uid() = user_id);

drop policy if exists "counterparty_insert_own" on public.counterparty;
create policy "counterparty_insert_own"
on public.counterparty
for insert
with check (auth.uid() = user_id);

drop policy if exists "counterparty_update_own" on public.counterparty;
create policy "counterparty_update_own"
on public.counterparty
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "counterparty_delete_own" on public.counterparty;
create policy "counterparty_delete_own"
on public.counterparty
for delete
using (auth.uid() = user_id);

-- 9) money_ledger 的 RLS policy：
-- 只允许用户读写自己的流水
drop policy if exists "money_ledger_select_own" on public.money_ledger;
create policy "money_ledger_select_own"
on public.money_ledger
for select
using (auth.uid() = user_id);

drop policy if exists "money_ledger_insert_own" on public.money_ledger;
create policy "money_ledger_insert_own"
on public.money_ledger
for insert
with check (auth.uid() = user_id);

drop policy if exists "money_ledger_update_own" on public.money_ledger;
create policy "money_ledger_update_own"
on public.money_ledger
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "money_ledger_delete_own" on public.money_ledger;
create policy "money_ledger_delete_own"
on public.money_ledger
for delete
using (auth.uid() = user_id);

-- 10) 显式授权给 authenticated 角色。
-- 注意：即使 grant 了，最终能不能访问还是要过 RLS。
grant select, insert, update, delete on public.counterparty to authenticated;
grant select, insert, update, delete on public.money_ledger to authenticated;

-- 11) 聚合视图：
-- 前端 dashboard / 汇总表，都会优先从这个视图里读结果，
-- 不需要每次自己在前端算“借出 - 还款”。
create or replace view public.debt_balance_view
with (security_invoker = true) as
select
  ledger.user_id,
  ledger.counterparty_id,
  party.name as counterparty_name,
  coalesce(
    sum(case when ledger.entry_type = 'loan' then ledger.amount else 0 end),
    0
  )::numeric(12, 2) as loan_total,
  coalesce(
    sum(case when ledger.entry_type = 'repayment' then ledger.amount else 0 end),
    0
  )::numeric(12, 2) as repaid_total,
  (
    coalesce(
      sum(case when ledger.entry_type = 'loan' then ledger.amount else 0 end),
      0
    ) -
    coalesce(
      sum(case when ledger.entry_type = 'repayment' then ledger.amount else 0 end),
      0
    )
  )::numeric(12, 2) as outstanding_amount,
  max(ledger.occurred_at) as last_occurred_at
from public.money_ledger as ledger
inner join public.counterparty as party
  on party.id = ledger.counterparty_id
group by ledger.user_id, ledger.counterparty_id, party.name;

-- 允许已登录用户读取这个视图
grant select on public.debt_balance_view to authenticated;
