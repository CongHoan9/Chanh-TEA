-- ================================================================
-- ChanhTea Supabase Migration 004
-- Demo seed data for branches, drink categories and products.
-- Safe to re-run. Auth users are not seeded here.
-- ================================================================

insert into public.regions (id, name, province, province_code, is_active)
values
  ('10000000-0000-0000-0000-000000000001', 'TP. Ho Chi Minh', 'TP. Ho Chi Minh', 'HCM', true),
  ('10000000-0000-0000-0000-000000000002', 'Ha Noi', 'Ha Noi', 'HN', true),
  ('10000000-0000-0000-0000-000000000003', 'Da Nang', 'Da Nang', 'DN', true)
on conflict (province) do update set
  name = excluded.name,
  province_code = excluded.province_code,
  is_active = excluded.is_active;

insert into public.stores (
  id, region_id, code, name, phone, province, district, ward, address,
  location, service_radius_m, open_hours, image_url, map_url,
  is_active, is_accepting_orders, priority, max_active_orders
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'HCM-Q1-001',
    'ChanhTea Quan 1',
    '0901000001',
    'TP. Ho Chi Minh',
    'Quan 1',
    'Ben Nghe',
    '12 Nguyen Hue, Quan 1, TP. Ho Chi Minh',
    st_setsrid(st_makepoint(106.7018, 10.7758), 4326)::geography,
    3500,
    '{"mon_fri":{"open":"08:00","close":"22:00"},"sat_sun":{"open":"08:00","close":"23:00"}}'::jsonb,
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778052960/TraChanhCoDien_hybj7p.jpg',
    'https://maps.google.com/?q=10.7758,106.7018',
    true,
    true,
    10,
    35
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'HCM-Q3-001',
    'ChanhTea Quan 3',
    '0901000002',
    'TP. Ho Chi Minh',
    'Quan 3',
    'Vo Thi Sau',
    '45 Vo Van Tan, Quan 3, TP. Ho Chi Minh',
    st_setsrid(st_makepoint(106.6842, 10.7824), 4326)::geography,
    3000,
    '{"mon_fri":{"open":"08:00","close":"22:00"},"sat_sun":{"open":"08:00","close":"23:00"}}'::jsonb,
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778054903/TraChanhBacHa_gtnh3r.jpg',
    'https://maps.google.com/?q=10.7824,106.6842',
    true,
    true,
    20,
    25
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000002',
    'HN-HK-001',
    'ChanhTea Hoan Kiem',
    '0901000003',
    'Ha Noi',
    'Hoan Kiem',
    'Trang Tien',
    '18 Hang Bai, Hoan Kiem, Ha Noi',
    st_setsrid(st_makepoint(105.8523, 21.0245), 4326)::geography,
    4000,
    '{"mon_fri":{"open":"08:00","close":"22:00"},"sat_sun":{"open":"08:00","close":"23:00"}}'::jsonb,
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778054914/TraChanhDao_yvokba.jpg',
    'https://maps.google.com/?q=21.0245,105.8523',
    true,
    true,
    10,
    30
  )
on conflict (code) do update set
  name = excluded.name,
  phone = excluded.phone,
  province = excluded.province,
  district = excluded.district,
  ward = excluded.ward,
  address = excluded.address,
  location = excluded.location,
  service_radius_m = excluded.service_radius_m,
  open_hours = excluded.open_hours,
  image_url = excluded.image_url,
  map_url = excluded.map_url,
  is_active = excluded.is_active,
  is_accepting_orders = excluded.is_accepting_orders,
  priority = excluded.priority,
  max_active_orders = excluded.max_active_orders;

