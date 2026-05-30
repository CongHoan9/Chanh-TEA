# ChanhTea Infrastructure Blueprint

Tài liệu này mô tả hạ tầng đề xuất cho ChanhTea khi phát triển thành hệ thống nhiều cửa hàng trên nhiều tỉnh thành. Mục tiêu là để người mới đọc nhanh vẫn hiểu được stack, vai trò từng thành phần, và hướng triển khai.

## Mục Tiêu Kiến Trúc

- Khách có thể đặt hàng không cần đăng nhập.
- Hệ thống tự xác định cửa hàng gần khách nhất để nhận đơn.
- Mỗi cửa hàng có dashboard riêng và chỉ thấy dữ liệu của mình.
- Admin/hội đồng quản trị xem và điều phối toàn hệ thống.
- Dữ liệu phân quyền phải được bảo vệ ở backend/database, không chỉ ẩn UI.
- Có thể mở rộng từ một quán lên nhiều tỉnh thành mà không phải viết lại lõi.

## Stack Đề Xuất

| Lớp | Công nghệ | Lý do chọn |
| --- | --- | --- |
| Frontend khách | Next.js + TypeScript | SEO tốt, dễ deploy, phổ biến, dễ mở rộng từ site hiện tại |
| Dashboard quản trị | Next.js + shadcn/ui + Tailwind | Dễ xây dashboard, component rõ ràng, tốc độ phát triển nhanh |
| Backend API | Next.js API routes trước, NestJS sau nếu lớn | MVP nhanh, sau này tách service khi nghiệp vụ phức tạp |
| Database | Supabase Postgres | Postgres phổ biến, có Auth, RLS, Realtime, Storage |
| Định vị địa lý | PostGIS trên Postgres | Tìm cửa hàng gần nhất bằng query database |
| Auth/RBAC | Supabase Auth + bảng `profiles` + RLS | Phân quyền rõ theo role và store |
| Realtime | Supabase Realtime | Dashboard cửa hàng nhận đơn mới tức thì |
| Bản đồ/chỉ đường | Google Maps Platform hoặc Mapbox | Google mạnh ở địa chỉ Việt Nam, Mapbox linh hoạt và hợp routing |
| Deploy | Vercel + Supabase managed | Phổ biến, ít vận hành server, hợp MVP/SaaS |
| Bảo vệ form | Cloudflare Turnstile | Chống spam đặt hàng không cần đăng nhập |
| DNS/WAF/CDN | Cloudflare | Bảo vệ domain, cache static assets, WAF |

Nguồn tham khảo chính:

- Supabase Extensions/PostGIS: https://supabase.com/docs/guides/database/extensions
- Supabase Row Level Security: https://supabase-supabase.mintlify.app/security/row-level-security
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Vercel Node.js Functions: https://vercel.com/docs/concepts/functions/serverless-functions/runtimes/node-js
- Mapbox Optimization API: https://docs.mapbox.com/api/navigation/optimization/
- Cloudflare Turnstile: https://developers.cloudflare.com/turnstile/get-started/

## Thành Phần Hệ Thống

### 1. Public Storefront

Trang khách hàng:

- Xem menu.
- Chọn sản phẩm.
- Cho phép lấy vị trí hiện tại hoặc nhập địa chỉ thủ công.
- Tính cửa hàng phù hợp.
- Tạo đơn hàng.
- Theo dõi trạng thái đơn bằng mã đơn hoặc số điện thoại.

Khách không bắt buộc đăng nhập. Nếu sau này có tích điểm, có thể thêm đăng nhập tự chọn.

### 2. Store Dashboard

Trang dành cho từng cửa hàng:

- Nhận đơn mới realtime.
- Chấp nhận hoặc từ chối đơn.
- Cập nhật trạng thái: `accepted`, `preparing`, `ready`, `delivering`, `completed`.
- Quản lý tồn kho cơ bản.
- Xem doanh thu trong ngày.
- Xem lịch sử đơn của chính cửa hàng.

