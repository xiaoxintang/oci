-- 这份 migration 是补丁：
-- 某次远端初始化时，money_ledger -> counterparty 的外键没有完整建好，
-- 导致 PostgREST 无法识别两张表的关系。
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'money_ledger_counterparty_id_fkey'
      and conrelid = 'public.money_ledger'::regclass
  ) then
    -- 只有在缺少约束时才补建，避免重复执行时报错
    alter table public.money_ledger
      add constraint money_ledger_counterparty_id_fkey
      foreign key (counterparty_id)
      references public.counterparty (id)
      on delete restrict;
  end if;
end
$$;
