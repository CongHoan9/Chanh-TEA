const db = require('../config/db');

const activeStatuses = ['assigned', 'accepted', 'preparing', 'ready', 'delivering'];

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function storeSelect() {
  return `
    select
      s.id,
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

  const store = await resolveNearestStore(body.location || {}, normalizedItems.map(item => ({ product_id: item.product.id })));
  if (!store) {
    const error = new Error('No active store can serve this order.');
    error.status = 422;
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
        store.id,
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
    return { ...order, items: orderItems, assigned_store: store };
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

module.exports = {
  listStores,
  listProducts,
  resolveNearestStore,
  createGuestOrder,
  findPublicOrder,
  listOrders,
  updateOrderStatus,
  listStoreProducts,
  listStoreUsers,
  getStoreSummary,
  listAuditLogs
};