Mỗi user cửa hàng chỉ thấy store được gán qua bảng `store_members`.

### 3. Admin Dashboard

Trang quản trị toàn hệ thống:

- Quản lý tỉnh/thành, khu vực, cửa hàng.
- Gán nhân sự vào cửa hàng.
- Xem mọi đơn hàng.
- Điều phối đơn bị quá tải hoặc từ chối.
- Xem doanh thu, hiệu suất, báo cáo.
- Xem audit log.
- Cấu hình menu chung và menu riêng theo cửa hàng.

### 4. Routing Service

Logic chọn cửa hàng nhận đơn:

1. Nhận vị trí khách.
2. Tìm cửa hàng active, đang mở, còn trong vùng phục vụ.
3. Lấy danh sách ứng viên gần nhất bằng PostGIS.
4. Tính ETA bằng Google Maps/Mapbox cho top ứng viên.
5. Chọn cửa hàng tốt nhất theo điểm số.
6. Gán đơn và gửi realtime event cho dashboard cửa hàng.

Ban đầu có thể làm trong API route. Khi lớn, tách thành service riêng.

## Database Modules

### Core Identity

- `profiles`: hồ sơ user đăng nhập.
- `roles`: danh sách role hệ thống nếu muốn chuẩn hóa.
- `store_members`: user thuộc cửa hàng nào, quyền gì.

### Store Network

- `regions`: vùng/tỉnh/thành.
- `stores`: thông tin cửa hàng, tọa độ, trạng thái, giờ mở cửa.
- `store_service_areas`: vùng phục vụ chi tiết nếu cần polygon/radius.

### Commerce

- `products`: sản phẩm chuẩn toàn hệ thống.
- `store_products`: sản phẩm bật/tắt theo cửa hàng.
- `inventory`: tồn kho theo cửa hàng.
- `orders`: đơn hàng.
- `order_items`: sản phẩm trong đơn.
- `order_status_events`: lịch sử trạng thái đơn.

### Delivery

- `couriers`: nhân viên giao hàng.
- `delivery_assignments`: ai giao đơn nào.
- `delivery_tracking`: vị trí/timeline giao hàng nếu cần realtime.

### Governance

- `audit_logs`: ghi nhận thao tác quan trọng.
- `system_settings`: cấu hình chung.
- `store_settings`: cấu hình riêng từng cửa hàng.

## Supabase SQL Files

Schema triển khai thật nằm trong `supabase/migrations` và chạy trực tiếp trên Supabase SQL Editor theo thứ tự:

1. `001_extensions_enums.sql`
2. `002_schema.sql`
3. `003_functions_rls.sql`
4. `004_seed_demo_data.sql`

Quy ước ảnh:

- Ảnh sản phẩm, ảnh chi nhánh và avatar lưu ở Cloudinary.
- Supabase chỉ lưu URL trong các cột `image_url`, `avatar_url`, `map_url`, `route_url`.
- Không dùng Supabase Storage cho ảnh trong kiến trúc hiện tại.
- `store_products.sold_today` được tăng trong transaction khi đơn chuyển sang `accepted`.
- Reset giới hạn bán theo ngày dùng `reset_daily_store_product_sales()`. Nếu Supabase project không có `pg_cron`, chạy function này bằng cron ngoài vào 00:00 Asia/Saigon.

## Bảng Tối Thiểu Cho MVP