insert into public.drink_categories (id, slug, name, description, sort_order, is_active)
values
  ('30000000-0000-0000-0000-000000000001', 'tra-chanh', 'Tra Chanh', 'Dong tra chanh cot loi.', 10, true),
  ('30000000-0000-0000-0000-000000000002', 'tra-chanh-trai-cay', 'Tra Chanh Trai Cay', 'Tra chanh ket hop trai cay.', 20, true),
  ('30000000-0000-0000-0000-000000000003', 'tra-sua', 'Tra Sua Chanh', 'Do uong sua va tra chanh.', 30, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.products (
  id, category_id, sku, slug, name, description, image_url, image_alt,
  base_price, sort_order, is_featured, is_active
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'TEA-CLASSIC',
    'tra-chanh-co-dien',
    'Tra Chanh Co Dien',
    'Tra chanh dac trung voi huong vi chua ngot can bang.',
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778052960/TraChanhCoDien_hybj7p.jpg',
    'Ly tra chanh co dien',
    25000,
    10,
    true,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'TEA-SALT',
    'tra-chanh-muoi',
    'Tra Chanh Muoi',
    'Chanh tuoi, muoi bien va tra xanh voi vi man nhe.',
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778054128/TraChanhMuoi_rmquk9.jpg',
    'Ly tra chanh muoi',
    28000,
    20,
    true,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    'TEA-HONEY-GINGER',
    'tra-chanh-gung-mat-ong',
    'Tra Chanh Gung Mat Ong',
    'Chanh, gung tuoi va mat ong nguyen chat.',
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778054926/TraMatOng_uuzkiy.jpg',
    'Ly tra chanh gung mat ong',
    32000,
    30,
    false,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000002',
    'TEA-PASSION',
    'tra-chanh-day',
    'Tra Chanh Day',
    'Tra xanh ket hop chanh day nhiet doi.',
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778054914/TraChanhDay_yn4wyz.jpg',
    'Ly tra chanh day',
    30000,
    40,
    true,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000002',
    'TEA-BLUEBERRY',
    'tra-chanh-viet-quat',
    'Tra Chanh Viet Quat',
    'Viet quat hoa quyen voi vi chua cua chanh tuoi.',
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778054926/TraChanhVietQuat_dlysxn.jpg',
    'Ly tra chanh viet quat',
    35000,
    50,
    false,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000001',
    'TEA-MINT',
    'tra-chanh-bac-ha',
    'Tra Chanh Bac Ha',
    'La bac ha tuoi tao nen huong vi sang khoai.',
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778054903/TraChanhBacHa_gtnh3r.jpg',
    'Ly tra chanh bac ha',
    30000,
    60,
    false,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000007',
    '30000000-0000-0000-0000-000000000002',
    'TEA-PEACH',
    'tra-chanh-dao',
    'Tra Chanh Dao',
    'Vi ngot thom cua dao tuoi cung tra chanh mat lanh.',
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778054914/TraChanhDao_yvokba.jpg',
    'Ly tra chanh dao',
    33000,
    70,
    false,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000008',
    '30000000-0000-0000-0000-000000000003',
    'MILK-LEMON-TEA',
    'tra-sua-chanh',
    'Tra Sua Chanh',
    'Kem sua beo nhe tren nen tra chanh chua diu.',
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778054927/TraSuaChanh_aaullu.jpg',
    'Ly tra sua chanh',
    38000,
    80,
    true,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000009',
    '30000000-0000-0000-0000-000000000001',
    'TEA-LEMONGRASS-GINGER',
    'tra-chanh-sa-gung',
    'Tra Chanh Sa Gung',
    'Huong sa thom diu ket hop gung am va chanh tuoi.',
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778054926/TraChanhSaGung_efamgj.jpg',
    'Ly tra chanh sa gung',
    30000,
    90,
    false,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000010',
    '30000000-0000-0000-0000-000000000002',
    'TEA-MELON',
    'tra-chanh-dua-luoi',
    'Tra Chanh Dua Luoi',
    'Dua luoi ngot diu ket hop tra chanh nhe nhaang.',
    'https://res.cloudinary.com/deed7ielg/image/upload/q_auto/f_auto/v1778054915/TraChanhDuaLuoi_rbl8vy.jpg',
    'Ly tra chanh dua luoi',
    34000,
    100,
    false,
    true
  )
on conflict (sku) do update set
  category_id = excluded.category_id,
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  image_alt = excluded.image_alt,
  base_price = excluded.base_price,
  sort_order = excluded.sort_order,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active;

insert into public.product_variants (product_id, sku, name, size_label, price_delta, sort_order, is_active)
select p.id, p.sku || '-M', 'Size M', 'M', 0, 10, true
from public.products p
on conflict (sku) do update set
  name = excluded.name,
  size_label = excluded.size_label,
  price_delta = excluded.price_delta,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.product_variants (product_id, sku, name, size_label, price_delta, sort_order, is_active)
select p.id, p.sku || '-L', 'Size L', 'L', 6000, 20, true
from public.products p
on conflict (sku) do update set
  name = excluded.name,
  size_label = excluded.size_label,
  price_delta = excluded.price_delta,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.product_options (product_id, name, values, is_required, sort_order)
select
  p.id,
  'Topping',
  '[
    {"label":"Thach dua","price_delta":5000},
    {"label":"Hat chia","price_delta":5000},
    {"label":"Nata de coco","price_delta":7000}
  ]'::jsonb,
  false,
  10
from public.products p
where not exists (
  select 1 from public.product_options po
  where po.product_id = p.id and po.name = 'Topping'
);

insert into public.store_products (store_id, product_id, price_override, status, daily_limit)
select s.id, p.id, null, 'available'::public.store_product_status, null
from public.stores s
cross join public.products p
on conflict (store_id, product_id) do update set
  status = excluded.status;
