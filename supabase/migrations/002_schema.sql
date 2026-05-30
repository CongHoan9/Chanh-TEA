-- ================================================================
-- ChanhTea Supabase Migration 002
-- Complete multi-store schema.
-- Images are stored on Cloudinary. Supabase stores only image URLs.
-- ================================================================

-- ----------------
-- Identity / RBAC
-- ----------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  avatar_url text,
  role public.app_role not null default 'store_staff',
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_avatar_url_http check (avatar_url is null or avatar_url ~* '^https?://')
);

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province text not null,
  province_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (province)
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references public.regions(id) on delete set null,
  code text not null unique,
  name text not null,
  phone text,
  email text,
  province text not null,
  district text,
  ward text,
  address text not null,
  location geography(Point, 4326) not null,
  service_radius_m integer not null default 3000 check (service_radius_m > 0),
  open_hours jsonb not null default '{}'::jsonb,
  image_url text,
  map_url text,
  is_active boolean not null default true,
  is_accepting_orders boolean not null default true,
  priority integer not null default 100,
  max_active_orders integer not null default 30 check (max_active_orders >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_image_url_http check (image_url is null or image_url ~* '^https?://'),
  constraint stores_map_url_http check (map_url is null or map_url ~* '^https?://')
);

create index if not exists stores_location_idx on public.stores using gist (location);
create index if not exists stores_region_idx on public.stores(region_id);
create index if not exists stores_active_idx on public.stores(is_active, is_accepting_orders);

create table if not exists public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null check (role in ('store_staff', 'store_manager', 'store_owner', 'courier')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create index if not exists store_members_user_idx on public.store_members(user_id);
create index if not exists store_members_store_idx on public.store_members(store_id);

create table if not exists public.regional_members (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null check (role in ('regional_manager', 'support')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (region_id, user_id, role)
);

-- ----------------
-- Catalog
-- ----------------

create table if not exists public.drink_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.drink_categories(id) on delete set null,
  sku text not null unique,
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  image_alt text,
  base_price integer not null check (base_price >= 0),
  sort_order integer not null default 100,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_image_url_http check (image_url is null or image_url ~* '^https?://')
);

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(is_active, sort_order);

create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  values jsonb not null default '[]'::jsonb,
  is_required boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  name text not null,
  size_label text,
  price_delta integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_idx on public.product_variants(product_id);

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price_override integer check (price_override is null or price_override >= 0),
  status public.store_product_status not null default 'available',
  daily_limit integer check (daily_limit is null or daily_limit >= 0),
  sold_today integer not null default 0 check (sold_today >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, product_id)
);

create index if not exists store_products_store_idx on public.store_products(store_id);
create index if not exists store_products_product_idx on public.store_products(product_id);
create index if not exists store_products_status_idx on public.store_products(status);

-- ----------------
-- Orders / delivery
-- ----------------

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
  payment_status public.payment_status not null default 'unpaid',
  subtotal integer not null default 0 check (subtotal >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  discount_total integer not null default 0 check (discount_total >= 0),
  total integer not null default 0 check (total >= 0),
  note text,
  route_distance_m integer,
  route_duration_s integer,
  created_by_guest boolean not null default true,
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_store_status_idx on public.orders(assigned_store_id, status, created_at desc);
create index if not exists orders_code_idx on public.orders(code);
create index if not exists orders_customer_phone_idx on public.orders(customer_phone);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_name text,
  image_url text,
  qty integer not null check (qty > 0),
  unit_price integer not null check (unit_price >= 0),
  total integer not null check (total >= 0),
  options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint order_items_image_url_http check (image_url is null or image_url ~* '^https?://')
);

create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  from_status public.order_status,
  to_status public.order_status not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_status_events_order_idx on public.order_status_events(order_id, created_at desc);

create table if not exists public.delivery_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  courier_id uuid references public.profiles(id) on delete set null,
  status text not null default 'assigned',
  route_url text,
  assigned_at timestamptz not null default now(),
  picked_up_at timestamptz,
  completed_at timestamptz,
  constraint delivery_route_url_http check (route_url is null or route_url ~* '^https?://')
);

create index if not exists delivery_assignments_order_idx on public.delivery_assignments(order_id);
create index if not exists delivery_assignments_courier_idx on public.delivery_assignments(courier_id);

-- ----------------
-- Governance
-- ----------------

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
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_store_time_idx on public.audit_logs(store_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
