DO $$ 
DECLARE 
    r RECORD;
    v_region_id uuid;
    v_store_id uuid;
    v_user_id uuid;
BEGIN
    -- Tạo bảng tạm lưu dữ liệu 10 chi nhánh
    CREATE TEMP TABLE IF NOT EXISTS tmp_stores (
        commune text,
        province text,
        email text,
        password text
    );
    
    TRUNCATE tmp_stores;
    -- Chèn dữ liệu mẫu 10 chi nhánh (bạn có thể thay đổi tùy ý)
    INSERT INTO tmp_stores (commune, province, email, password) VALUES 
    ('Na Dương', 'Lạng Sơn', 'naduong@chanhtea.com', 'chanhteanaduong'),
    ('Đông Kinh', 'Lạng Sơn', 'dongkinh@chanhtea.com', 'chanhteadongkinh'),
    ('Ba Đình', 'Hà Nội', 'badinh@chanhtea.com', 'chanhteabadinh'),
    ('Hoàn Kiếm', 'Hà Nội', 'hoankiem@chanhtea.com', 'chanhteahoankiem'),
    ('Cát Bà', 'Hải Phòng', 'catba@chanhtea.com', 'chanhteacatba'),
    ('Hải Châu', 'Đà Nẵng', 'haichau@chanhtea.com', 'chanhteahaichau'),
    ('Sơn Trà', 'Đà Nẵng', 'sontra@chanhtea.com', 'chanhteasontra'),
    ('Quận 1', 'Hồ Chí Minh', 'quan1@chanhtea.com', 'chanhteaquan1'),
    ('Ninh Kiều', 'Cần Thơ', 'ninhkieu@chanhtea.com', 'chanhteaninhkieu'),
    ('Dĩ An', 'Bình Dương', 'dian@chanhtea.com', 'chanhteadian');

    FOR r IN SELECT * FROM tmp_stores LOOP
        -- 1. Tìm id khu vực (tỉnh). Nếu chưa có tỉnh này thì tự động tạo mới!
        SELECT id INTO v_region_id FROM public.regions WHERE province = r.province LIMIT 1;
        IF v_region_id IS NULL THEN
            INSERT INTO public.regions (name, province) VALUES (r.province, r.province) RETURNING id INTO v_region_id;
        END IF;

        v_store_id := gen_random_uuid();
        v_user_id := gen_random_uuid();
        
        -- 2. Tạo tài khoản đăng nhập trong auth.users của Supabase
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
            r.email, crypt(r.password, gen_salt('bf')), now(), 
            '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
        );

        -- 3. Tạo thông tin profile cho quản lý chi nhánh
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (v_user_id, r.email, 'Quản lý Chanh-TEA ' || r.commune, 'store_manager');

        -- 4. Tạo thông tin cửa hàng (Mã code sẽ tạo tự động một chuỗi ngẫu nhiên ngắn thay vì dùng ROW_NUMBER)
        INSERT INTO public.stores (
            id, region_id, code, name, phone, email, province, district, ward, address, location, service_radius_m
        ) VALUES (
            v_store_id, 
            v_region_id, 
            'ST-' || substring(v_store_id::text from 1 for 6), 
            'Chanh-TEA ' || r.commune, 
            '090' || floor(random() * 9000000 + 1000000)::text, 
            r.email, 
            r.province, 
            r.commune,
            r.commune, 
            'Trung tâm ' || r.commune || ', ' || r.province, 
            st_setsrid(st_makepoint(106.0 + random()*0.5, 10.0 + random()*0.5), 4326)::geography, 
            5000
        );

        -- 5. Gắn quyền quản lý cửa hàng đó cho tài khoản vừa tạo
        INSERT INTO public.store_members (store_id, user_id, role)
        VALUES (v_store_id, v_user_id, 'store_manager');

    END LOOP;
    
    DROP TABLE tmp_stores;
END $$;
