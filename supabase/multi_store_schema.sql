-- ================================================================
-- ChanhTea Multi-Store Schema
-- 3 tiers:
--   1. Guest storefront: no required login, creates orders through server API.
--   2. Store operations: store staff/manager can only see assigned stores.
--   3. Command center: regional/system admins can observe and govern operations.
-- ================================================================

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ================================================================
-- ENUMS
-- ================================================================

do $$
begin
  create type public.app_role as enum (
    'store_staff',
    'store_manager',
    'courier',
    'regional_manager',
    'system_admin',
    'support'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_status as enum (
    'pending',
    'assigned',
    'accepted',
    'rejected',
    'preparing',
    'ready',
    'delivering',
    'failed_delivery',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.fulfillment_method as enum ('delivery', 'pickup');
exception when duplicate_object then null;
end $$;

-- ================================================================
-- IDENTITY AND AUTHORIZATION
-- ================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  role public.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references public.regions(id) on delete set null,
  name text not null,
  province text not null,
  district text,
  ward text,
  address text not null,
  location geography(Point, 4326) not null,
  service_radius_m integer not null default 3000 check (service_radius_m > 0),
  open_hours jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  is_accepting_orders boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stores_location_idx on public.stores using gist (location);
create index if not exists stores_region_idx on public.stores(region_id);
create index if not exists stores_active_idx on public.stores(is_active, is_accepting_orders);

create table if not exists public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null check (role in ('store_staff', 'store_manager', 'courier')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create index if not exists store_members_user_idx on public.store_members(user_id);

-- ================================================================
-- COMMERCE
-- ================================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  category text,
  image_url text,
  base_price integer not null check (base_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_products (
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price_override integer check (price_override is null or price_override >= 0),
  is_available boolean not null default true,
  daily_limit integer check (daily_limit is null or daily_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  assigned_store_id uuid references public.stores(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  customer_location geography(Point, 4326),
  fulfillment_method public.fulfillment_method not null default 'delivery',
  status public.order_status not null default 'pending',
  subtotal integer not null default 0 check (subtotal >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total integer not null default 0 check (total >= 0),
  note text,
  created_by_guest boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_store_status_idx on public.orders(assigned_store_id, status, created_at desc);
create index if not exists orders_code_idx on public.orders(code);
create index if not exists orders_customer_phone_idx on public.orders(customer_phone);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  qty integer not null check (qty > 0),
  unit_price integer not null check (unit_price >= 0),
  total integer not null check (total >= 0),
  options jsonb not null default '{}'::jsonb
);

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  from_status public.order_status,
  to_status public.order_status not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists order_status_events_order_idx on public.order_status_events(order_id, created_at desc);

-- ================================================================
-- DELIVERY AND GOVERNANCE
-- ================================================================

create table if not exists public.delivery_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  courier_id uuid references public.profiles(id) on delete set null,
  store_id uuid references public.stores(id) on delete set null,
  status text not null default 'assigned',
  assigned_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.app_role,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  store_id uuid references public.stores(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_store_time_idx on public.audit_logs(store_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

-- ================================================================
-- HELPERS
-- ================================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_stores_touch on public.stores;
create trigger trg_stores_touch before update on public.stores
for each row execute function public.touch_updated_at();

drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch before update on public.products
for each row execute function public.touch_updated_at();

drop trigger if exists trg_store_products_touch on public.store_products;
create trigger trg_store_products_touch before update on public.store_products
for each row execute function public.touch_updated_at();

drop trigger if exists trg_orders_touch on public.orders;
create trigger trg_orders_touch before update on public.orders
for each row execute function public.touch_updated_at();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and is_active = true
  limit 1;
$$;

create or replace function public.is_command_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('system_admin', 'regional_manager', 'support'), false);
$$;

create or replace function public.is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'system_admin', false);
$$;

create or replace function public.is_store_member(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_members sm
    join public.profiles p on p.id = sm.user_id
    where sm.store_id = target_store_id
      and sm.user_id = auth.uid()
      and sm.is_active = true
      and p.is_active = true
  );
$$;

create or replace function public.can_access_store(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_command_role() or public.is_store_member(target_store_id);
$$;

-- ================================================================
-- SECURE ORDER STATUS TRANSITION
-- ================================================================

create or replace function public.update_order_status(
  target_order_id uuid,
  next_status public.order_status,
  status_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders;
  updated_order public.orders;
  actor_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into current_order
  from public.orders
  where id = target_order_id
  for update;

  if current_order.id is null then
    raise exception 'Order not found';
  end if;

  actor_role := public.current_app_role();

  if not public.can_access_store(current_order.assigned_store_id) then
    raise exception 'Permission denied for this store';
  end if;

  if actor_role in ('store_staff', 'store_manager') and next_status not in ('accepted', 'rejected', 'preparing', 'ready', 'delivering', 'completed') then
    raise exception 'Invalid store transition';
  end if;

  if actor_role = 'courier' and next_status not in ('delivering', 'failed_delivery', 'completed') then
    raise exception 'Invalid courier transition';
  end if;

  update public.orders
  set status = next_status
  where id = target_order_id
  returning * into updated_order;

  insert into public.order_status_events(order_id, actor_id, from_status, to_status, note)
  values (target_order_id, auth.uid(), current_order.status, next_status, status_note);

  insert into public.audit_logs(actor_id, actor_role, action, entity_type, entity_id, store_id, old_data, new_data)
  values (
    auth.uid(),
    actor_role,
    'order.status.update',
    'orders',
    target_order_id::text,
    current_order.assigned_store_id,
    to_jsonb(current_order),
    to_jsonb(updated_order)
  );

  return updated_order;
end;
$$;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.products enable row level security;
alter table public.store_products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
alter table public.delivery_assignments enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: users see themselves; command roles see all.
drop policy if exists profiles_select_scope on public.profiles;
create policy profiles_select_scope on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_command_role());

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_system_admin())
with check (id = auth.uid() or public.is_system_admin());

-- Public product/store discovery can be read by anon storefront.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
for select to anon, authenticated
using (is_active = true);

drop policy if exists stores_public_read on public.stores;
create policy stores_public_read on public.stores
for select to anon, authenticated
using (is_active = true);

drop policy if exists store_products_public_read on public.store_products;
create policy store_products_public_read on public.store_products
for select to anon, authenticated
using (
  is_available = true
  or public.can_access_store(store_id)
);

-- Store members are visible to command roles and managers of the same store.
drop policy if exists store_members_select_scope on public.store_members;
create policy store_members_select_scope on public.store_members
for select to authenticated
using (public.is_command_role() or public.is_store_member(store_id));

-- Orders are never directly insertable by anon. Guest order creation must go through server API/service role.
drop policy if exists orders_select_scope on public.orders;
create policy orders_select_scope on public.orders
for select to authenticated
using (
  public.is_command_role()
  or public.is_store_member(assigned_store_id)
);

drop policy if exists orders_update_command_or_store on public.orders;
create policy orders_update_command_or_store on public.orders
for update to authenticated
using (
  public.is_command_role()
  or public.is_store_member(assigned_store_id)
)
with check (
  public.is_command_role()
  or public.is_store_member(assigned_store_id)
);

drop policy if exists order_items_select_scope on public.order_items;
create policy order_items_select_scope on public.order_items
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (public.is_command_role() or public.is_store_member(o.assigned_store_id))
  )
);

drop policy if exists order_events_select_scope on public.order_status_events;
create policy order_events_select_scope on public.order_status_events
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (public.is_command_role() or public.is_store_member(o.assigned_store_id))
  )
);

drop policy if exists delivery_select_scope on public.delivery_assignments;
create policy delivery_select_scope on public.delivery_assignments
for select to authenticated
using (
  public.is_command_role()
  or public.is_store_member(store_id)
  or courier_id = auth.uid()
);

drop policy if exists audit_select_command_only on public.audit_logs;
create policy audit_select_command_only on public.audit_logs
for select to authenticated
using (public.is_command_role());

-- ================================================================
-- GRANTS
-- ================================================================

revoke all on public.profiles from anon;
revoke all on public.store_members from anon;
revoke all on public.orders from anon;
revoke all on public.order_items from anon;
revoke all on public.order_status_events from anon;
revoke all on public.delivery_assignments from anon;
revoke all on public.audit_logs from anon;

grant select on public.products, public.stores, public.store_products to anon;
grant select on public.profiles, public.regions, public.stores, public.store_members, public.products, public.store_products, public.orders, public.order_items, public.order_status_events, public.delivery_assignments, public.audit_logs to authenticated;
grant update on public.profiles, public.orders to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;

-- Server-side order intake should use service role or a trusted backend function.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY to browsers.
