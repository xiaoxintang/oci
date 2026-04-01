-- 车辆管理系统 v3
-- 这份 migration 直接重做旧的 car 表结构，不保留历史兼容。

create extension if not exists btree_gist;

do $$
begin
  create type public.car_energy_type as enum ('fuel', 'electric', 'hybrid');
exception
  when duplicate_object then null;
end
$$;

alter type public.car_energy_type add value if not exists 'fuel';
alter type public.car_energy_type add value if not exists 'electric';
alter type public.car_energy_type add value if not exists 'hybrid';

do $$
begin
  create type public.insurance_type as enum ('compulsory', 'commercial');
exception
  when duplicate_object then null;
end
$$;

alter type public.insurance_type add value if not exists 'compulsory';
alter type public.insurance_type add value if not exists 'commercial';

do $$
begin
  create type public.maintenance_category as enum ('basic', 'engine');
exception
  when duplicate_object then null;
end
$$;

alter type public.maintenance_category add value if not exists 'basic';
alter type public.maintenance_category add value if not exists 'engine';

do $$
begin
  create type public.maintenance_item_code as enum (
    'tire_rotation',
    'brake_fluid',
    'engine_coolant',
    'battery_coolant',
    'transmission_gear_oil',
    'engine_oil_and_filter',
    'fuel_system_cleaner',
    'spark_plug',
    'fuel_filter',
    'air_filter_element'
  );
exception
  when duplicate_object then null;
end
$$;

alter type public.maintenance_item_code add value if not exists 'tire_rotation';
alter type public.maintenance_item_code add value if not exists 'brake_fluid';
alter type public.maintenance_item_code add value if not exists 'engine_coolant';
alter type public.maintenance_item_code add value if not exists 'battery_coolant';
alter type public.maintenance_item_code add value if not exists 'transmission_gear_oil';
alter type public.maintenance_item_code add value if not exists 'engine_oil_and_filter';
alter type public.maintenance_item_code add value if not exists 'fuel_system_cleaner';
alter type public.maintenance_item_code add value if not exists 'spark_plug';
alter type public.maintenance_item_code add value if not exists 'fuel_filter';
alter type public.maintenance_item_code add value if not exists 'air_filter_element';

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.assert_car_metric_pair(
  input_energy_type public.car_energy_type,
  input_engine_km numeric,
  input_ev_km numeric
)
returns void
language plpgsql
as $$
begin
  if coalesce(input_engine_km, 0) < 0 or coalesce(input_ev_km, 0) < 0 then
    raise exception '里程不能小于 0。';
  end if;

  if input_energy_type = 'fuel' and coalesce(input_ev_km, 0) <> 0 then
    raise exception '纯油车的纯电里程必须为 0。';
  end if;

  if input_energy_type = 'electric' and coalesce(input_engine_km, 0) <> 0 then
    raise exception '纯电车的发动机里程必须为 0。';
  end if;
end;
$$;

drop table if exists public.car cascade;

create table public.car (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  plate_number text,
  energy_type public.car_energy_type not null,
  buy_at date,
  note text,
  current_engine_km numeric(12, 1) not null default 0 check (current_engine_km >= 0),
  current_ev_km numeric(12, 1) not null default 0 check (current_ev_km >= 0),
  current_total_km numeric(12, 1) generated always as (current_engine_km + current_ev_km) stored,
  last_mileage_recorded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_plate_number_non_blank check (
    plate_number is null or nullif(btrim(plate_number), '') is not null
  )
);

create or replace function public.validate_car_row()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_car_metric_pair(
    new.energy_type,
    new.current_engine_km,
    new.current_ev_km
  );

  return new;
end;
$$;

