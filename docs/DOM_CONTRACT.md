# ChanhTea DOM Contract

Tài liệu này mô tả các vùng DOM đã chuẩn bị để sau này nối API, Supabase Auth/RLS, PostGIS routing và Realtime dashboard.

## Public Storefront

### Menu Store Context

File: `public/Menu.html`

```html
<div class="store-context" data-module="store-resolution">
```

Mục đích:

- Hiển thị cửa hàng đang được chọn/gán theo vị trí khách.
- Nút `data-action="open-location-panel"` dùng để lấy vị trí browser.
- Sau này nối API `POST /api/public/resolve-store`.

DOM hooks:

- `#activeStoreName`
- `#activeStoreMeta`
- `[data-module="store-resolution"]`

### Product Cards

File: `public/Menu.html`

Mỗi sản phẩm có:

```html
data-product-id
data-category
data-price
data-store-scope="nearest"
```

Mục đích:

- Giỏ hàng không phụ thuộc text UI.
- Backend có thể map `product_id` sang bảng `products/store_products`.
- Có thể kiểm tra tồn kho theo cửa hàng gần nhất.

## Guest Checkout

File: `public/Cart.html`

```html
<form id="guestCheckoutForm" data-endpoint="/api/public/orders">
```

Mục đích:

- Tạo đơn hàng cho khách không đăng nhập.
- Thu thập tên, số điện thoại, địa chỉ, vị trí, phương thức nhận.
- Có vùng hiển thị cửa hàng được gán.

DOM hooks:

- `#customerName`
- `#customerPhone`
- `#customerAddress`
- `#customerLat`
- `#customerLng`
- `#detectLocationBtn`
- `#assignedStoreCard`
- `#orderCreatedPanel`
- `#createdOrderCode`

API tương lai:

- `POST /api/public/resolve-store`
- `POST /api/public/orders`

## Order Tracking

File: `public/index.html`

```html
<section id="orderLookup" data-module="order-tracking">
```

Mục đích:

- Khách nhập mã đơn và số điện thoại để xem trạng thái.
- Timeline đã có sẵn các trạng thái chính.

DOM hooks:

- `#orderLookupForm`
- `#lookupOrderCode`
- `#lookupPhone`
- `#lookupStatusTitle`
- `#lookupTimeline`

API tương lai:

- `GET /api/public/orders/:code?phone=...`

## Operations Dashboard

File: `public/Dashboard.html`

```html
<body data-app-shell="operations-dashboard">
```

Các module chính:

- `[data-module="rbac-navigation"]`: navigation theo role.
- `[data-module="store-context"]`: chọn store hiện tại.
- `[data-module="store-order-board"]`: board đơn hàng realtime.
- `[data-module="store-products"]`: tồn kho/menu theo cửa hàng.
- `[data-module="admin-stores"]`: quản lý cửa hàng.
- `[data-module="store-members"]`: quản lý nhân sự.
- `[data-module="audit-log"]`: audit log.

Dashboard panels:

- `[data-dashboard-panel="store-orders"]`
- `[data-dashboard-panel="inventory"]`
- `[data-dashboard-panel="store-report"]`
- `[data-dashboard-panel="admin-stores"]`
- `[data-dashboard-panel="admin-users"]`
- `[data-dashboard-panel="audit-log"]`

RBAC hooks:

```html
data-rbac="store_staff store_manager system_admin"
```

Sau này frontend sẽ đọc role từ Supabase profile và ẩn/hiện panel, nhưng backend/RLS vẫn là lớp bảo vệ chính.

## Local Prototype State

Trong giai đoạn chưa nối backend, `public/index-logic.js` dùng localStorage:

- `orderDetails`: giỏ hàng hiện tại.
- `chanhTeaCustomerLocation`: vị trí/địa chỉ khách.
- `chanhTeaCreatedOrders`: đơn giả lập đã tạo.

Khi nối backend, thay các phần này bằng API nhưng giữ nguyên DOM hooks.

## Current Database Implementation

Các phần đã được triển khai để tiếp tục phát triển theo tài liệu:

- `src/routes/opsApi.js`: API tách theo `/api/public`, `/api/store`, `/api/admin`.
- `src/repositories/opsRepository.js`: lớp dữ liệu đọc/ghi Supabase Postgres theo schema trong `supabase/migrations`.
- `src/middleware/opsAuth.middleware.js`: scope phân quyền demo bằng headers `x-ops-tier`, `x-ops-role`, `x-store-ids`.
- `public/js/dashboard/api.js`: client API riêng cho dashboard.
- `public/js/dashboard/app.js`: hydrate DOM động sau khi render theo RBAC.
- `public/js/storefront/catalog.js`: tải menu sản phẩm từ `/api/public/products`.
- `supabase/multi_store_schema.sql`: schema Supabase/Postgres/PostGIS/RLS để thay lớp mock khi triển khai thật.

Lưu ý bảo mật: DOM động chỉ là lớp hiển thị. Mọi quyền nhạy cảm vẫn phải kiểm tra ở API/database. Middleware vận hành hiện đọc scope từ request headers để nối dashboard trong giai đoạn tích hợp; bước tiếp theo phải thay bằng Supabase Auth JWT thật trước khi public production.
