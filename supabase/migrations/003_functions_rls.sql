-- ================================================================
-- ChanhTea Supabase Migration 003
-- Helpers, RPCs, RLS policies and grants.
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

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles',
    'regions',
    'stores',
    'store_members',
    'drink_categories',
    'products',
    'product_variants',
    'store_products',
    'orders'
  ]
  loop
    execute format('drop trigger if exists trg_%I_touch on public.%I', target_table, target_table);
    execute format(
      'create trigger trg_%I_touch before update on public.%I for each row execute function public.touch_updated_at()',
      target_table,
      target_table
    );
  end loop;
end $$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
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
  select
    public.is_command_role()
    or public.is_store_member(target_store_id)
    or exists (
      select 1
      from public.stores s
      join public.regional_members rm on rm.region_id = s.region_id
      where s.id = target_store_id
        and rm.user_id = auth.uid()
        and rm.is_active = true
    );
$$;

create or replace function public.resolve_nearest_store(
  customer_lat double precision,
  customer_lng double precision,
  requested_product_ids uuid[] default '{}'
)
returns table (
  store_id uuid,
  store_code text,
  store_name text,
  address text,
  distance_m double precision,
  service_radius_m integer
)
language sql
stable
set search_path = public
as $$
  with customer_point as (
    select st_setsrid(st_makepoint(customer_lng, customer_lat), 4326)::geography as point
  ),
  product_count as (
    select coalesce(array_length(requested_product_ids, 1), 0) as count
  ),
  active_stores as (
    select *
    from public.stores
    where is_active = true
      and is_accepting_orders = true
  )
  select
    s.id,
    s.code,
    s.name,
    s.address,
    st_distance(s.location, cp.point) as distance_m,
    s.service_radius_m
  from active_stores s
  cross join customer_point cp
  cross join product_count pc
  where st_dwithin(s.location, cp.point, s.service_radius_m)
    and (
      pc.count = 0
      or not exists (
        select 1
        from unnest(requested_product_ids) requested_product_id
        left join public.store_products sp
          on sp.store_id = s.id
         and sp.product_id = requested_product_id
         and sp.status = 'available'
        where sp.id is null
      )
    )
  order by
    st_distance(s.location, cp.point) asc,
    s.priority asc
  limit 5;
$$;

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

  if current_order.status = 'completed' and next_status <> 'completed' then
    raise exception 'Completed orders cannot be reopened by this RPC';
  end if;

  if actor_role in ('store_staff', 'store_manager', 'store_owner') and next_status not in ('accepted', 'rejected', 'preparing', 'ready', 'delivering', 'completed', 'cancelled') then
    raise exception 'Invalid store transition';
  end if;

  if actor_role = 'courier' and next_status not in ('delivering', 'failed_delivery', 'completed') then
    raise exception 'Invalid courier transition';
  end if;

  if current_order.status <> 'accepted' and next_status = 'accepted' then
    if exists (
      select 1
      from public.order_items item
      join public.store_products sp
        on sp.store_id = current_order.assigned_store_id
       and sp.product_id = item.product_id
      where item.order_id = target_order_id
        and sp.daily_limit is not null
        and sp.sold_today + item.qty > sp.daily_limit
    ) then
      raise exception 'Daily product limit exceeded for this store';
    end if;
  end if;

  update public.orders
  set
    status = next_status,
    accepted_at = case when next_status = 'accepted' and accepted_at is null then now() else accepted_at end,
    completed_at = case when next_status = 'completed' then now() else completed_at end,
    cancelled_at = case when next_status = 'cancelled' then now() else cancelled_at end
  where id = target_order_id
  returning * into updated_order;

  if current_order.status <> 'accepted' and next_status = 'accepted' then
    update public.store_products sp
    set sold_today = sp.sold_today + item.qty
    from public.order_items item
    where item.order_id = target_order_id
      and sp.store_id = current_order.assigned_store_id
      and sp.product_id = item.product_id;
  end if;

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

create or replace function public.reset_daily_store_product_sales()
returns void
language sql
security definer
set search_path = public
as $$
  update public.store_products
  set sold_today = 0,
      updated_at = now();
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('chanhtea-reset-store-products-sold-today');
    perform cron.schedule(
      'chanhtea-reset-store-products-sold-today',
      '0 17 * * *',
      'select public.reset_daily_store_product_sales();'
    );
  end if;