create table if not exists public.car_mileage_log (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.car (id) on delete cascade,
  recorded_at timestamptz not null,
  engine_km numeric(12, 1) not null default 0 check (engine_km >= 0),
  ev_km numeric(12, 1) not null default 0 check (ev_km >= 0),
  total_km numeric(12, 1) generated always as (engine_km + ev_km) stored,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.validate_car_metric_log()
returns trigger
language plpgsql
as $$
declare
  target_energy_type public.car_energy_type;
begin
  select energy_type
  into target_energy_type
  from public.car
  where id = new.car_id;

  if target_energy_type is null then
    raise exception '未找到对应车辆。';
  end if;

  perform public.assert_car_metric_pair(
    target_energy_type,
    new.engine_km,
    new.ev_km
  );

  return new;
end;
$$;

create or replace function public.sync_car_current_mileage(target_car_id uuid)
returns void
language plpgsql
as $$
declare
  latest_log record;
begin
  select
    recorded_at,
    engine_km,
    ev_km
  into latest_log
  from public.car_mileage_log
  where car_id = target_car_id
  order by recorded_at desc, created_at desc, id desc
  limit 1;

  if latest_log is null then
    update public.car
    set
      current_engine_km = 0,
      current_ev_km = 0,
      last_mileage_recorded_at = null
    where id = target_car_id;
  else
    update public.car
    set
      current_engine_km = latest_log.engine_km,
      current_ev_km = latest_log.ev_km,
      last_mileage_recorded_at = latest_log.recorded_at
    where id = target_car_id;
  end if;
end;
$$;

create or replace function public.handle_car_mileage_log_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_car_current_mileage(old.car_id);
    return old;
  end if;

  perform public.sync_car_current_mileage(new.car_id);

  if tg_op = 'UPDATE' and old.car_id <> new.car_id then
    perform public.sync_car_current_mileage(old.car_id);
  end if;

  return new;
end;
$$;

create table if not exists public.car_insurance_policy (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.car (id) on delete cascade,
  insurance_type public.insurance_type not null,
  purchased_at date not null,
  premium_amount numeric(12, 2) not null check (premium_amount >= 0),
  effective_start_at timestamptz not null,
  effective_end_at timestamptz not null,
  voucher_key text,
  voucher_url text,
  contact_name text,
  contact_phone text,
  contact_note text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_insurance_policy_effective_range check (
    effective_end_at >= effective_start_at
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'car_insurance_policy_no_overlap'
      and conrelid = 'public.car_insurance_policy'::regclass
  ) then
    alter table public.car_insurance_policy
      add constraint car_insurance_policy_no_overlap
      exclude using gist (
        car_id with =,
        insurance_type with =,
        tstzrange(effective_start_at, effective_end_at, '[]') with &&
      );
  end if;
end
$$;

create table if not exists public.maintenance_item_catalog (
  code public.maintenance_item_code primary key,
  category public.maintenance_category not null,
  label text not null,
  default_interval_km numeric(12, 1) not null check (default_interval_km >= 0),
  default_interval_days integer not null check (default_interval_days >= 0),
  requires_note boolean not null default false,
  enabled_for_fuel boolean not null default false,
  enabled_for_electric boolean not null default false,
  enabled_for_hybrid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.maintenance_item_catalog (
  code,
  category,
  label,
  default_interval_km,
  default_interval_days,
  requires_note,
  enabled_for_fuel,
  enabled_for_electric,
  enabled_for_hybrid
)
values
  ('tire_rotation', 'basic', '轮胎换位', 10000, 180, false, true, true, true),
  ('brake_fluid', 'basic', '制动液', 40000, 730, false, true, true, true),
  ('engine_coolant', 'basic', '发动机冷却液', 40000, 730, false, true, false, true),
  ('battery_coolant', 'basic', '电池冷却液', 40000, 730, false, false, true, true),
  ('transmission_gear_oil', 'basic', '变速器齿轮油', 60000, 1095, true, true, false, true),
  ('engine_oil_and_filter', 'engine', '更换机油及机油滤清器', 10000, 365, false, true, false, true),
  ('fuel_system_cleaner', 'engine', '汽油清净剂', 10000, 365, false, true, false, true),
  ('spark_plug', 'engine', '火花塞', 40000, 730, false, true, false, true),
  ('fuel_filter', 'engine', '燃油滤清器', 40000, 730, false, true, false, true),
  ('air_filter_element', 'engine', '空气滤清器滤芯', 10000, 365, false, true, false, true)
on conflict (code) do update
set
  category = excluded.category,
  label = excluded.label,
  default_interval_km = excluded.default_interval_km,
  default_interval_days = excluded.default_interval_days,
  requires_note = excluded.requires_note,
  enabled_for_fuel = excluded.enabled_for_fuel,
  enabled_for_electric = excluded.enabled_for_electric,
  enabled_for_hybrid = excluded.enabled_for_hybrid,
  updated_at = now();

create table if not exists public.car_maintenance_config (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.car (id) on delete cascade,
  item_code public.maintenance_item_code not null references public.maintenance_item_catalog (code) on delete cascade,
  enabled_override boolean,
  interval_km_override numeric(12, 1) check (interval_km_override is null or interval_km_override >= 0),
  interval_days_override integer check (interval_days_override is null or interval_days_override >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_maintenance_config_unique unique (car_id, item_code)
);

create table if not exists public.car_maintenance_service_log (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.car (id) on delete cascade,
  item_code public.maintenance_item_code not null references public.maintenance_item_catalog (code) on delete cascade,
  performed_at timestamptz not null,
  engine_km numeric(12, 1) not null default 0 check (engine_km >= 0),
  ev_km numeric(12, 1) not null default 0 check (ev_km >= 0),
  total_km numeric(12, 1) generated always as (engine_km + ev_km) stored,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_maintenance_service_log_transmission_note check (
    item_code <> 'transmission_gear_oil'
    or nullif(btrim(coalesce(note, '')), '') is not null
  )
);

create or replace function public.validate_car_maintenance_log()
returns trigger
language plpgsql
as $$
declare
  target_energy_type public.car_energy_type;
begin
  select energy_type
  into target_energy_type
  from public.car
  where id = new.car_id;

  if target_energy_type is null then
    raise exception '未找到对应车辆。';
  end if;

  perform public.assert_car_metric_pair(
    target_energy_type,
    new.engine_km,
    new.ev_km
  );

  return new;
end;
$$;

create table if not exists public.car_reminder_state (
  reminder_key text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  car_id uuid not null references public.car (id) on delete cascade,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  last_notified_at timestamptz,
  last_notified_channel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.car_reminder_delivery_log (
  id uuid primary key default gen_random_uuid(),
  reminder_key text not null,
  channel text not null,
  sent_at timestamptz not null default now(),
  status text not null,
  response_excerpt text,
  created_at timestamptz not null default now()
);

create index if not exists car_user_id_idx on public.car (user_id);
create unique index if not exists car_user_plate_number_idx
  on public.car (user_id, lower(plate_number))
  where plate_number is not null;
create index if not exists car_last_mileage_recorded_at_idx
  on public.car (user_id, last_mileage_recorded_at desc);

create index if not exists car_mileage_log_car_recorded_at_idx
  on public.car_mileage_log (car_id, recorded_at desc, created_at desc);

create index if not exists car_insurance_policy_car_type_end_idx
  on public.car_insurance_policy (car_id, insurance_type, effective_end_at desc);

create index if not exists car_maintenance_service_log_car_item_performed_idx
  on public.car_maintenance_service_log (car_id, item_code, performed_at desc, created_at desc);

create index if not exists car_maintenance_config_car_item_idx
  on public.car_maintenance_config (car_id, item_code);

create index if not exists car_reminder_state_car_idx
  on public.car_reminder_state (car_id, updated_at desc);

create index if not exists car_reminder_state_user_ack_idx
  on public.car_reminder_state (user_id, acknowledged_at, resolved_at);

create index if not exists car_reminder_delivery_log_key_sent_idx
  on public.car_reminder_delivery_log (reminder_key, sent_at desc);

drop trigger if exists car_set_updated_at on public.car;
create trigger car_set_updated_at
before update on public.car
for each row
execute function public.set_row_updated_at();

drop trigger if exists car_validate_metrics on public.car;
create trigger car_validate_metrics
before insert or update on public.car
for each row
execute function public.validate_car_row();

drop trigger if exists car_mileage_log_set_updated_at on public.car_mileage_log;
create trigger car_mileage_log_set_updated_at
before update on public.car_mileage_log
for each row
execute function public.set_row_updated_at();

drop trigger if exists car_mileage_log_validate on public.car_mileage_log;
create trigger car_mileage_log_validate
before insert or update on public.car_mileage_log
for each row
execute function public.validate_car_metric_log();

drop trigger if exists car_mileage_log_sync_car on public.car_mileage_log;
create trigger car_mileage_log_sync_car
after insert or update or delete on public.car_mileage_log
for each row
execute function public.handle_car_mileage_log_change();

drop trigger if exists car_insurance_policy_set_updated_at on public.car_insurance_policy;
create trigger car_insurance_policy_set_updated_at
before update on public.car_insurance_policy
for each row
execute function public.set_row_updated_at();

drop trigger if exists maintenance_item_catalog_set_updated_at on public.maintenance_item_catalog;
create trigger maintenance_item_catalog_set_updated_at
before update on public.maintenance_item_catalog
for each row
execute function public.set_row_updated_at();

drop trigger if exists car_maintenance_config_set_updated_at on public.car_maintenance_config;
create trigger car_maintenance_config_set_updated_at
before update on public.car_maintenance_config
for each row
execute function public.set_row_updated_at();

drop trigger if exists car_maintenance_service_log_set_updated_at on public.car_maintenance_service_log;
create trigger car_maintenance_service_log_set_updated_at
before update on public.car_maintenance_service_log
for each row
execute function public.set_row_updated_at();

drop trigger if exists car_maintenance_service_log_validate on public.car_maintenance_service_log;
create trigger car_maintenance_service_log_validate
before insert or update on public.car_maintenance_service_log
for each row
execute function public.validate_car_maintenance_log();

drop trigger if exists car_reminder_state_set_updated_at on public.car_reminder_state;
create trigger car_reminder_state_set_updated_at
before update on public.car_reminder_state
for each row
execute function public.set_row_updated_at();

alter table public.car enable row level security;
alter table public.car_mileage_log enable row level security;
alter table public.car_insurance_policy enable row level security;
alter table public.maintenance_item_catalog enable row level security;
alter table public.car_maintenance_config enable row level security;
alter table public.car_maintenance_service_log enable row level security;
alter table public.car_reminder_state enable row level security;
alter table public.car_reminder_delivery_log enable row level security;

drop policy if exists "car_select_own" on public.car;
create policy "car_select_own"
on public.car
for select
using (auth.uid() = user_id);

drop policy if exists "car_insert_own" on public.car;
create policy "car_insert_own"
on public.car
for insert
with check (auth.uid() = user_id);

drop policy if exists "car_update_own" on public.car;
create policy "car_update_own"
on public.car
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "car_delete_own" on public.car;
create policy "car_delete_own"
on public.car
for delete
using (auth.uid() = user_id);

drop policy if exists "car_mileage_log_select_own" on public.car_mileage_log;
create policy "car_mileage_log_select_own"
on public.car_mileage_log
for select
using (
  exists (
    select 1
    from public.car
    where car.id = car_mileage_log.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_mileage_log_insert_own" on public.car_mileage_log;
create policy "car_mileage_log_insert_own"
on public.car_mileage_log
for insert
with check (
  exists (
    select 1
    from public.car
    where car.id = car_mileage_log.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_mileage_log_update_own" on public.car_mileage_log;
create policy "car_mileage_log_update_own"
on public.car_mileage_log
for update
using (
  exists (
    select 1
    from public.car
    where car.id = car_mileage_log.car_id
      and car.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.car
    where car.id = car_mileage_log.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_mileage_log_delete_own" on public.car_mileage_log;
create policy "car_mileage_log_delete_own"
on public.car_mileage_log
for delete
using (
  exists (
    select 1
    from public.car
    where car.id = car_mileage_log.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_insurance_policy_select_own" on public.car_insurance_policy;
create policy "car_insurance_policy_select_own"
on public.car_insurance_policy
for select
using (
  exists (
    select 1
    from public.car
    where car.id = car_insurance_policy.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_insurance_policy_insert_own" on public.car_insurance_policy;
create policy "car_insurance_policy_insert_own"
on public.car_insurance_policy
for insert
with check (
  exists (
    select 1
    from public.car
    where car.id = car_insurance_policy.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_insurance_policy_update_own" on public.car_insurance_policy;
create policy "car_insurance_policy_update_own"
on public.car_insurance_policy
for update
using (
  exists (
    select 1
    from public.car
    where car.id = car_insurance_policy.car_id
      and car.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.car
    where car.id = car_insurance_policy.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_insurance_policy_delete_own" on public.car_insurance_policy;
create policy "car_insurance_policy_delete_own"
on public.car_insurance_policy
for delete
using (
  exists (
    select 1
    from public.car
    where car.id = car_insurance_policy.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "maintenance_item_catalog_select_all" on public.maintenance_item_catalog;
create policy "maintenance_item_catalog_select_all"
on public.maintenance_item_catalog
for select
using (true);

drop policy if exists "car_maintenance_config_select_own" on public.car_maintenance_config;
create policy "car_maintenance_config_select_own"
on public.car_maintenance_config
for select
using (
  exists (
    select 1
    from public.car
    where car.id = car_maintenance_config.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_maintenance_config_insert_own" on public.car_maintenance_config;
create policy "car_maintenance_config_insert_own"
on public.car_maintenance_config
for insert
with check (
  exists (
    select 1
    from public.car
    where car.id = car_maintenance_config.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_maintenance_config_update_own" on public.car_maintenance_config;
create policy "car_maintenance_config_update_own"
on public.car_maintenance_config
for update
using (
  exists (
    select 1
    from public.car
    where car.id = car_maintenance_config.car_id
      and car.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.car
    where car.id = car_maintenance_config.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_maintenance_config_delete_own" on public.car_maintenance_config;
create policy "car_maintenance_config_delete_own"
on public.car_maintenance_config
for delete
using (
  exists (
    select 1
    from public.car
    where car.id = car_maintenance_config.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_maintenance_service_log_select_own" on public.car_maintenance_service_log;
create policy "car_maintenance_service_log_select_own"
on public.car_maintenance_service_log
for select
using (
  exists (
    select 1
    from public.car
    where car.id = car_maintenance_service_log.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_maintenance_service_log_insert_own" on public.car_maintenance_service_log;
create policy "car_maintenance_service_log_insert_own"
on public.car_maintenance_service_log
for insert
with check (
  exists (
    select 1
    from public.car
    where car.id = car_maintenance_service_log.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_maintenance_service_log_update_own" on public.car_maintenance_service_log;
create policy "car_maintenance_service_log_update_own"
on public.car_maintenance_service_log
for update
using (
  exists (
    select 1
    from public.car
    where car.id = car_maintenance_service_log.car_id
      and car.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.car
    where car.id = car_maintenance_service_log.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_maintenance_service_log_delete_own" on public.car_maintenance_service_log;
create policy "car_maintenance_service_log_delete_own"
on public.car_maintenance_service_log
for delete
using (
  exists (
    select 1
    from public.car
    where car.id = car_maintenance_service_log.car_id
      and car.user_id = auth.uid()
  )
);

drop policy if exists "car_reminder_state_select_own" on public.car_reminder_state;
create policy "car_reminder_state_select_own"
on public.car_reminder_state
for select
using (auth.uid() = user_id);

drop policy if exists "car_reminder_state_insert_own" on public.car_reminder_state;
create policy "car_reminder_state_insert_own"
on public.car_reminder_state
for insert
with check (auth.uid() = user_id);

drop policy if exists "car_reminder_state_update_own" on public.car_reminder_state;
create policy "car_reminder_state_update_own"
on public.car_reminder_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "car_reminder_state_delete_own" on public.car_reminder_state;
create policy "car_reminder_state_delete_own"
on public.car_reminder_state
for delete
using (auth.uid() = user_id);

drop policy if exists "car_reminder_delivery_log_select_own" on public.car_reminder_delivery_log;
create policy "car_reminder_delivery_log_select_own"
on public.car_reminder_delivery_log
for select
using (
  exists (
    select 1
    from public.car_reminder_state
    where car_reminder_state.reminder_key = car_reminder_delivery_log.reminder_key
      and car_reminder_state.user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.car to authenticated;
grant select, insert, update, delete on public.car_mileage_log to authenticated;
grant select, insert, update, delete on public.car_insurance_policy to authenticated;
grant select on public.maintenance_item_catalog to authenticated;
grant select, insert, update, delete on public.car_maintenance_config to authenticated;
grant select, insert, update, delete on public.car_maintenance_service_log to authenticated;
grant select, insert, update, delete on public.car_reminder_state to authenticated;
grant select on public.car_reminder_delivery_log to authenticated;

create or replace view public.car_insurance_reminder_view
with (security_invoker = true) as
with latest_policy as (
  select distinct on (policy.car_id, policy.insurance_type)
    policy.id,
    policy.car_id,
    policy.insurance_type,
    policy.effective_end_at,
    policy.contact_name,
    policy.contact_phone,
    car.user_id,
    car.name as car_name,
    car.plate_number
  from public.car_insurance_policy as policy
  inner join public.car
    on car.id = policy.car_id
  order by policy.car_id, policy.insurance_type, policy.effective_end_at desc, policy.created_at desc, policy.id desc
)
select
  user_id,
  car_id,
  car_name,
  plate_number,
  id::text as source_id,
  insurance_type,
  format(
    '%s即将到期',
    case insurance_type
      when 'compulsory' then '交强险'
      else '商业险'
    end
  ) as title,
  effective_end_at as due_at,
  null::numeric(12, 1) as due_km,
  case
    when effective_end_at < now() then 'expired'
    else 'due_30d'
  end as severity,
  format(
    'insurance:%s:%s',
    id,
    to_char(effective_end_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ) as reminder_key,
  jsonb_build_object(
    'carName', car_name,
    'plateNumber', plate_number,
    'insuranceType', insurance_type,
    'dueAt', effective_end_at,
    'contactName', contact_name,
    'contactPhone', contact_phone,
    'daysRemaining', (effective_end_at::date - current_date)
  ) as channel_payload
from latest_policy
where effective_end_at <= now() + interval '30 days';

create or replace view public.car_maintenance_reminder_view
with (security_invoker = true) as
with applicable_items as (
  select
    car.user_id,
    car.id as car_id,
    car.name as car_name,
    car.plate_number,
    car.energy_type,
    car.buy_at,
    car.created_at as car_created_at,
    car.current_engine_km,
    car.current_ev_km,
    car.current_total_km,
    catalog.code as item_code,
    catalog.category,
    catalog.label,
    coalesce(config.interval_km_override, catalog.default_interval_km) as interval_km,
    coalesce(config.interval_days_override, catalog.default_interval_days) as interval_days,
    coalesce(
      config.enabled_override,
      case
        when car.energy_type = 'fuel' then catalog.enabled_for_fuel
        when car.energy_type = 'electric' then catalog.enabled_for_electric
        else catalog.enabled_for_hybrid
      end
    ) as enabled
  from public.car
  cross join public.maintenance_item_catalog as catalog
  left join public.car_maintenance_config as config
    on config.car_id = car.id
   and config.item_code = catalog.code
),
latest_service as (
  select distinct on (log.car_id, log.item_code)
    log.id,
    log.car_id,
    log.item_code,
    log.performed_at,
    log.engine_km,
    log.ev_km,
    log.total_km
  from public.car_maintenance_service_log as log
  order by log.car_id, log.item_code, log.performed_at desc, log.created_at desc, log.id desc
),
prepared as (
  select
    item.user_id,
    item.car_id,
    item.car_name,
    item.plate_number,
    item.energy_type,
    item.item_code,
    item.category,
    item.label,
    item.interval_km,
    item.interval_days,
    coalesce(service.performed_at, item.buy_at::timestamptz, item.car_created_at) as baseline_performed_at,
    case
      when service.id is not null then
        case
          when item.energy_type = 'fuel' then service.engine_km
          when item.energy_type = 'electric' then service.ev_km
          when item.category = 'basic' then service.total_km
          else service.engine_km
        end
      else 0::numeric
    end as baseline_km,
    case
      when item.energy_type = 'fuel' then item.current_engine_km
      when item.energy_type = 'electric' then item.current_ev_km
      when item.category = 'basic' then item.current_total_km
      else item.current_engine_km
    end as current_km
  from applicable_items as item
  left join latest_service as service
    on service.car_id = item.car_id
   and service.item_code = item.item_code
  where item.enabled = true
),
windowed as (
  select
    prepared.*,
    (baseline_performed_at + make_interval(days => interval_days)) as due_at,
    (baseline_km + interval_km) as due_km,
    (baseline_km + interval_km - current_km) as remaining_km
  from prepared
)
select
  user_id,
  car_id,
  car_name,
  plate_number,
  item_code::text as source_id,
  item_code,
  category,
  label as title,
  due_at,
  due_km,
  case
    when due_at < now() or remaining_km < 0 then 'expired'
    when due_at <= now() + interval '30 days' and remaining_km <= 100 then 'due_30d_and_100km'
    when due_at <= now() + interval '30 days' then 'due_30d'
    else 'due_100km'
  end as severity,
  format(
    'maintenance:%s:%s:%s:%s',
    car_id,
    item_code,
    to_char(baseline_performed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    baseline_km::text
  ) as reminder_key,
  jsonb_build_object(
    'carName', car_name,
    'plateNumber', plate_number,
    'itemCode', item_code,
    'category', category,
    'label', label,
    'dueAt', due_at,
    'dueKm', due_km,
    'currentKm', current_km,
    'remainingKm', remaining_km,
    'daysRemaining', (due_at::date - current_date)
  ) as channel_payload
from windowed
where
  (due_at <= now() + interval '30 days')
  or (remaining_km <= 100);

create or replace view public.car_reminder_view
with (security_invoker = true) as
select
  user_id,
  car_id,
  car_name,
  plate_number,
  reminder_key,
  'insurance'::text as reminder_type,
  source_id,
  title,
  due_at,
  due_km,
  severity,
  channel_payload
from public.car_insurance_reminder_view
union all
select
  user_id,
  car_id,
  car_name,
  plate_number,
  reminder_key,
  'maintenance'::text as reminder_type,
  source_id,
  title,
  due_at,
  due_km,
  severity,
  channel_payload
from public.car_maintenance_reminder_view;

grant select on public.car_insurance_reminder_view to authenticated;
grant select on public.car_maintenance_reminder_view to authenticated;
grant select on public.car_reminder_view to authenticated;
