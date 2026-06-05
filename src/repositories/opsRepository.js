const db = require('../config/db');

const activeStatuses = ['assigned', 'accepted', 'preparing', 'ready', 'delivering'];

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function storeSelect() {
  return `
    select
      s.id,
      s.region_id,
      s.code,
      s.name,
      s.phone,
      s.email,
      s.province,
      s.district,
      s.ward,
      s.address,
      st_y(s.location::geometry) as lat,
      st_x(s.location::geometry) as lng,
      s.service_radius_m,
      s.open_hours,
      s.image_url,
      s.map_url,
      s.is_active,
      s.is_accepting_orders,
      s.priority,
      s.max_active_orders,
      s.created_at,
      s.updated_at
    from public.stores s
  `;
}

async function getStoreIdsForProfile(profile) {
  if (profile.role === 'system_admin' || profile.storeIds.includes('*')) {
    const { rows } = await db.query('select id from public.stores order by priority asc, name asc');
    return rows.map(row => row.id);
  }

  if (profile.storeIds.length) return profile.storeIds;

  return [];
}

async function listStores() {
  const { rows } = await db.query(`${storeSelect()} order by s.priority asc, s.name asc`);
  return rows;
}

async function createStore(body, actorProfile) {
  const client = await db.pool.connect();
  try {
    await client.query('begin');

    const { rows: countRows } = await client.query('select count(*) as count from public.stores');
    const storeNumber = parseInt(countRows[0].count) + 1;
    const code = `ST${storeNumber.toString().padStart(3, '0')}`;
    const email = `store_${code}@chanhtea.com`;
    
    const { rows: regionRows } = await client.query('select id, province from public.regions limit 1');
    const region = regionRows[0] || { id: null, province: body.province || 'Hanoi' };

    const storeResult = await client.query(`
      insert into public.stores (
        region_id, code, name, phone, email, province, district, ward, address, location, service_radius_m
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, st_setsrid(st_makepoint($10, $11), 4326)::geography, $12
      ) returning *
    `, [
      region.id, code, body.name, body.phone || '', email, body.province || region.province, 
      body.district || '', body.ward || '', body.address, 
      Number(body.lng || 106.0), Number(body.lat || 10.0), Number(body.service_radius_m || 3000)
    ]);
    const store = storeResult.rows[0];

    const userResult = await client.query(`
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
        $1, crypt($2, gen_salt('bf')), now(), 
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
      ) returning id
    `, [email, code]);
    const userId = userResult.rows[0].id;

    await client.query(`
      insert into public.profiles (id, email, full_name, role)
      values ($1, $2, $3, 'store_manager')
      on conflict (id) do update set role = 'store_manager'
    `, [userId, email, body.name]);

    await client.query(`
      insert into public.store_members (store_id, user_id, role)
      values ($1, $2, 'store_manager')
    `, [store.id, userId]);

    await client.query(`
      insert into public.audit_logs(actor_id, actor_role, action, entity_type, entity_id, store_id, new_data)
      values ($1, $2, 'store.create', 'stores', $3, $4, $5)
    `, [actorProfile.id, actorProfile.role, store.id, store.id, JSON.stringify(store)]);

    await client.query('commit');
    return store;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

async function listProducts() {
  const { rows } = await db.query(`
    select
      p.id,
      p.sku,
      p.slug,
      p.name,
      p.description,
      p.image_url,
      p.image_alt,
      p.base_price,
      p.sort_order,
      p.is_featured,
      p.is_active,
      c.slug as category_slug,
      c.name as category_name
    from public.products p
    left join public.drink_categories c on c.id = p.category_id
    order by p.sort_order asc, p.name asc
  `);
  return rows;
}

async function resolveProductRefs(items) {
  const refs = [...new Set(items.map(item => item.product_id).filter(Boolean))];
  if (!refs.length) return [];

  const uuidRefs = refs.filter(isUuid);
  const textRefs = refs.filter(ref => !isUuid(ref));
  const { rows } = await db.query(
    `
      select id, sku, slug, name, image_url, base_price
      from public.products
      where is_active = true
        and (
          id = any($1::uuid[])
          or sku = any($2::text[])
          or slug = any($2::text[])
        )
    `,
    [uuidRefs, textRefs]
  );

  return rows;
}

async function resolveNearestStore(location, items) {
  if (!location?.lat || !location?.lng) {
    throw new Error('Customer latitude and longitude are required to resolve store.');
  }

  const products = await resolveProductRefs(items);
  const productIds = products.map(product => product.id);
  const { rows } = await db.query(
    'select * from public.resolve_nearest_store($1, $2, $3::uuid[]) limit 1',
    [Number(location.lat), Number(location.lng), productIds]
  );

  if (!rows[0]) return null;

  const store = rows[0];
  return {
    id: store.store_id,
    code: store.store_code,
    name: store.store_name,
    address: store.address,
    distance_m: Math.round(Number(store.distance_m || 0)),
    service_radius_m: store.service_radius_m
  };
}

async function createGuestOrder(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    const error = new Error('Cart is empty.');
    error.status = 400;
    throw error;
  }
  if (!body.customer_name || !body.customer_phone || !body.customer_address) {
    const error = new Error('Customer name, phone and address are required.');
    error.status = 400;
    throw error;
  }
  if (!body.location?.lat || !body.location?.lng) {
    const error = new Error('Customer latitude and longitude are required.');
    error.status = 400;
    throw error;
  }

  const products = await resolveProductRefs(items);
  const productByRef = new Map();
  products.forEach(product => {
    productByRef.set(product.id, product);
    productByRef.set(product.sku, product);
    productByRef.set(product.slug, product);
  });

  const normalizedItems = items.map(item => {
    const product = productByRef.get(item.product_id);
    if (!product) {
      const error = new Error(`Product is unavailable: ${item.product_id}`);
      error.status = 422;
      throw error;
    }
    const qty = Number(item.qty || item.quantity || 1);
    return {
      product,
      qty,
      unit_price: Number(product.base_price),
      total: Number(product.base_price) * qty,
      options: item.options || {}
    };
  });

  const storeId = body.store_id;
  if (!storeId) {
    const error = new Error('store_id is required to create an order.');
    error.status = 400;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('begin');

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
    const deliveryFee = Number(body.delivery_fee || 0);
    const total = subtotal + deliveryFee;
    const code = `CT-${Date.now().toString().slice(-8)}`;

    const orderResult = await client.query(
      `
        insert into public.orders (
          code,
          assigned_store_id,
          customer_name,
          customer_phone,
          customer_address,
          customer_location,
          fulfillment_method,
          status,
          subtotal,
          delivery_fee,
          total,
          note,
          created_by_guest
        )
        values (
          $1, $2, $3, $4, $5,
          st_setsrid(st_makepoint($6, $7), 4326)::geography,
          $8, 'assigned', $9, $10, $11, $12, true
        )
        returning *
      `,
      [
        code,
        storeId,
        body.customer_name,
        body.customer_phone,
        body.customer_address,
        Number(body.location.lng),
        Number(body.location.lat),
        body.fulfillment_method || 'delivery',
        subtotal,
        deliveryFee,
        total,
        body.note || null
      ]
    );

    const order = orderResult.rows[0];
    const orderItems = [];

    for (const item of normalizedItems) {
      const itemResult = await client.query(
        `
          insert into public.order_items (
            order_id,
            product_id,
            product_name,
            image_url,
            qty,
            unit_price,
            total,
            options
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          returning *
        `,
        [
          order.id,
          item.product.id,
          item.product.name,
          item.product.image_url,
          item.qty,
          item.unit_price,
          item.total,
          JSON.stringify(item.options)
        ]
      );
      orderItems.push(itemResult.rows[0]);
    }

    await client.query(
      `
        insert into public.order_status_events(order_id, from_status, to_status, note, metadata)
        values ($1, null, 'assigned', 'Guest order created and assigned to nearest store.', '{}'::jsonb)
      `,
      [order.id]
    );

    await client.query('commit');
    return { ...order, items: orderItems, assigned_store_id: storeId };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function findPublicOrder(code, phone) {
  const { rows } = await db.query(
    `
      select
        o.*,
        jsonb_build_object(
          'id', s.id,
          'code', s.code,
          'name', s.name,
          'address', s.address,
          'phone', s.phone,
          'map_url', s.map_url
        ) as assigned_store
      from public.orders o
      left join public.stores s on s.id = o.assigned_store_id
      where o.code = $1 and o.customer_phone = $2
      limit 1
    `,
    [code, phone]
  );
  return rows[0] || null;
}

async function listOrders(profile) {
  const storeIds = await getStoreIdsForProfile(profile);
  if (!storeIds.length) return [];

  const { rows } = await db.query(
    `
      select
        o.*,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'name', oi.product_name,
              'qty', oi.qty,
              'unit_price', oi.unit_price,
              'total', oi.total,
              'image_url', oi.image_url
            )
          ) filter (where oi.id is not null),
          '[]'::jsonb
        ) as items
      from public.orders o
      left join public.order_items oi on oi.order_id = o.id
      where o.assigned_store_id = any($1::uuid[])
      group by o.id
      order by o.created_at desc
      limit 100
    `,
    [storeIds]
  );
  return rows;
}

async function updateOrderStatus(profile, orderId, status, note) {
  const storeIds = await getStoreIdsForProfile(profile);
  const client = await db.pool.connect();

  try {
    await client.query('begin');

    const currentResult = await client.query(
      'select * from public.orders where id = $1 for update',
      [orderId]
    );
    const currentOrder = currentResult.rows[0];
    if (!currentOrder) {
      await client.query('rollback');
      return null;
    }

    if (!storeIds.includes(currentOrder.assigned_store_id)) {
      const error = new Error('Store scope denied.');
      error.status = 403;
      throw error;
    }

    if (currentOrder.status !== 'accepted' && status === 'accepted') {
      const limitResult = await client.query(
        `
          select p.name
          from public.order_items item
          join public.store_products sp
            on sp.store_id = $2
           and sp.product_id = item.product_id
          join public.products p on p.id = item.product_id
          where item.order_id = $1
            and sp.daily_limit is not null
            and sp.sold_today + item.qty > sp.daily_limit
          limit 1
        `,
        [orderId, currentOrder.assigned_store_id]
      );

      if (limitResult.rows[0]) {
        const error = new Error(`Daily product limit exceeded: ${limitResult.rows[0].name}`);
        error.status = 409;
        throw error;
      }

      await client.query(
        `
          update public.store_products sp
          set sold_today = sp.sold_today + item.qty
          from public.order_items item
          where item.order_id = $1
            and sp.store_id = $2
            and sp.product_id = item.product_id
        `,
        [orderId, currentOrder.assigned_store_id]
      );
    }

    const updatedResult = await client.query(
      `
        update public.orders
        set
          status = $2::public.order_status,
          accepted_at = case when $2::public.order_status = 'accepted' and accepted_at is null then now() else accepted_at end,
          completed_at = case when $2::public.order_status = 'completed' then now() else completed_at end,
          cancelled_at = case when $2::public.order_status = 'cancelled' then now() else cancelled_at end
        where id = $1
        returning *
      `,
      [orderId, status]
    );
    const updatedOrder = updatedResult.rows[0];

    await client.query(
      `
        insert into public.order_status_events(order_id, from_status, to_status, note)
        values ($1, $2::public.order_status, $3::public.order_status, $4)
      `,
      [orderId, currentOrder.status, status, note || null]
    );

    await client.query(
      `
        insert into public.audit_logs(actor_role, action, entity_type, entity_id, store_id, old_data, new_data)
        values ($1::public.app_role, 'order.status.update', 'orders', $2, $3, $4, $5)
      `,
      [
        profile.role,
        orderId,
        currentOrder.assigned_store_id,
        JSON.stringify(currentOrder),
        JSON.stringify(updatedOrder)
      ]
    );

    await client.query('commit');
    return updatedOrder;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function listStoreProducts(profile) {
  const storeIds = await getStoreIdsForProfile(profile);
  if (!storeIds.length) return [];

  const { rows } = await db.query(
    `
      select
        sp.id,
        sp.store_id,
        sp.product_id,
        p.name,
        p.sku,
        p.slug,
        p.image_url,
        coalesce(sp.price_override, p.base_price) as price,
        sp.status,
        sp.status = 'available' as is_available,
        sp.daily_limit,
        sp.sold_today,
        s.name as store_name
      from public.store_products sp
      join public.products p on p.id = sp.product_id
      join public.stores s on s.id = sp.store_id
      where sp.store_id = any($1::uuid[])
      order by s.name asc, p.sort_order asc, p.name asc
    `,
    [storeIds]
  );
  return rows.map(row => ({ ...row, stock_status: row.status }));
}

async function listStoreUsers(profile) {
  const storeIds = await getStoreIdsForProfile(profile);
  if (!storeIds.length) return [];

  const { rows } = await db.query(
    `
      select
        sm.id,
        p.full_name,
        p.email,
        sm.role,
        sm.store_id,
        s.name as store_name,
        sm.is_active
      from public.store_members sm
      join public.profiles p on p.id = sm.user_id
      join public.stores s on s.id = sm.store_id
      where sm.store_id = any($1::uuid[])
      order by s.name asc, p.full_name asc
    `,
    [storeIds]
  );
  return rows;
}

async function getStoreSummary(profile) {
  const storeIds = await getStoreIdsForProfile(profile);
  if (!storeIds.length) {
    return {
      new_orders: 0,
      preparing: 0,
      delivering: 0,
      active_orders: 0,
      completed_orders: 0,
      revenue_today: 0
    };
  }

  const { rows } = await db.query(
    `
      select
        count(*) filter (where status = 'assigned')::int as new_orders,
        count(*) filter (where status = 'preparing')::int as preparing,
        count(*) filter (where status = 'delivering')::int as delivering,
        count(*) filter (where status = any($2::public.order_status[]))::int as active_orders,
        count(*) filter (where status = 'completed')::int as completed_orders,
        coalesce(sum(total) filter (where created_at::date = current_date), 0)::int as revenue_today
      from public.orders
      where assigned_store_id = any($1::uuid[])
    `,
    [storeIds, activeStatuses]
  );
  return rows[0];
}

async function listAuditLogs() {
  const { rows } = await db.query(
    `
      select
        al.id,
        al.actor_role,
        coalesce(p.full_name, al.actor_role::text, 'system') as actor,
        al.action,
        al.entity_type,
        al.entity_id,
        al.store_id,
        al.created_at
      from public.audit_logs al
      left join public.profiles p on p.id = al.actor_id
      order by al.created_at desc
      limit 100
    `
  );
  return rows;
}

async function listRegions() {
  const { rows } = await db.query('select * from public.regions where is_active = true order by name asc');
  return rows;
}

async function getAdminSummary() {
  const { rows: stores } = await db.query('select count(*) as count from public.stores where is_active = true');
  const { rows: totalUsers } = await db.query('select count(*) as count from public.profiles where role = $1', ['store_manager']);
  
  const { rows: orderStats } = await db.query(`
    select 
      count(*) as total_orders,
      sum(total) as revenue_today,
      count(case when status = 'pending' then 1 end) as new_orders
    from public.orders
    where created_at >= current_date
  `);
  
  const { rows: topStores } = await db.query(`
    select 
      s.name,
      count(o.id) as order_count,
      coalesce(sum(o.total), 0) as revenue
    from public.stores s
    left join public.orders o on o.assigned_store_id = s.id and o.status = 'completed'
    group by s.id, s.name
    order by revenue desc
    limit 5
  `);

  const { rows: chartData } = await db.query(`
    select 
      date(created_at) as date,
      coalesce(sum(total), 0) as revenue
    from public.orders
    where created_at >= current_date - interval '6 days'
    group by date(created_at)
    order by date(created_at) asc
  `);

  return {
    active_stores: parseInt(stores[0].count) || 0,
    store_managers: parseInt(totalUsers[0].count) || 0,
    total_orders: parseInt(orderStats[0].total_orders) || 0,
    revenue_today: parseInt(orderStats[0].revenue_today) || 0,
    new_orders: parseInt(orderStats[0].new_orders) || 0,
    top_stores: topStores,
    chart_data: chartData
  };
}

async function getAdminRegionReport() {
  const { rows } = await db.query(`
    select 
      r.id as region_id,
      r.name as region_name,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'address', s.address,
            'revenue', coalesce(o_stats.revenue, 0),
            'order_count', coalesce(o_stats.order_count, 0)
          ) order by coalesce(o_stats.revenue, 0) desc
        ) filter (where s.id is not null),
        '[]'::jsonb
      ) as stores
    from public.regions r
    left join public.stores s on s.region_id = r.id and s.is_active = true
    left join (
      select 
        assigned_store_id,
        sum(total) as revenue,
        count(id) as order_count
      from public.orders
      where created_at >= current_date and status = 'completed'
      group by assigned_store_id
    ) o_stats on o_stats.assigned_store_id = s.id
    group by r.id, r.name
    order by r.name asc
  `);
  return rows;
}

async function updateAdminStore(storeId, body) {
  const { is_active, service_radius_m, lat, lng } = body;
  
  let updateQuery = `
    update public.stores
    set is_active = $1,
        service_radius_m = $2
  `;
  const params = [is_active, service_radius_m, storeId];
  
  if (lat !== undefined && lng !== undefined) {
    updateQuery += `, location = st_setsrid(st_makepoint($4, $5), 4326)::geography`;
    params.push(lng, lat);
  }
  
  updateQuery += `
    where id = $3
    returning ${storeSelect().replace('select', '')}
  `;
  
  const { rows } = await db.query(updateQuery, params);
  return rows[0];
}

async function getBranchRanking() {
  const { rows } = await db.query(`
    SELECT 
        s.id,
        s.name,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as total_revenue,
        COALESCE(AVG(EXTRACT(EPOCH FROM (o.completed_at - o.created_at))), 0) as avg_processing_seconds
    FROM public.stores s
    LEFT JOIN public.orders o ON s.id = o.assigned_store_id AND o.completed_at IS NOT NULL
    GROUP BY s.id, s.name
    ORDER BY total_revenue DESC
  `);
  return rows;
}

async function getProductAnalytics() {
  const { rows: topProducts } = await db.query(`
    SELECT 
        p.id, p.name,
        SUM(oi.qty) as total_sold,
        SUM(oi.total) as total_revenue,
        (SUM(oi.total) - SUM(oi.qty * COALESCE(p.cost_price, 0))) as total_profit
    FROM public.products p
    JOIN public.order_items oi ON p.id = oi.product_id
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.completed_at IS NOT NULL
    GROUP BY p.id, p.name
    ORDER BY total_sold DESC
    LIMIT 10
  `);

  const { rows: upsell } = await db.query(`
    SELECT 
        p1.name as product_a, 
        p2.name as product_b, 
        COUNT(*) as frequency
    FROM public.order_items oi1
    JOIN public.order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.product_id < oi2.product_id
    JOIN public.products p1 ON oi1.product_id = p1.id
    JOIN public.products p2 ON oi2.product_id = p2.id
    JOIN public.orders o ON oi1.order_id = o.id
    WHERE o.completed_at IS NOT NULL
    GROUP BY p1.name, p2.name
    ORDER BY frequency DESC
    LIMIT 10
  `);

  return { topProducts, upsell };
}

module.exports = {
  listProducts,
  listRegions,
  listStores,
  updateAdminStore,
  resolveNearestStore,
  createStore,
  listStoreProducts,
  listStoreUsers,
  listOrders,
  getStoreSummary,
  getAdminSummary,
  getAdminRegionReport,
  listAuditLogs,
  createGuestOrder,
  findPublicOrder,
  updateOrderStatus,
  getBranchRanking,
  getProductAnalytics
};