exception
  when undefined_function then
    raise notice 'pg_cron schedule functions are unavailable. Configure an external daily reset job.';
  when others then
    raise notice 'Could not configure pg_cron daily reset: %', sqlerrm;
end $$;

alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.regional_members enable row level security;
alter table public.drink_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_options enable row level security;
alter table public.product_variants enable row level security;
alter table public.store_products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
alter table public.delivery_assignments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

-- Public storefront can read active catalog and active stores only.
drop policy if exists categories_public_read on public.drink_categories;
create policy categories_public_read on public.drink_categories
for select to anon, authenticated
using (is_active = true);

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
for select to anon, authenticated
using (is_active = true);

drop policy if exists product_options_public_read on public.product_options;
create policy product_options_public_read on public.product_options
for select to anon, authenticated
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.is_active = true
  )
);

drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_public_read on public.product_variants
for select to anon, authenticated
using (
  is_active = true
  and exists (
    select 1 from public.products p
    where p.id = product_id and p.is_active = true
  )
);

drop policy if exists stores_public_read on public.stores;
create policy stores_public_read on public.stores
for select to anon, authenticated
using (is_active = true);

drop policy if exists store_products_public_read on public.store_products;
create policy store_products_public_read on public.store_products
for select to anon, authenticated
using (status = 'available' or public.can_access_store(store_id));

-- Authenticated user scope.
drop policy if exists profiles_select_scope on public.profiles;
create policy profiles_select_scope on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_command_role());

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_system_admin())
with check (id = auth.uid() or public.is_system_admin());

drop policy if exists regions_command_read on public.regions;
create policy regions_command_read on public.regions
for select to authenticated
using (is_active = true or public.is_command_role());

drop policy if exists store_members_select_scope on public.store_members;
create policy store_members_select_scope on public.store_members
for select to authenticated
using (public.is_command_role() or public.is_store_member(store_id));

drop policy if exists regional_members_select_scope on public.regional_members;
create policy regional_members_select_scope on public.regional_members
for select to authenticated
using (public.is_command_role() or user_id = auth.uid());

drop policy if exists orders_select_scope on public.orders;
create policy orders_select_scope on public.orders
for select to authenticated
using (
  public.is_command_role()
  or public.can_access_store(assigned_store_id)
);

drop policy if exists orders_update_scope on public.orders;
create policy orders_update_scope on public.orders
for update to authenticated
using (
  public.is_command_role()
  or public.can_access_store(assigned_store_id)
)
with check (
  public.is_command_role()
  or public.can_access_store(assigned_store_id)
);

drop policy if exists order_items_select_scope on public.order_items;
create policy order_items_select_scope on public.order_items
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (public.is_command_role() or public.can_access_store(o.assigned_store_id))
  )
);

drop policy if exists order_events_select_scope on public.order_status_events;
create policy order_events_select_scope on public.order_status_events
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and (public.is_command_role() or public.can_access_store(o.assigned_store_id))
  )
);

drop policy if exists delivery_select_scope on public.delivery_assignments;
create policy delivery_select_scope on public.delivery_assignments
for select to authenticated
using (
  public.is_command_role()
  or public.can_access_store(store_id)
  or courier_id = auth.uid()
);

drop policy if exists audit_select_command_only on public.audit_logs;
create policy audit_select_command_only on public.audit_logs
for select to authenticated
using (public.is_command_role());

drop policy if exists settings_select_admin_only on public.system_settings;
create policy settings_select_admin_only on public.system_settings
for select to authenticated
using (public.is_system_admin());

-- Writes for sensitive tables are intentionally limited to service_role or RPCs.
revoke all on public.profiles from anon;
revoke all on public.store_members from anon;
revoke all on public.regional_members from anon;
revoke all on public.orders from anon;
revoke all on public.order_items from anon;
revoke all on public.order_status_events from anon;
revoke all on public.delivery_assignments from anon;
revoke all on public.audit_logs from anon;
revoke all on public.system_settings from anon;

grant select on
  public.drink_categories,
  public.products,
  public.product_options,
  public.product_variants,
  public.stores,
  public.store_products
to anon;

grant select on all tables in schema public to authenticated;
grant update on public.profiles, public.orders to authenticated;
grant execute on function public.resolve_nearest_store(double precision, double precision, uuid[]) to anon, authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;

-- Guest order creation should go through trusted backend / Supabase Edge Function
-- using service_role. Never expose SUPABASE_SERVICE_ROLE_KEY in frontend code.