```sql
create extension if not exists postgis;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  role text not null check (role in (
    'system_admin',
    'regional_manager',
    'store_owner',
    'store_manager',
    'store_staff',
    'courier',
    'support'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province text not null,
  district text,
  ward text,
  address text not null,
  location geography(Point, 4326) not null,
  service_radius_m integer not null default 3000,
  is_active boolean not null default true,
  open_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stores_location_idx on public.stores using gist (location);

create table public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('store_owner', 'store_manager', 'store_staff', 'courier')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  assigned_store_id uuid references public.stores(id),
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  customer_location geography(Point, 4326),
  status text not null default 'pending' check (status in (
    'pending',
    'assigned',
    'accepted',
    'rejected',
    'preparing',
    'ready',
    'delivering',
    'completed',
    'cancelled'
  )),
  subtotal integer not null default 0,
  delivery_fee integer not null default 0,
  total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid,
  name text not null,
  qty integer not null check (qty > 0),
  unit_price integer not null,
  total integer not null
);

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);
```

## Phân Quyền Dữ Liệu

Nguyên tắc:

- `system_admin`: đọc/sửa toàn bộ.
- `regional_manager`: đọc/sửa dữ liệu thuộc vùng được giao.
- `store_manager/store_staff`: chỉ đọc/sửa đơn thuộc cửa hàng của mình.
- `courier`: chỉ đọc đơn được giao.
- `guest`: không có session, chỉ tạo đơn qua API công khai có kiểm soát.

RLS nên được bật cho tất cả bảng vận hành:

```sql
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
```

Các thao tác public như tạo đơn của khách nên đi qua backend/API dùng service role, không để `anon` insert trực tiếp vào database.

## Định Tuyến Cửa Hàng Gần Nhất

PostGIS query mẫu:

```sql
select
  id,
  name,
  address,
  st_distance(
    location,
    st_makepoint(:lng, :lat)::geography
  ) as distance_m
from public.stores
where is_active = true
  and st_dwithin(
    location,
    st_makepoint(:lng, :lat)::geography,
    service_radius_m
  )
order by distance_m asc
limit 5;
```

Sau đó backend gọi Google Maps/Mapbox để tính thời gian di chuyển thực tế cho top 3-5 cửa hàng.

## Realtime

Dashboard cửa hàng subscribe theo `store_id`:

- Đơn mới được gán cho store.
- Đơn bị admin chuyển lại.
- Đơn được courier cập nhật trạng thái.

Khuyến nghị dùng Supabase Realtime Broadcast hoặc Postgres Changes có filter theo `assigned_store_id`. Với dữ liệu lớn, ưu tiên Broadcast có trigger để kiểm soát payload.

## Deploy

MVP:

```text
Vercel
  - Next.js storefront
  - Next.js admin/store dashboard
  - API routes

Supabase
  - Postgres
  - Auth
  - RLS
  - Realtime
  - Storage nếu cần ảnh sản phẩm

Cloudflare
  - DNS
  - CDN/WAF
  - Turnstile
```

Khi lớn:

```text
Vercel frontend
NestJS backend trên Render/Fly.io/Railway/AWS
Supabase hoặc managed Postgres riêng
Redis queue cho đơn hàng và notification
```

## Biến Môi Trường

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
GOOGLE_MAPS_API_KEY=
MAPBOX_ACCESS_TOKEN=
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

Service role key chỉ dùng ở server, tuyệt đối không đưa ra frontend.

## Nguyên Tắc Bảo Mật

- Không tin dữ liệu từ client.
- Guest order phải validate captcha/Turnstile, phone, address, cart, price.
- Price tính lại ở backend, không lấy total từ client.
- Store staff không được đổi `assigned_store_id`.
- Mọi đổi trạng thái đơn phải ghi `order_status_events`.
- Admin action quan trọng phải ghi `audit_logs`.
- Không dùng frontend-only RBAC cho dữ liệu nhạy cảm.

## Migration Từ Code Hiện Tại

1. Giữ giao diện gốc trong `public` làm reference visual.
2. Tạo Next.js app mới hoặc migrate từng phần.
3. Dựng Supabase schema MVP.
4. Làm storefront đặt hàng không đăng nhập.
5. Làm dashboard cửa hàng.
6. Làm admin dashboard.
7. Tích hợp map/routing.
8. Tắt dần Express/Handlebars cũ khi Next.js đủ chức năng.
