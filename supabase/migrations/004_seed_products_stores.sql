-- 006_seed_products_stores.sql
-- id admin: d06f346d-0746-4c3f-a237-dabb4356650d
-- Insert admin user into Supabase auth schema
-- 1. Thêm User Admin vào hệ thống Auth (Bỏ cột confirmed_at tự sinh)
DELETE FROM auth.users WHERE email = 'admin@chanhtea.com';
DELETE FROM public.profiles WHERE email = 'admin@chanhtea.com';
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
) VALUES (
    'eba838d0-68cf-4612-8c39-6a22412321b0'::uuid, -- ID cố định để khớp với bảng profiles
    '00000000-0000-0000-0000-000000000000'::uuid, -- instance_id mặc định của Supabase
    'authenticated',
    'authenticated', -- Quyền truy cập cơ bản của Auth bên ngoài
    'admin@chanhtea.com',
    crypt('123456789', gen_salt('bf')), -- Mật khẩu là: adminpassword
    now(),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "System Admin"}'::jsonb,
    false
)
RETURNING id; 

DO $$
DECLARE
    store_record RECORD;
BEGIN
    FOR store_record IN SELECT id, email FROM public.stores
    FOR store_record IN SELECT id, email, code FROM public.stores
    LOOP
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = store_record.email) THEN
            INSERT INTO auth.users (
                id, instance_id, aud, role, email, encrypted_password, 
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
                created_at, updated_at
            )
            VALUES (
                gen_random_uuid(), -- Or store_record.id if we want them to match exactly, but let's just generate one
                'eba838d0-68cf-4612-8c39-6a22412321b0', 'authenticated', 'authenticated', 
                store_record.email, 
                '$2a$10$wN9P34EOWlJ9A1LIn8HkOOGPSTG6UvXj6s03JpQnJ7Q318YVd5KDW', 
                crypt(store_record.code, gen_salt('bf')), 
                now(), 
                '{"provider":"email","providers":["email"]}'::jsonb, 
                '{}'::jsonb, 
                now(), now()
            );
        END IF;
    END LOOP;
END
$$;


-- Câu lệnh này sẽ trả về cái ID vừa tạo để bạn dùng ở bước sau
-- Seed initial data: admin profile, regions, stores, drink categories, products
-- Admin user (full ID 00)
INSERT INTO public.profiles (id, email, full_name, role, is_active)
VALUES (
    'eba838d0-68cf-4612-8c39-6a22412321b0',
    'admin@chanhtea.com',
    'System Admin',
    'system_admin',
    true
);

DO $$
DECLARE
    store_record RECORD;
BEGIN
    FOR store_record IN SELECT id, email FROM public.stores
    FOR store_record IN SELECT id, email, code FROM public.stores
    LOOP
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = store_record.email) THEN
            INSERT INTO auth.users (
                id, instance_id, aud, role, email, encrypted_password, 
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
                created_at, updated_at
            )
            VALUES (
                gen_random_uuid(), -- Or store_record.id if we want them to match exactly, but let's just generate one
                '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
                store_record.email, 
                '$2a$10$wN9P34EOWlJ9A1LIn8HkOOGPSTG6UvXj6s03JpQnJ7Q318YVd5KDW', 
                crypt(store_record.code, gen_salt('bf')), 
                now(), 
                '{"provider":"email","providers":["email"]}'::jsonb, 
                '{}'::jsonb, 
                now(), now()
            );
        END IF;
    END LOOP;
END
$$;

-- Regions (10 entries)
INSERT INTO public.regions (name, province, province_code)
VALUES
    ('Miền Bắc 1', 'Hanoi', 'HN'),
    ('Miền Bắc 2', 'Hai Phong', 'HP'),
    ('Miền Bắc 3', 'Nam Định', 'ND'),
    ('Miền Trung 1', 'Da Nang', 'DN'),
    ('Miền Trung 2', 'Hue', 'HU'),
    ('Miền Trung 3', 'Quang Nam', 'QN'),
    ('Miền Nam 1', 'Ho Chi Minh City', 'HCM'),
    ('Miền Nam 2', 'Can Tho', 'CT'),
    ('Miền Nam 3', 'Viet Tri', 'VT'),
    ('Miền Tây', 'Binh Duong', 'BD');
-- Stores (10 entries) – each linked to a region by name lookup
INSERT INTO public.stores (region_id, code, name, phone, email, province, district, ward, address, location, service_radius_m)
SELECT r.id,
       CONCAT('ST', LPAD((ROW_NUMBER() OVER (ORDER BY r.id))::text, 3, '0')),
       CONCAT('Cửa hàng ', r.name),
       '0123456789',
       CONCAT('store_', r.name, '@chanhtea.com'),
       r.province,
       'District A',
       'Ward X',
       CONCAT('123 Đường Chính, ', r.province),
       ST_SetSRID(ST_MakePoint(106.0 + random()*0.1, 10.0 + random()*0.1), 4326),
       5000
FROM public.regions r
ORDER BY r.id
LIMIT 10;
-- Drink categories (2 example categories)
INSERT INTO public.drink_categories (slug, name, description)
VALUES
    ('tra-chanh', 'Trà Chanh', 'Trà chanh tươi ngon'),
    ('tra-sua', 'Trà Sữa', 'Trà sữa phong phú');
-- Products (10 entries) – using existing categories
INSERT INTO public.products (category_id, sku, slug, name, description, base_price, is_active)
SELECT c.id,
       CONCAT('SKU', LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::text, 3, '0')),
       CONCAT('product-', LPAD((ROW_NUMBER() OVER (ORDER BY c.id))::text, 3, '0')),
       CONCAT('Sản phẩm ', ROW_NUMBER() OVER (ORDER BY c.id)),
       'Mô tả sản phẩm mẫu',
       (10000 + (random()*90000)::int),
       true
FROM public.drink_categories c
ORDER BY c.id
LIMIT 10;
-- Store‑product linking (assign each product to a random store)
INSERT INTO public.store_products (store_id, product_id, price_override, status)
SELECT s.id,
       p.id,
       NULL,
       'available'
FROM public.stores s
CROSS JOIN LATERAL (
    SELECT id FROM public.products ORDER BY random() LIMIT 1
) p;